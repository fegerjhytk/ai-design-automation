// Adobe Illustrator QC Auditor Engine
// Analyzes open document for brand color consistency, label-fill mismatches,
// typography brief adherence, copy-paste residue, and structural cleanliness.

#target illustrator
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

// Minimal JSON serializer for ExtendScript
var JSON = {
    stringify: function (obj) {
        var t = typeof obj;
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
            return String(obj);
        }
        var json = [];
        var isArr = (obj && obj.constructor === Array);
        for (var n in obj) {
            if (obj.hasOwnProperty(n)) {
                var v = obj[n];
                t = typeof v;
                if (t === "function") continue;
                if (t === "string") {
                    v = '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
                } else if (t === "object" && v !== null) {
                    v = JSON.stringify(v);
                }
                json.push((isArr ? "" : '"' + n + '":') + String(v));
            }
        }
        return (isArr ? "[" : "{") + String(json) + (isArr ? "]" : "}");
    }
};

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1).toUpperCase();
}

function getArtboardIndex(item, doc) {
    var b = item.geometricBounds; // [left, top, right, bottom]
    var cx = (b[0] + b[2]) / 2;
    var cy = (b[1] + b[3]) / 2;
    for (var i = 0; i < doc.artboards.length; i++) {
        var ab = doc.artboards[i].artboardRect;
        if (cx >= ab[0] && cx <= ab[2] && cy <= ab[1] && cy >= ab[3]) {
            return i + 1;
        }
    }
    return 0;
}

function runAudit() {
    if (app.documents.length === 0) {
        return JSON.stringify({ error: "No active document open in Illustrator." });
    }

    var doc = app.activeDocument;
    var audit = {
        docName: doc.name,
        artboardsCount: doc.artboards.length,
        timestamp: String(new Date()),
        issues: [],
        stats: {
            totalPageItems: doc.pageItems.length,
            totalTextFrames: doc.textFrames.length,
            totalPathItems: doc.pathItems.length,
            uniqueColors: {},
            fontsUsed: {}
        }
    };

    function addIssue(severity, category, artboard, title, details, itemBounds) {
        audit.issues.push({
            severity: severity, // "CRITICAL", "WARNING", "INFO"
            category: category, // "COLOR", "TYPOGRAPHY", "CONTENT", "GEOMETRY"
            artboard: artboard,
            title: title,
            details: details,
            bounds: itemBounds || null
        });
    }

    // 1. EXTRACT ALL FILL COLORS AND PATH ITEMS
    var pathsWithFill = [];
    for (var i = 0; i < doc.pageItems.length; i++) {
        var item = doc.pageItems[i];
        if (item.typename === "PathItem") {
            if (item.filled && item.fillColor.typename === "RGBColor") {
                var hex = rgbToHex(item.fillColor.red, item.fillColor.green, item.fillColor.blue);
                audit.stats.uniqueColors[hex] = (audit.stats.uniqueColors[hex] || 0) + 1;
                pathsWithFill.push({
                    index: i,
                    hex: hex,
                    bounds: item.geometricBounds,
                    artboard: getArtboardIndex(item, doc),
                    width: item.width,
                    height: item.height
                });
            }
            // Check for unpainted paths
            if (!item.filled && !item.stroked) {
                if (item.pathPoints.length > 1) {
                    addIssue("INFO", "GEOMETRY", getArtboardIndex(item, doc), "Unpainted Path", "Path has neither fill nor stroke.", item.geometricBounds);
                }
            }
            // Check for stray points
            if (item.pathPoints.length === 1 && !item.filled && !item.stroked) {
                addIssue("WARNING", "GEOMETRY", getArtboardIndex(item, doc), "Stray Point", "Isolated stray anchor point detected.", item.geometricBounds);
            }
        }
    }

    // 2. AUDIT TEXT FRAMES: COLORS, FONTS, LABELS, TYPOS
    var abOptionLabels = {};      // artboard -> "Option 01" / "Option 02"
    var abRecommendedTags = [];  // artboards with "Recommended direction"
    var headlineFontsByAB = {};  // artboard -> list of headline font names
    var bodyFontsByAB = {};      // artboard -> list of body font names

    for (var j = 0; j < doc.textFrames.length; j++) {
        var tf = doc.textFrames[j];
        var abIdx = getArtboardIndex(tf, doc);
        var content = tf.contents;
        var cleanContent = content.replace(/^\s+|\s+$/g, "");

        // Empty text frames
        if (cleanContent.length === 0) {
            addIssue("WARNING", "GEOMETRY", abIdx, "Empty Text Frame", "Text frame contains no printable text.", tf.geometricBounds);
            continue;
        }

        // Fonts audit
        try {
            for (var tr = 0; tr < tf.textRanges.length; tr++) {
                var tRange = tf.textRanges[tr];
                var fName = tRange.characterAttributes.textFont.name;
                audit.stats.fontsUsed[fName] = (audit.stats.fontsUsed[fName] || 0) + 1;

                // Color of text
                if (tRange.characterAttributes.fillColor.typename === "RGBColor") {
                    var tHex = rgbToHex(tRange.characterAttributes.fillColor.red, tRange.characterAttributes.fillColor.green, tRange.characterAttributes.fillColor.blue);
                    audit.stats.uniqueColors[tHex] = (audit.stats.uniqueColors[tHex] || 0) + 1;
                }
            }
        } catch (e) {}

        // 3. BRAND CODE & HEX LABEL VS FILL AUDIT
        var hexMatch = content.match(/#[0-9a-fA-F]{6}/g);
        if (hexMatch) {
            for (var h = 0; h < hexMatch.length; h++) {
                var statedHex = hexMatch[h].toUpperCase();
                // Find closest path swatch within 400 pt on the same artboard
                var tfB = tf.geometricBounds;
                var tfCx = (tfB[0] + tfB[2]) / 2;
                var tfCy = (tfB[1] + tfB[3]) / 2;

                var closestDist = 999999;
                var closestPath = null;
                for (var p = 0; p < pathsWithFill.length; p++) {
                    var pf = pathsWithFill[p];
                    if (pf.artboard === abIdx && (pf.width > 30 && pf.height > 20)) {
                        var pCx = (pf.bounds[0] + pf.bounds[2]) / 2;
                        var pCy = (pf.bounds[1] + pf.bounds[3]) / 2;
                        var dist = Math.sqrt(Math.pow(tfCx - pCx, 2) + Math.pow(tfCy - pCy, 2));
                        if (dist < closestDist && dist < 350) {
                            closestDist = dist;
                            closestPath = pf;
                        }
                    }
                }

                if (closestPath && closestPath.hex !== statedHex) {
                    var rgbMatch = content.match(/RGB\s+(\d+),\s*(\d+),\s*(\d+)/i);
                    var rgbHex = null;
                    if (rgbMatch) {
                        rgbHex = rgbToHex(parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10));
                    }

                    if (rgbHex && rgbHex !== statedHex) {
                        addIssue("CRITICAL", "COLOR", abIdx, "Label vs. RGB Mismatch", 
                            "Text states '" + statedHex + "', but adjacent RGB string indicates '" + rgbHex + "'! (Matches swatch '" + closestPath.hex + "')", tf.geometricBounds);
                    } else if (closestPath.hex !== statedHex && closestDist < 180) {
                        addIssue("WARNING", "COLOR", abIdx, "Hex Label vs. Swatch Mismatch", 
                            "Label states '" + statedHex + "', but closest swatch fill is '" + closestPath.hex + "' (distance " + Math.round(closestDist) + "pt).", tf.geometricBounds);
                    }
                }
            }
        }

        // 4. COMMON DESIGN TYPOS & RESIDUE
        if (content.indexOf("Dusky Rose") >= 0) {
            addIssue("WARNING", "CONTENT", abIdx, "Brand Spelling Typo", "Found 'Dusky Rose'. Master brand guideline is 'Dusty Rose'.", tf.geometricBounds);
        }
        if (content.indexOf("Cateogary") >= 0) {
            addIssue("WARNING", "CONTENT", abIdx, "Spelling Typo", "Found 'Cateogary'. Correct spelling is 'Category'.", tf.geometricBounds);
        }
        if (content.indexOf("Propert Group") >= 0) {
            addIssue("WARNING", "CONTENT", abIdx, "Spelling Typo", "Found 'Propert Group'. Correct spelling is 'Property Group'.", tf.geometricBounds);
        }
        if (/Lorem ipsum|TODO|TBD|\[insert/i.test(content)) {
            addIssue("WARNING", "CONTENT", abIdx, "Placeholder Text Remaining", "Unresolved placeholder copy detected: '" + cleanContent.substring(0, 40) + "...'", tf.geometricBounds);
        }

        // 5. SLIDE LABELS & RECOMMENDATION BADGES
        if (/^Option\s*0?[1-9]$/i.test(cleanContent)) {
            abOptionLabels[abIdx] = cleanContent;
        }
        if (cleanContent === "Recommended direction" || cleanContent.indexOf("Recommended direction") >= 0) {
            abRecommendedTags.push({ artboard: abIdx, bounds: tf.geometricBounds });
        }

        // Subtitle copy-paste mismatch detection
        if (cleanContent.indexOf("Compare supporting typography around one new headline font") >= 0) {
            // Check if this artboard is a color palette artboard (has # hex codes or 'Base colour')
            for (var k = 0; k < doc.textFrames.length; k++) {
                var tfK = doc.textFrames[k];
                if (getArtboardIndex(tfK, doc) === abIdx) {
                    if (tfK.contents.indexOf("Base colour") >= 0 || tfK.contents.indexOf("Supporting colour") >= 0) {
                        addIssue("WARNING", "CONTENT", abIdx, "Cross-Section Subtitle Copy-Paste", 
                            "Typography subtitle ('Compare supporting typography...') found on a Color Palette slide.", tf.geometricBounds);
                        break;
                    }
                }
            }
        }
    }

    // Check multiple "Recommended direction" badges
    if (abRecommendedTags.length > 1) {
        var abList = [];
        for (var r = 0; r < abRecommendedTags.length; r++) {
            abList.push("Artboard " + abRecommendedTags[r].artboard);
        }
        addIssue("CRITICAL", "CONTENT", 0, "Conflicting Multiple Recommendations", 
            "Multiple slides are tagged as 'Recommended direction' (" + abList.join(", ") + "). Choose one.", null);
    }

    // 6. BRIEF TYPOGRAPHY COMPLIANCE: 1 Headline Font with N Body Options
    var headlineFontFamilies = {};
    for (var f in audit.stats.fontsUsed) {
        if (f.indexOf("HiraMin") < 0) { // skip Japanese Hiragino
            if (/Augereau|Geller|Didot|Bodoni|Caslon|Garamond/i.test(f)) {
                var fam = f.split("-")[0];
                headlineFontFamilies[fam] = true;
            }
        }
    }
    var headlineFamCount = 0;
    var headlineFamNames = [];
    for (var hf in headlineFontFamilies) {
        headlineFamCount++;
        headlineFamNames.push(hf);
    }
    if (headlineFamCount > 1) {
        addIssue("WARNING", "TYPOGRAPHY", 0, "Multiple Headline Fonts in Proposal", 
            "Found multiple headline families: " + headlineFamNames.join(", ") + ". Brief specifies 1 headline font with 2 body options.", null);
    }

    return JSON.stringify(audit);
}

var result = runAudit();
var f = new File("/tmp/qc_audit_output.json");
f.encoding = "UTF-8";
f.open("w");
f.write(result);
f.close();
"QC Audit Complete. Exported to /tmp/qc_audit_output.json";
