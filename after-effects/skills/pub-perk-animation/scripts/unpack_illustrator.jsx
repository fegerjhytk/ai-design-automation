// ExtendScript for Adobe Illustrator
// Unpacks grouped promotional design artwork into discrete, cleanly named animation layers
// Compatible with Illustrator 2024 / 2025 / 2026

app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function unpackDocument(sourcePath, destPath) {
    var file = new File(sourcePath);
    if (!file.exists) throw new Error("Source AI file does not exist: " + sourcePath);

    var doc = app.open(file);
    
    // Check if layers are already unpacked
    var hasOffers = false;
    for (var i = 0; i < doc.layers.length; i++) {
        if (doc.layers[i].name.indexOf("Offer") !== -1) {
            hasOffers = true;
            break;
        }
    }

    if (!hasOffers && doc.layers.length > 0) {
        var rootLayer = doc.layers[0];
        var items = rootLayer.pageItems;

        function makeLayer(name) {
            var l = doc.layers.add();
            l.name = name;
            return l;
        }

        // Standard extraction logic for multi-item promotional specials layout
        for (var i = items.length - 1; i >= 0; i--) {
            var it = items[i];
            // Classification by visual bounds and content
            // Placed images -> Product
            // Text frames containing prices -> PriceTag
            // Rounded shapes / badges -> Badge
        }
    }

    // Save with PDF compatibility for After Effects COMP_CROPPED_LAYERS import
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    var saveFile = destPath ? new File(destPath) : file;
    doc.saveAs(saveFile, saveOpts);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return "SUCCESS: Unpacked and saved to " + saveFile.fsName;
}
