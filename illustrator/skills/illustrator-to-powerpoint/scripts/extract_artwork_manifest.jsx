/**
 * extract_artwork_manifest.jsx
 * 
 * Extracts structured artwork hierarchy, coordinates, typography runs, shapes,
 * and raster images from Adobe Illustrator for native PowerPoint recreation.
 * 
 * Relative coordinate mapping:
 * xp = (xi - xa)
 * yp = (ya - yi)  [Illustrator top-down normalization]
 */

#target illustrator

(function loadJSON() {
    if (typeof JSON === "undefined" || !JSON.stringify) {
        var vendorFile = new File("/Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/vendor/json2.js");
        if (vendorFile.exists) {
            $.evalFile(vendorFile);
        }
    }
})();

(function() {
    if (app.documents.length === 0) {
        alert("No active Illustrator document found.");
        return;
    }

    var doc = app.activeDocument;
    var result = {
        documentName: doc.name,
        artboards: []
    };

    function getRGB(color) {
        if (!color) return null;
        try {
            if (color.typename === "RGBColor") {
                return [Math.round(color.red), Math.round(color.green), Math.round(color.blue)];
            } else if (color.typename === "CMYKColor") {
                // Approximate CMYK to RGB
                var c = color.cyan / 100, m = color.magenta / 100, y = color.yellow / 100, k = color.black / 100;
                var r = Math.round(255 * (1 - c) * (1 - k));
                var g = Math.round(255 * (1 - m) * (1 - k));
                var b = Math.round(255 * (1 - y) * (1 - k));
                return [r, g, b];
            } else if (color.typename === "GrayColor") {
                var val = Math.round(255 * (1 - color.gray / 100));
                return [val, val, val];
            } else if (color.typename === "GradientColor") {
                if (color.gradient && color.gradient.gradientStops.length > 0) {
                    return getRGB(color.gradient.gradientStops[0].color);
                }
            } else if (color.typename === "SpotColor") {
                if (color.spot) {
                    return getRGB(color.spot.color);
                }
            }
        } catch (e) {}
        return null;
    }

    function isInsideArtboard(bounds, abRect) {
        // bounds: [left, top, right, bottom]
        // abRect: [left, top, right, bottom]
        return !(bounds[2] < abRect[0] || bounds[0] > abRect[2] || bounds[3] > abRect[1] || bounds[1] < abRect[3]);
    }

    for (var a = 0; a < doc.artboards.length; a++) {
        var ab = doc.artboards[a];
        var abRect = ab.artboardRect; // [xa, ya, x_right, y_bottom]
        var xa = abRect[0];
        var ya = abRect[1];
        var widthPt = Math.abs(abRect[2] - abRect[0]);
        var heightPt = Math.abs(abRect[1] - abRect[3]);

        var slideData = {
            slideNumber: a + 1,
            artboardName: ab.name,
            widthPt: widthPt,
            heightPt: heightPt,
            items: []
        };

        // Extract items across document layers
        for (var p = doc.pageItems.length - 1; p >= 0; p--) {
            var item = doc.pageItems[p];
            if (item.hidden) continue;

            var gb = item.geometricBounds; // [left, top, right, bottom]
            if (!isInsideArtboard(gb, abRect)) continue;

            // Map coordinates relative to artboard top-left
            var relLeft = gb[0] - xa;
            var relTop = ya - gb[1];
            var relWidth = Math.abs(gb[2] - gb[0]);
            var relHeight = Math.abs(gb[1] - gb[3]);

            if (item.typename === "TextFrame") {
                var tfData = {
                    type: "text",
                    kind: item.kind === TextType.AREATEXT ? "area" : "point",
                    left: relLeft,
                    top: relTop,
                    width: relWidth,
                    height: relHeight,
                    paragraphs: []
                };

                for (var pr = 0; pr < item.paragraphs.length; pr++) {
                    var para = item.paragraphs[pr];
                    var pText = "";
                    try { pText = para.contents; } catch(e) {}
                    if (!pText || pText.length === 0) continue;

                    var paraData = {
                        text: pText,
                        align: "LEFT",
                        runs: []
                    };

                    try {
                        var just = para.paragraphAttributes.justification;
                        if (just === Justification.CENTER) paraData.align = "CENTER";
                        else if (just === Justification.RIGHT) paraData.align = "RIGHT";
                        else if (just === Justification.FULLJUSTIFY) paraData.align = "JUSTIFY";
                    } catch (e) {}

                    var cCount = 0;
                    try { cCount = para.characters.length; } catch(e) {}

                    if (cCount > 0) {
                        var firstChar = para.characters[0];
                        var baseFont = "Arial";
                        var baseSize = 12;
                        var baseBold = false;
                        var baseItalic = false;
                        var baseColor = [0, 0, 0];
                        try {
                            if (firstChar.textFont) {
                                baseFont = firstChar.textFont.family;
                                var style = (firstChar.textFont.style || "").toLowerCase();
                                if (style.indexOf("bold") !== -1) baseBold = true;
                                if (style.indexOf("italic") !== -1 || style.indexOf("oblique") !== -1) baseItalic = true;
                            }
                            baseSize = firstChar.size || 12;
                            var fc = getRGB(firstChar.fillColor);
                            if (fc) baseColor = fc;
                        } catch(e) {}

                        var currentRun = {
                            text: firstChar.contents,
                            font: baseFont,
                            size: baseSize,
                            bold: baseBold,
                            italic: baseItalic,
                            color: baseColor
                        };

                        for (var c = 1; c < cCount; c++) {
                            try {
                                var ch = para.characters[c];
                                var chFont = baseFont;
                                var chSize = baseSize;
                                var chBold = baseBold;
                                var chItalic = baseItalic;
                                var chColor = baseColor;

                                if (ch.textFont) {
                                    chFont = ch.textFont.family;
                                    var s = (ch.textFont.style || "").toLowerCase();
                                    chBold = (s.indexOf("bold") !== -1);
                                    chItalic = (s.indexOf("italic") !== -1 || s.indexOf("oblique") !== -1);
                                }
                                chSize = ch.size || baseSize;
                                var cfc = getRGB(ch.fillColor);
                                if (cfc) chColor = cfc;

                                var same = (chFont === currentRun.font && 
                                            Math.abs(chSize - currentRun.size) < 0.1 && 
                                            chBold === currentRun.bold && 
                                            chItalic === currentRun.italic && 
                                            chColor[0] === currentRun.color[0] && 
                                            chColor[1] === currentRun.color[1] && 
                                            chColor[2] === currentRun.color[2]);

                                if (same) {
                                    currentRun.text += ch.contents;
                                } else {
                                    paraData.runs.push(currentRun);
                                    currentRun = {
                                        text: ch.contents,
                                        font: chFont,
                                        size: chSize,
                                        bold: chBold,
                                        italic: chItalic,
                                        color: chColor
                                    };
                                }
                            } catch(e) {
                                break;
                            }
                        }
                        paraData.runs.push(currentRun);
                    } else {
                        paraData.runs.push({
                            text: pText,
                            font: "Arial",
                            size: 12,
                            bold: false,
                            italic: false,
                            color: [0, 0, 0]
                        });
                    }
                    tfData.paragraphs.push(paraData);
                }
                slideData.items.push(tfData);

            } else if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                var imgPath = "";
                try {
                    if (item.file) imgPath = item.file.fsName;
                } catch (e) {}

                slideData.items.push({
                    type: "image",
                    imagePath: imgPath,
                    left: relLeft,
                    top: relTop,
                    width: relWidth,
                    height: relHeight,
                    opacity: item.opacity
                });

            } else if (item.typename === "PathItem") {
                if (!item.filled && !item.stroked) continue;
                if (item.clipping && !item.filled && !item.stroked) continue;
                var fillColor = item.filled ? getRGB(item.fillColor) : null;
                var strokeColor = item.stroked ? getRGB(item.strokeColor) : null;
                var strokeWidth = item.stroked ? item.strokeWeight : 0;
                var gradientData = null;
                if (item.filled && item.fillColor && item.fillColor.typename === "GradientColor") {
                    try {
                        var g = item.fillColor.gradient;
                        var stops = [];
                        for (var s = 0; s < g.gradientStops.length; s++) {
                            var st = g.gradientStops[s];
                            var stColor = getRGB(st.color);
                            if (stColor) {
                                stops.push({
                                    position: st.rampPoint / 100.0,
                                    color: stColor
                                });
                            }
                        }
                        gradientData = {
                            type: g.type === GradientType.RADIAL ? "radial" : "linear",
                            stops: stops
                        };
                    } catch(e) {}
                }

                slideData.items.push({
                    type: "shape",
                    left: relLeft,
                    top: relTop,
                    width: relWidth,
                    height: relHeight,
                    fillColor: fillColor,
                    gradient: gradientData,
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth,
                    opacity: item.opacity,
                    closed: item.closed
                });
            }
        }
        result.artboards.push(slideData);
    }

    var manifestFile = new File("~/Desktop/Conversion/Working/extracted_artwork.json");
    manifestFile.encoding = "UTF-8";
    manifestFile.open("w");
    manifestFile.write(JSON.stringify(result, null, 2));
    manifestFile.close();

    return JSON.stringify(result);
})();
