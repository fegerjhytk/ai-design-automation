app.beginUndoGroup("Reorder Comp Layers to Strict Hierarchy");

(function() {
    var proj = app.project;
    var comp = null;
    for (var i = 1; i <= proj.numItems; i++) {
        if (proj.item(i) instanceof CompItem && proj.item(i).name === "Zigma_Compare_Edit_Select_9-16") {
            comp = proj.item(i);
            break;
        }
    }
    if (!comp) return;

    // Desired order from top (index 1) to bottom:
    var targetNames = [
        "SFX_09_Sub_Brand_Outro",
        "ASSET_ZIGMA_LOGO",
        "White Solid 1",
        "www.zigmaelectricals.com",
        "Logo_place.psd",
        "Shop Now →",
        "CTA_BUTTON_BG",
        // Text Callouts
        "COMFORT.",
        "WARMTH.",
        "Safety Assurance",
        "Cool Touch Body",
        "Silent Operation",
        "Long Cord",
        "Built to last the season.",
        "One dial. That's it.",
        // Video Cuts (Cut 1 to Cut 8, each V2 on top, Desktop underneath)
        "Cut 1 - V2 Take [0s-3s]",
        "Cut 1 - Desktop Take [0s-3s]",
        "Cut 2 - V2 Take [3s-6s]",
        "Cut 2 - Desktop Take [3s-6s]",
        "Cut 3 - V2 Take [6s-7.5s]",
        "Cut 3 - Desktop Take [6s-7.5s]",
        "Cut 4 - V2 Take [7.5s-9s]",
        "Cut 4 - Desktop Take [7.5s-9s]",
        "Cut 5 - V2 Take [9s-10.5s]",
        "Cut 5 - Desktop Take [9s-10.5s]",
        "Cut 6 - V2 Take [10.5s-12s]",
        "Cut 6 - Desktop Take [10.5s-12s]",
        "Cut 7 - V2 Take [12s-13.5s]",
        "Cut 7 - Desktop Take [12s-13.5s]",
        "Cut 8 - V2 Take [13.5s-15s]",
        "Cut 8 - Desktop Take [13.5s-15s]",
        // Foley Suite
        "SFX_08_CTA_Chime",
        "SFX_07_Climax_Riser_Hit",
        "SFX_06_Cut6_Swoosh",
        "SFX_05_Cut5_Swoosh",
        "SFX_04_Cut4_Swoosh",
        "SFX_03_Cut3_Swoosh",
        "SFX_02_Cut2_Swoosh",
        "SFX_01_Intro_Reveal_Swoosh",
        // Music Bed
        "Music_Bed_Quartz_Heater"
    ];

    // Helper: find layer by name
    function findLayer(name) {
        for (var j = 1; j <= comp.numLayers; j++) {
            if (comp.layer(j).name === name) return comp.layer(j);
        }
        return null;
    }

    // Move from last (bottom) to first (top)
    for (var k = targetNames.length - 1; k >= 0; k--) {
        var lyr = findLayer(targetNames[k]);
        if (lyr) {
            lyr.moveToBeginning();
        }
    }

    // Save project
    proj.save();

    var f = new File("/tmp/reorder_done.txt");
    f.open("w");
    f.write("REORDERED");
    f.close();
})();

app.endUndoGroup();
