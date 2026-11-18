/**
 * export_artboard_references.jsx
 * 
 * Exports reference PNG renders for every artboard in the active Illustrator document.
 * Enforces:
 * - Exact artboard bounding box clipping (artBoardClipping = true).
 * - Sequential padded numbering (artboard-001.png, artboard-002.png...).
 * - Outputs artboard_manifest.json mapping artboards to slides.
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
    var destFolder = new Folder("~/Desktop/Conversion/Reference-renders");
    if (!destFolder.exists) {
        destFolder.create();
    }

    var manifest = {
        documentName: doc.name,
        totalArtboards: doc.artboards.length,
        exportTimestamp: (new Date()).toString(),
        slides: []
    };

    var exportOptions = new ExportOptionsPNG24();
    exportOptions.antiAliasing = true;
    exportOptions.transparency = false;
    exportOptions.artBoardClipping = true;
    // 150 PPI render (150/72 * 100% = 208.333%)
    exportOptions.horizontalScale = 208.333;
    exportOptions.verticalScale = 208.333;

    for (var i = 0; i < doc.artboards.length; i++) {
        doc.artboards.setActiveArtboardIndex(i);
        var ab = doc.artboards[i];
        var rect = ab.artboardRect;
        var widthPt = Math.abs(rect[2] - rect[0]);
        var heightPt = Math.abs(rect[1] - rect[3]);

        var numStr = (i + 1).toString();
        while (numStr.length < 3) numStr = "0" + numStr;
        var baseName = "artboard-" + numStr;
        var outFile = new File(destFolder.fsName + "/" + baseName + ".png");

        doc.exportFile(outFile, ExportType.PNG24, exportOptions);

        manifest.slides.push({
            slideNumber: i + 1,
            artboardIndex: i,
            artboardName: ab.name,
            widthPt: widthPt,
            heightPt: heightPt,
            referenceImage: outFile.fsName
        });
    }

    // Write manifest JSON
    var manifestFile = new File("~/Desktop/Conversion/Working/artboard_manifest.json");
    var manifestFolder = new Folder("~/Desktop/Conversion/Working");
    if (!manifestFolder.exists) manifestFolder.create();

    manifestFile.open("w");
    manifestFile.write(JSON.stringify(manifest, null, 2));
    manifestFile.close();

    return JSON.stringify(manifest);
})();
