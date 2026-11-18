/**
 * audit_illustrator_doc.jsx
 * 
 * Audits the active or target Adobe Illustrator document before conversion.
 * Analyzes artboards, typography, live vs outlined text, placed/embedded images,
 * shapes, compound paths, clipping masks, transparency, and blend modes.
 * 
 * Outputs: JSON audit report to specified output path or ~/Desktop/Conversion/Working/audit_report.json
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
        alert("No active Illustrator document found. Please open a document to audit.");
        return;
    }

    var doc = app.activeDocument;
    var report = {
        documentName: doc.name,
        documentPath: doc.path ? doc.path.fsName : "Unsaved",
        colorSpace: doc.documentColorSpace.toString(),
        artboards: [],
        fonts: {},
        statistics: {
            artboardCount: doc.artboards.length,
            textFrameCount: doc.textFrames.length,
            liveAreaTextCount: 0,
            livePointTextCount: 0,
            pathItemCount: doc.pathItems.length,
            compoundPathCount: doc.compoundPathItems.length,
            placedImageCount: doc.placedItems.length,
            rasterItemCount: doc.rasterItems.length,
            groupCount: doc.groupItems.length,
            clippingMaskCount: 0,
            transparencyCount: 0
        },
        warnings: []
    };

    // 1. Audit Artboards
    for (var i = 0; i < doc.artboards.length; i++) {
        var ab = doc.artboards[i];
        var rect = ab.artboardRect; // [left, top, right, bottom]
        var width = Math.abs(rect[2] - rect[0]);
        var height = Math.abs(rect[1] - rect[3]);
        report.artboards.push({
            index: i + 1,
            name: ab.name,
            rect: [rect[0], rect[1], rect[2], rect[3]],
            widthPt: width,
            heightPt: height,
            aspectRatio: (width / height).toFixed(4)
        });
    }

    // 2. Audit Typography
    for (var t = 0; t < doc.textFrames.length; t++) {
        var tf = doc.textFrames[t];
        try {
            if (tf.kind === TextType.AREATEXT) {
                report.statistics.liveAreaTextCount++;
            } else if (tf.kind === TextType.POINTTEXT) {
                report.statistics.livePointTextCount++;
            }
            
            // Collect font info
            if (tf.textRange && tf.textRange.characters.length > 0) {
                var firstChar = tf.textRange.characters[0];
                var fontName = firstChar.textFont ? firstChar.textFont.name : "Unknown";
                var fontFamily = firstChar.textFont ? firstChar.textFont.family : "Unknown";
                var fontStyle = firstChar.textFont ? firstChar.textFont.style : "Unknown";
                
                if (!report.fonts[fontName]) {
                    report.fonts[fontName] = {
                        family: fontFamily,
                        style: fontStyle,
                        sampleCount: 1
                    };
                } else {
                    report.fonts[fontName].sampleCount++;
                }
            }
        } catch (e) {
            // Ignore individual text frame read errors
        }
    }

    // 3. Audit Images and Clipping Masks
    for (var g = 0; g < doc.groupItems.length; g++) {
        if (doc.groupItems[g].clipped) {
            report.statistics.clippingMaskCount++;
        }
    }

    // 4. Audit Transparencies and Blend Modes
    for (var p = 0; p < doc.pageItems.length; p++) {
        var item = doc.pageItems[p];
        try {
            if (item.opacity < 100 || item.blendingMode !== BlendModes.NORMAL) {
                report.statistics.transparencyCount++;
            }
        } catch (e) {}
    }

    // Check for mixed artboard aspect ratios
    if (report.artboards.length > 1) {
        var firstRatio = report.artboards[0].aspectRatio;
        var mixed = false;
        for (var a = 1; a < report.artboards.length; a++) {
            if (report.artboards[a].aspectRatio !== firstRatio) {
                mixed = true;
                break;
            }
        }
        if (mixed) {
            report.warnings.push("Document contains mixed artboard aspect ratios. Multi-deck export or letterboxing required.");
        }
    }

    // Output JSON
    var jsonString = JSON.stringify(report, null, 2);
    var exportFolder = new Folder("~/Desktop/Conversion/Working");
    if (!exportFolder.exists) {
        exportFolder.create();
    }
    var outFile = new File(exportFolder.fsName + "/audit_report.json");
    outFile.open("w");
    outFile.write(jsonString);
    outFile.close();

    return jsonString;
})();
