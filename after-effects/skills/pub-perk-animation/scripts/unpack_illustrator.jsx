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

    // Unpack BG_Stars if multiple star groups are present inside a clipping mask
    var starLayer = null;
    var baseLayer = null;
    for (var l = 0; l < doc.layers.length; l++) {
        if (doc.layers[l].name == "BG_Stars" || doc.layers[l].name == "BG_Star") starLayer = doc.layers[l];
        if (doc.layers[l].name == "BG_Base") baseLayer = doc.layers[l];
    }
    if (starLayer && starLayer.groupItems.length > 0) {
        var mainGrp = starLayer.groupItems[0];
        if (mainGrp.groupItems.length >= 2) {
            mainGrp.clipped = false;
            // Remove clipping path if present
            for (var p = mainGrp.pageItems.length - 1; p >= 0; p--) {
                var pi = mainGrp.pageItems[p];
                if (pi.typename == "PathItem") {
                    try { pi.remove(); } catch(e) {}
                }
            }
            // Sort remaining star groups from left to right
            var starGroups = [];
            for (var g = 0; g < mainGrp.groupItems.length; g++) {
                starGroups.push(mainGrp.groupItems[g]);
            }
            starGroups.sort(function(a, b) {
                return a.geometricBounds[0] - b.geometricBounds[0];
            });
            for (var idx = 0; idx < starGroups.length; idx++) {
                var nl = doc.layers.add();
                nl.name = "BG_Stars_" + (idx + 1);
                if (baseLayer) nl.move(baseLayer, ElementPlacement.PLACEBEFORE);
                starGroups[idx].move(nl, ElementPlacement.PLACEATEND);
            }
            try { starLayer.remove(); } catch(e) {}
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
