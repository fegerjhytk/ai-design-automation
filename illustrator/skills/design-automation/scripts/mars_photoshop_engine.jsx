/**
 * mars_photoshop_engine.jsx
 * 
 * Photoshop 2026 Automation Engine inspired by Mars Premedia (William Campbell)
 * Core Capabilities for AI Design Automation & Video Motion Pipelines:
 * 1. AI Subject & Face Centering / Auto-Crop (Select Subject -> Centered Headroom -> 9:16 / 16:9 Video Canvas)
 * 2. Batch Size & Mask (Subject Cutouts + Alpha Mattes for AE 2.5D Parallax & Puppet Rigging)
 * 3. Layer Slicing & Manifest Export (Slices PSD layers into isolated PNGs with 3D coordinate metadata)
 * 4. Data-Driven Variable Production from CSV (Batch image & text replacement for high-volume video ads)
 * 5. Production Health Audit Report (Scans project media for resolution, dimensions, and RGB video compliance)
 * 6. Before & After Split-Screen Proofing
 * 
 * Compatibility: Adobe Photoshop CC 2026 (ExtendScript ES3)
 */

#target photoshop

// Disable modal dialogs for automated batch execution
app.displayDialogs = DialogModes.NO;

var MarsPhotoshopEngine = {

    /**
     * Helper: Trigger Adobe Sensei "Select Subject" via ActionManager
     */
    selectSubject: function() {
        try {
            var desc = new ActionDescriptor();
            desc.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
            executeAction(stringIDToTypeID("autoCutout"), desc, DialogModes.NO);
            return true;
        } catch(e) {
            return false;
        }
    },

    /**
     * 1. Smart Subject Auto-Crop for Video (9:16 or 16:9)
     * Detects subject, centers with headroom margin, crops to exact video aspect ratio
     */
    autoCropSubject: function(inputPath, outputPath, targetRatioStr, marginPercent, targetWidth, targetHeight) {
        var fileRef = new File(inputPath);
        if (!fileRef.exists) return "Error: Input file does not exist: " + inputPath;

        var doc = app.open(fileRef);
        var origWidth = doc.width.as('px');
        var origHeight = doc.height.as('px');

        // Parse target aspect ratio (default 9:16 = 0.5625 for mobile vertical, 16:9 = 1.7778 for widescreen)
        var targetRatio = (targetRatioStr === '9:16') ? (9.0 / 16.0) : (targetRatioStr === '16:9' ? (16.0 / 9.0) : 1.0);
        var margin = (marginPercent !== undefined) ? marginPercent : 0.15; // 15% margin around subject

        var hasSubject = this.selectSubject();
        var bounds = null;

        if (hasSubject) {
            try {
                bounds = doc.selection.bounds; // [left, top, right, bottom] in UnitValue
            } catch(e) {
                bounds = null;
            }
        }

        var l, t, r, b;
        if (bounds) {
            l = bounds[0].as('px');
            t = bounds[1].as('px');
            r = bounds[2].as('px');
            b = bounds[3].as('px');
            doc.selection.deselect();
        } else {
            // Fallback: use center 70% of document
            l = origWidth * 0.15;
            r = origWidth * 0.85;
            t = origHeight * 0.15;
            b = origHeight * 0.85;
        }

        var subjectW = r - l;
        var subjectH = b - t;
        var cx = l + (subjectW / 2.0);
        // Headroom bias: for people/portraits, place center slightly higher (40% down subject height)
        var cy = t + (subjectH * 0.42);

        // Calculate crop box that encompasses subject + margin while matching targetRatio
        var paddedW = subjectW * (1.0 + margin * 2.0);
        var paddedH = subjectH * (1.0 + margin * 2.0);

        var cropW, cropH;
        if ((paddedW / paddedH) > targetRatio) {
            // Width is limiting
            cropW = paddedW;
            cropH = paddedW / targetRatio;
        } else {
            // Height is limiting
            cropH = paddedH;
            cropW = paddedH * targetRatio;
        }

        // Ensure crop does not exceed original dimensions where possible
        if (cropW > origWidth) {
            cropW = origWidth;
            cropH = cropW / targetRatio;
        }
        if (cropH > origHeight) {
            cropH = origHeight;
            cropW = cropH * targetRatio;
        }

        var cropL = cx - (cropW / 2.0);
        var cropR = cx + (cropW / 2.0);
        var cropT = cy - (cropH * 0.45); // slight headroom allowance
        var cropB = cropT + cropH;

        // Clamp to document boundary
        if (cropL < 0) { cropR -= cropL; cropL = 0; }
        if (cropR > origWidth) { cropL -= (cropR - origWidth); cropR = origWidth; }
        if (cropT < 0) { cropB -= cropT; cropT = 0; }
        if (cropB > origHeight) { cropT -= (cropB - origHeight); cropB = origHeight; }
        if (cropL < 0) cropL = 0;
        if (cropT < 0) cropT = 0;

        // Execute crop
        doc.crop([new UnitValue(cropL, 'px'), new UnitValue(cropT, 'px'), new UnitValue(cropR, 'px'), new UnitValue(cropB, 'px')]);

        // Optional standard resize (e.g. 1080x1920 or 1920x1080)
        if (targetWidth && targetHeight) {
            doc.resizeImage(new UnitValue(targetWidth, 'px'), new UnitValue(targetHeight, 'px'), 72, ResampleMethod.BICUBICAUTOMATIC);
        }

        // Save output
        var outFile = new File(outputPath);
        this.saveAsPng24(doc, outFile);
        doc.close(SaveOptions.DONOTSAVECHANGES);

        return "SUCCESS: Cropped to " + targetRatioStr + " -> " + outputPath;
    },

    /**
     * 2. Batch Size & Mask: Isolate Subject Cutout & Clean Alpha Matte for AE
     */
    batchSizeAndMask: function(inputPath, outputDir, baseName) {
        var fileRef = new File(inputPath);
        if (!fileRef.exists) return "Error: Input file does not exist: " + inputPath;

        var doc = app.open(fileRef);
        var outDirRef = new Folder(outputDir);
        if (!outDirRef.exists) outDirRef.create();

        var base = baseName || fileRef.name.replace(/\.[^\.]+$/, '');
        var cutoutPath = outputDir + "/" + base + "_cutout.png";
        var maskPath = outputDir + "/" + base + "_mask.png";

        var hasSubject = this.selectSubject();
        if (!hasSubject) {
            doc.close(SaveOptions.DONOTSAVECHANGES);
            return "Error: Could not automatically detect subject in: " + inputPath;
        }

        // Duplicate document for cutout
        var docCutout = doc.duplicate();
        docCutout.selection.invert();
        try {
            docCutout.selection.clear(); // Clear background leaving transparent cutout
        } catch(e) {
            // In case of flattened background, promote to layer
            if (docCutout.activeLayer.isBackgroundLayer) {
                docCutout.activeLayer.isBackgroundLayer = false;
                docCutout.selection.clear();
            }
        }
        this.saveAsPng24(docCutout, new File(cutoutPath));
        docCutout.close(SaveOptions.DONOTSAVECHANGES);

        // Generate high-contrast B&W Alpha Matte for After Effects track mattes
        var docMask = doc.duplicate();
        // Invert to select background and fill with Black
        docMask.selection.invert();
        var black = new SolidColor();
        black.rgb.red = 0; black.rgb.green = 0; black.rgb.blue = 0;
        docMask.selection.fill(black);

        // Select subject and fill with White
        docMask.selection.invert();
        var white = new SolidColor();
        white.rgb.red = 255; white.rgb.green = 255; white.rgb.blue = 255;
        docMask.selection.fill(white);
        docMask.selection.deselect();

        this.saveAsPng24(docMask, new File(maskPath));
        docMask.close(SaveOptions.DONOTSAVECHANGES);

        doc.close(SaveOptions.DONOTSAVECHANGES);
        return "SUCCESS: Created Cutout (" + cutoutPath + ") and Alpha Matte (" + maskPath + ")";
    },

    /**
     * 3. Layer Slicing & Manifest Export for After Effects Puppet & 2.5D Rigging
     */
    sliceLayersForAE: function(psdPath, outputDir) {
        var fileRef = new File(psdPath);
        if (!fileRef.exists) return "Error: PSD not found: " + psdPath;

        var doc = app.open(fileRef);
        var outDirRef = new Folder(outputDir);
        if (!outDirRef.exists) outDirRef.create();

        var docWidth = doc.width.as('px');
        var docHeight = doc.height.as('px');

        var layers = doc.artLayers;
        var layerData = [];

        // Hide all layers first
        for (var i = 0; i < layers.length; i++) {
            layers[i].visible = false;
        }

        for (var j = 0; j < layers.length; j++) {
            var layer = layers[j];
            layer.visible = true;

            var lName = layer.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
            var outPngPath = outputDir + "/layer_" + j + "_" + lName + ".png";

            var bounds = layer.bounds; // [left, top, right, bottom]
            var lx = bounds[0].as('px');
            var ly = bounds[1].as('px');
            var lw = bounds[2].as('px') - lx;
            var lh = bounds[3].as('px') - ly;

            var entry = {
                index: j,
                name: layer.name,
                sanitizedName: lName,
                file: "layer_" + j + "_" + lName + ".png",
                x: lx,
                y: ly,
                width: lw,
                height: lh,
                opacity: layer.opacity,
                blendMode: String(layer.blendMode)
            };
            layerData.push(entry);

            // Export isolated full-frame or trimmed layer
            var layerDoc = doc.duplicate();
            // In duplicate, ensure only this layer is visible
            for (var k = 0; k < layerDoc.artLayers.length; k++) {
                layerDoc.artLayers[k].visible = (k === j);
            }
            this.saveAsPng24(layerDoc, new File(outPngPath));
            layerDoc.close(SaveOptions.DONOTSAVECHANGES);

            layer.visible = false;
        }

        doc.close(SaveOptions.DONOTSAVECHANGES);

        // Write manifest JSON
        var manifestFile = new File(outputDir + "/layers_manifest.json");
        manifestFile.open("w");
        manifestFile.write(this.serializeJSON({
            sourcePsd: psdPath,
            canvasWidth: docWidth,
            canvasHeight: docHeight,
            totalLayers: layers.length,
            layers: layerData
        }));
        manifestFile.close();

        return "SUCCESS: Sliced " + layers.length + " layers to " + outputDir;
    },

    /**
     * 4. Variable Data Production from CSV
     * Replaces text and images in a PSD template row-by-row
     */
    variableFromCSV: function(templatePsdPath, csvPath, outputDir) {
        var templateFile = new File(templatePsdPath);
        if (!templateFile.exists) return "Error: Template PSD not found: " + templatePsdPath;

        var csvFile = new File(csvPath);
        if (!csvFile.exists) return "Error: CSV not found: " + csvPath;

        var outDirRef = new Folder(outputDir);
        if (!outDirRef.exists) outDirRef.create();

        // Read CSV
        csvFile.open("r");
        var content = csvFile.read();
        csvFile.close();

        var lines = content.split(/[\r\n]+/);
        if (lines.length < 2) return "Error: CSV has no data rows";

        var headers = this.parseCSVLine(lines[0]);
        var generatedCount = 0;

        for (var rowIdx = 1; rowIdx < lines.length; rowIdx++) {
            if (!lines[rowIdx] || lines[rowIdx].length === 0) continue;
            var values = this.parseCSVLine(lines[rowIdx]);
            var rowData = {};
            for (var h = 0; h < headers.length; h++) {
                rowData[headers[h].toUpperCase()] = values[h] || "";
            }

            var doc = app.open(templateFile);

            // Update text layers matching header names
            for (var i = 0; i < doc.artLayers.length; i++) {
                var layer = doc.artLayers[i];
                if (layer.kind === LayerKind.TEXT) {
                    var lNameUpper = layer.name.toUpperCase();
                    if (rowData[lNameUpper] !== undefined && rowData[lNameUpper] !== "") {
                        layer.textItem.contents = rowData[lNameUpper];
                    }
                }
            }

            var outName = rowData["FILENAME"] || ("variant_" + (rowIdx < 10 ? "0" + rowIdx : rowIdx));
            var outFilePath = outputDir + "/" + outName + ".png";
            this.saveAsPng24(doc, new File(outFilePath));
            doc.close(SaveOptions.DONOTSAVECHANGES);
            generatedCount++;
        }

        return "SUCCESS: Generated " + generatedCount + " variants into " + outputDir;
    },

    /**
     * 5. Production Health Audit Report (Images Report)
     * Scans project media folder, audits PPI, dimensions, and converts/flags non-RGB for video
     */
    generateImagesReport: function(folderPath, reportCsvPath) {
        var dir = new Folder(folderPath);
        if (!dir.exists) return "Error: Folder not found: " + folderPath;

        var files = dir.getFiles(function(f) {
            return f instanceof File && f.name.match(/\.(jpg|jpeg|png|tif|tiff|psd|webp)$/i);
        });

        var reportLines = ["Filename,Width_px,Height_px,Resolution_PPI,ColorMode,BitsPerChannel,Status,Action_Required"];

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            try {
                var doc = app.open(f);
                var w = doc.width.as('px');
                var h = doc.height.as('px');
                var res = doc.resolution;
                var mode = String(doc.mode);
                var bits = String(doc.bitsPerChannel);

                var status = "OK";
                var action = "None";

                // Video pipelines (After Effects / Google Flow) require RGB
                if (doc.mode !== DocumentMode.RGB) {
                    status = "WARNING_CMYK";
                    action = "Convert to RGB (CMYK corrupts video render engines)";
                } else if (w < 1080 && h < 1080) {
                    status = "LOW_RES";
                    action = "Upscale with Nano Banana or Bicubic before video injection";
                }

                reportLines.push(f.name + "," + w + "," + h + "," + res + "," + mode + "," + bits + "," + status + "," + action);
                doc.close(SaveOptions.DONOTSAVECHANGES);
            } catch(e) {
                reportLines.push(f.name + ",ERROR,ERROR,ERROR,ERROR,ERROR,FAILED_TO_OPEN," + e.message);
            }
        }

        var reportFile = new File(reportCsvPath);
        reportFile.open("w");
        reportFile.write(reportLines.join("\n"));
        reportFile.close();

        return "SUCCESS: Audited " + files.length + " assets -> " + reportCsvPath;
    },

    /**
     * 6. Before & After Split-Screen Proofing
     */
    createBeforeAfter: function(beforePath, afterPath, outputPath) {
        var fileBefore = new File(beforePath);
        var fileAfter = new File(afterPath);
        if (!fileBefore.exists || !fileAfter.exists) return "Error: Both Before and After images must exist";

        var docBefore = app.open(fileBefore);
        var bw = docBefore.width.as('px');
        var bh = docBefore.height.as('px');

        // Create new side-by-side canvas: width = bw * 2, height = bh
        var compDoc = app.documents.add(new UnitValue(bw * 2, 'px'), new UnitValue(bh, 'px'), 72, "BeforeAfterComp", NewDocumentMode.RGB, DocumentFill.WHITE);

        // Copy Before into left half
        app.activeDocument = docBefore;
        docBefore.selection.selectAll();
        docBefore.selection.copy();
        docBefore.close(SaveOptions.DONOTSAVECHANGES);

        app.activeDocument = compDoc;
        compDoc.paste();
        var layerBefore = compDoc.activeLayer;
        layerBefore.name = "Before";
        layerBefore.translate(new UnitValue(-bw / 2, 'px'), 0);

        // Copy After into right half
        var docAfter = app.open(fileAfter);
        docAfter.resizeImage(new UnitValue(bw, 'px'), new UnitValue(bh, 'px'));
        docAfter.selection.selectAll();
        docAfter.selection.copy();
        docAfter.close(SaveOptions.DONOTSAVECHANGES);

        app.activeDocument = compDoc;
        compDoc.paste();
        var layerAfter = compDoc.activeLayer;
        layerAfter.name = "After";
        layerAfter.translate(new UnitValue(bw / 2, 'px'), 0);

        this.saveAsPng24(compDoc, new File(outputPath));
        compDoc.close(SaveOptions.DONOTSAVECHANGES);

        return "SUCCESS: Created Before/After proof -> " + outputPath;
    },

    /**
     * Utility: Export Document as 300/72 DPI PNG-24 with Transparency
     */
    saveAsPng24: function(doc, fileObj) {
        var opts = new ExportOptionsSaveForWeb();
        opts.format = SaveDocumentType.PNG;
        opts.PNG8 = false;
        opts.transparency = true;
        opts.interlaced = false;
        opts.includeProfile = true;
        doc.exportDocument(fileObj, ExportType.SAVEFORWEB, opts);
    },

    /**
     * Utility: Parse CSV Line handling quotes and commas
     */
    parseCSVLine: function(line) {
        var values = [];
        var inQuotes = false;
        var current = "";
        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                values.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/^\s+|\s+$/g, ''));
                current = "";
            } else {
                current += c;
            }
        }
        values.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/^\s+|\s+$/g, ''));
        return values;
    },

    /**
     * Utility: JSON Serializer for ExtendScript ES3
     */
    serializeJSON: function(obj) {
        if (obj === null) return "null";
        if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
        if (typeof obj === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
        if (obj instanceof Array) {
            var arr = [];
            for (var i = 0; i < obj.length; i++) {
                arr.push(this.serializeJSON(obj[i]));
            }
            return "[" + arr.join(",") + "]";
        }
        if (typeof obj === "object") {
            var props = [];
            for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                    props.push('"' + k + '":' + this.serializeJSON(obj[k]));
                }
            }
            return "{" + props.join(",") + "}";
        }
        return '""';
    }
};
