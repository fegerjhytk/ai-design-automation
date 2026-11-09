app.beginUndoGroup("Add White Solid and Logo Outro");

try {
    var comp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === "Zigma_Quartz_Heater_Promo_9-16") {
            comp = app.project.item(i);
            break;
        }
    }
    if (!comp) throw new Error("Composition Zigma_Quartz_Heater_Promo_9-16 not found");

    // 1. Extend Comp Duration to 18.5s (444 frames @ 24fps)
    comp.duration = 18.5;

    // 2. Import ZIGMA LOGO.pdf if not already in project
    var logoFile = new File("/Users/designdrop/Desktop/zigma/product/(Footage)/ZIGMA LOGO.pdf");
    if (!logoFile.exists) throw new Error("ZIGMA LOGO.pdf not found at " + logoFile.fsName);
    
    var logoItem = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i).name === "ZIGMA LOGO.pdf") {
            logoItem = app.project.item(i);
            break;
        }
    }
    if (!logoItem) {
        var ioLogo = new ImportOptions(logoFile);
        logoItem = app.project.importFile(ioLogo);
    }

    // 3. Import SFX_05_Cinematic_Sub_Outro.wav if not already in project
    var sfxFile = new File("/Users/designdrop/Desktop/zigma/product/(Footage)/Audio/SFX_05_Cinematic_Sub_Outro.wav");
    var sfxItem = null;
    if (sfxFile.exists) {
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i).name === "SFX_05_Cinematic_Sub_Outro.wav") {
                sfxItem = app.project.item(i);
                break;
            }
        }
        if (!sfxItem) {
            var ioSfx = new ImportOptions(sfxFile);
            sfxItem = app.project.importFile(ioSfx);
        }
    }

    // 4. Remove any existing outro layers if re-running
    var oldLogo = comp.layer("ASSET_ZIGMA_LOGO");
    if (oldLogo) oldLogo.remove();
    var oldSolid = comp.layer("White Solid 1");
    if (oldSolid) oldSolid.remove();
    var oldSfx = comp.layer("SFX_09_Sub_Brand_Outro");
    if (oldSfx) oldSfx.remove();

    // 5. Add White Solid 1
    var whiteSolid = comp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
    whiteSolid.startTime = 15.0;
    whiteSolid.inPoint = 15.0;
    whiteSolid.outPoint = 18.5;
    whiteSolid.transform.position.setValue([540, 960, 0]);
    whiteSolid.transform.scale.setValue([100, 100, 100]);

    // 6. Add ASSET_ZIGMA_LOGO
    var outroLogo = comp.layers.add(logoItem);
    outroLogo.name = "ASSET_ZIGMA_LOGO";
    outroLogo.startTime = 15.0;
    outroLogo.inPoint = 15.0;
    outroLogo.outPoint = 18.5;
    outroLogo.transform.position.setValue([540, 960, 0]);
    outroLogo.transform.scale.setValue([52.7, 52.7, 100]);
    try {
        outroLogo.collapseTransformation = true;
    } catch(e) {}

    // Ensure order: ASSET_ZIGMA_LOGO at index 1, White Solid 1 at index 2
    whiteSolid.moveToBeginning();
    outroLogo.moveToBeginning();

    // 7. Add Sub Outro SFX
    if (sfxItem) {
        var sfxLayer = comp.layers.add(sfxItem);
        sfxLayer.name = "SFX_09_Sub_Brand_Outro";
        sfxLayer.startTime = 15.0;
        sfxLayer.inPoint = 15.0;
        sfxLayer.outPoint = 18.5;
        try {
            sfxLayer.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]);
        } catch(e) {}
    }

    // 8. Adjust Music Bed
    var music = comp.layer("Music_Bed_Quartz_Heater");
    if (music) {
        music.outPoint = 18.5;
        try {
            var alvl = music.property("Audio").property("Audio Levels");
            while (alvl.numKeys > 0) {
                alvl.removeKey(1);
            }
            alvl.setValueAtTime(0.0, [0, 0]);
            alvl.setValueAtTime(14.8, [0, 0]);
            alvl.setValueAtTime(18.5, [-45, -45]);
        } catch(e) {}
    }

    // 9. Save project
    app.project.save();

    var logFile = new File("/tmp/ae_outro_result.txt");
    logFile.open("w");
    logFile.writeln("SUCCESS: Outro added. Comp duration: " + comp.duration + "s");
    logFile.close();

} catch(err) {
    var logFile = new File("/tmp/ae_outro_result.txt");
    logFile.open("w");
    logFile.writeln("ERROR: " + err.toString() + " (Line " + err.line + ")");
    logFile.close();
}

app.endUndoGroup();
