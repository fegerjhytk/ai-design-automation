/**
 * build_kinetic_showcase.jsx
 * 
 * High-Impact Kinetic & Size Animation Showcase for AI Video Services
 * Built for Adobe After Effects 2026:
 * - 9:16 Vertical (1080 x 1920 @ 24fps, Duration: 16.5s)
 * - 100% Zero-Keyframe Expression Architecture (Clean, un-cluttered timeline)
 * - Master [MOTION_CONTROLLER] Null with Sliders for real-time tweaking
 * - Kinetic Size Animation: Elastic overshoot, inertial bounce & volume breathing
 * - Synced Audio: Voiceover narration + Zept library whoosh SFX & camera impacts
 * - Dedicated [USER_AI_VIDEO_SLOT] layer ready for footage drop
 */

(function() {
    app.beginUndoGroup("Build Kinetic AI Video Showcase");

    var proj = app.project;
    if (!proj) proj = app.newProject();

    var projectDir = "/Users/admin/Desktop/AI Video Making Showcase";
    var audioDir = projectDir + "/(Footage)/Audio";
    var aepDest = projectDir + "/Kinetic AI Animation Showcase.aep";

    var compWidth = 1080;
    var compHeight = 1920;
    var compDuration = 16.5;
    var compFps = 24;

    // 1. Create or Find Composition
    var comp = null;
    for (var i = 1; i <= proj.numItems; i++) {
        if (proj.item(i) instanceof CompItem && proj.item(i).name === "Kinetic_AI_Animation_Showcase") {
            comp = proj.item(i);
            break;
        }
    }
    if (!comp) {
        comp = proj.items.addComp("Kinetic_AI_Animation_Showcase", compWidth, compHeight, 1.0, compDuration, compFps);
    }
    comp.bgColor = [0.02, 0.03, 0.06];

    // Clear existing layers if rebuilding
    while (comp.numLayers > 0) {
        comp.layer(1).remove();
    }

    // 2. Master Motion Controller Null
    var ctrl = comp.layers.addNull();
    ctrl.name = "[MOTION_CONTROLLER]";
    ctrl.label = 13; // Yellow / Gold
    ctrl.inPoint = 0;
    ctrl.outPoint = compDuration;

    var sPop = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    sPop.name = "Kinetic Scale Pop";
    sPop.property("ADBE Slider Control-0001").setValue(12); // Bounce amplitude

    var sBuoy = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    sBuoy.name = "Float Amplitude";
    sBuoy.property("ADBE Slider Control-0001").setValue(7); // Float distance

    var sSpd = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    sSpd.name = "Float Speed";
    sSpd.property("ADBE Slider Control-0001").setValue(1.4);

    // Helper: Safely Import Footage/Audio
    function importFileSafely(filePath) {
        var fileObj = new File(filePath);
        if (!fileObj.exists) return null;
        for (var j = 1; j <= proj.numItems; j++) {
            if (proj.item(j) instanceof FootageItem && proj.item(j).file && proj.item(j).file.fsName === fileObj.fsName) {
                return proj.item(j);
            }
        }
        try {
            var io = new ImportOptions(fileObj);
            return proj.importFile(io);
        } catch(e) {
            return null;
        }
    }

    // 3. Audio & SFX Assets
    var voItem = importFileSafely(audioDir + "/voiceover_kinetic.wav");
    var whooshFast = importFileSafely(audioDir + "/14 Fast Whoosh B.wav");
    var whooshSimple = importFileSafely(audioDir + "/17 Simple_Whoosh.wav");
    var sfxFlash = importFileSafely(audioDir + "/camera shot flash 2.mp3");

    // 4. Background & User AI Video Slot
    var bgSolid = comp.layers.addSolid([0.04, 0.05, 0.09], "Showcase_Dark_Canvas", compWidth, compHeight, 1.0);
    bgSolid.moveToEnd();

    var videoPlaceholder = comp.layers.addText("<< DROP YOUR 15S AI VIDEO HERE >>");
    videoPlaceholder.name = "[USER_AI_VIDEO_SLOT]";
    var vDoc = videoPlaceholder.property("Source Text").value;
    vDoc.fontSize = 36;
    vDoc.fillColor = [0.35, 0.42, 0.52];
    vDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
    videoPlaceholder.property("Source Text").setValue(vDoc);
    videoPlaceholder.position.setValue([540, 960]);
    videoPlaceholder.outPoint = 15.0;
    videoPlaceholder.label = 10; // Red

    // 5. Place Audio Tracks
    if (voItem) {
        var vo = comp.layers.add(voItem);
        vo.name = "VO_Kinetic_Showcase";
        vo.startTime = 0.2;
        vo.label = 9; // Green
    }
    if (whooshFast) {
        var w0 = comp.layers.add(whooshFast); w0.name = "SFX_Whoosh_0"; w0.startTime = 0.0; w0.label = 9;
        var w1 = comp.layers.add(whooshFast); w1.name = "SFX_Whoosh_1"; w1.startTime = 3.6; w1.label = 9;
        var w2 = comp.layers.add(whooshFast); w2.name = "SFX_Whoosh_2"; w2.startTime = 7.6; w2.label = 9;
    }
    if (whooshSimple) {
        var w3 = comp.layers.add(whooshSimple); w3.name = "SFX_Whoosh_CTA"; w3.startTime = 11.8; w3.label = 9;
    }
    if (sfxFlash) {
        var f1 = comp.layers.add(sfxFlash); f1.name = "SFX_Impact_Beat1"; f1.startTime = 3.8; f1.label = 9;
        var f2 = comp.layers.add(sfxFlash); f2.name = "SFX_Impact_Beat2"; f2.startTime = 7.8; f2.label = 9;
    }

    /**
     * Helper: Add Expression-Driven Kinetic Text Layer (ZERO KEYFRAMES)
     */
    function addKineticText(textString, inT, outT, yPos, fontSize, colorRGB, isAccent, hasSlide) {
        var textLyr = comp.layers.addText(textString);
        var doc = textLyr.property("Source Text").value;
        doc.fontSize = fontSize;
        doc.fillColor = colorRGB;
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        textLyr.property("Source Text").setValue(doc);

        textLyr.inPoint = inT;
        textLyr.outPoint = outT;
        textLyr.label = isAccent ? 14 : 11; // Peach or Orange

        // Baseline position
        textLyr.transform.position.setValue([540, yPos]);

        // 1. Kinetic Size / Scale Expression (Elastic Overshoot Pop)
        textLyr.transform.scale.expression = 
            "var ctrl = thisComp.layer('[MOTION_CONTROLLER]');\n" +
            "var amp = ctrl.effect('Kinetic Scale Pop')('Slider');\n" +
            "var t = time - inPoint;\n" +
            "var dur = 0.32;\n" +
            "if (t < 0) {\n" +
            "    [0, 0];\n" +
            "} else if (t < dur) {\n" +
            "    var s = easeOut(t, 0, dur, 20, 100);\n" +
            "    [s, s];\n" +
            "} else {\n" +
            "    var decay = Math.exp(-6.0 * (t - dur));\n" +
            "    var bounce = Math.sin((t - dur) * 3.5 * Math.PI * 2) * amp * decay;\n" +
            "    [100 + bounce, 100 + bounce];\n" +
            "}";

        // 2. Position Drift / Slide Expression
        if (hasSlide) {
            textLyr.transform.position.expression = 
                "var ctrl = thisComp.layer('[MOTION_CONTROLLER]');\n" +
                "var amp = ctrl.effect('Float Amplitude')('Slider');\n" +
                "var spd = ctrl.effect('Float Speed')('Slider');\n" +
                "var t = time - inPoint;\n" +
                "var slideDur = 0.35;\n" +
                "var startY = value[1] + 60;\n" +
                "var curY = t < slideDur ? easeOut(t, 0, slideDur, startY, value[1]) : value[1];\n" +
                "var floatOffset = Math.sin(t * spd * Math.PI * 2) * amp;\n" +
                "[value[0], curY + floatOffset];";
        } else {
            textLyr.transform.position.expression = 
                "var ctrl = thisComp.layer('[MOTION_CONTROLLER]');\n" +
                "var amp = ctrl.effect('Float Amplitude')('Slider');\n" +
                "var spd = ctrl.effect('Float Speed')('Slider');\n" +
                "var t = Math.max(0, time - inPoint);\n" +
                "var floatOffset = Math.sin(t * spd * Math.PI * 2) * amp;\n" +
                "[value[0], value[1] + floatOffset];";
        }

        // 3. Opacity Fade In / Fade Out Expression
        textLyr.transform.opacity.expression = 
            "var fadeIn = 0.18;\n" +
            "var fadeOut = 0.25;\n" +
            "if (time < inPoint + fadeIn) {\n" +
            "    linear(time, inPoint, inPoint + fadeIn, 0, 100);\n" +
            "} else if (time > outPoint - fadeOut) {\n" +
            "    linear(time, outPoint - fadeOut, outPoint, 100, 0);\n" +
            "} else {\n" +
            "    100;\n" +
            "}";

        return textLyr;
    }

    // --- SCENE 1: THE HOOK (0.0s – 3.8s) ---
    addKineticText("YOUR CONCEPTS DESERVE", 0.0, 3.8, 480, 50, [1, 1, 1], false, true);
    addKineticText("MORE THAN STATIC IMAGES.", 0.2, 3.8, 560, 64, [0.98, 0.78, 0.15], true, true);

    // --- SCENE 2: THE CRAFT & DIRECTION (3.8s – 7.8s) ---
    addKineticText("CINEMATIC 4K AI ANIMATION", 3.8, 7.8, 440, 56, [0.0, 0.94, 1.0], true, true);
    addKineticText("+ ADVANCED MOTION DESIGN", 4.0, 7.8, 520, 48, [1, 1, 1], false, false);
    addKineticText("ORGANIC PHYSICS & FOLEY SOUND", 4.2, 7.8, 600, 38, [0.8, 0.85, 0.95], false, false);

    // --- SCENE 3: VIRAL GROWTH & REELS (7.8s – 11.8s) ---
    addKineticText("BUILT TO STOP THE SCROLL", 7.8, 11.8, 460, 58, [0.98, 0.78, 0.15], true, true);
    addKineticText("TURN PROMPTS INTO HIGH-CONVERSION ADS", 8.0, 11.8, 540, 44, [1, 1, 1], false, false);
    addKineticText("48-HOUR PRODUCTION TURNAROUND", 8.3, 11.8, 620, 38, [0.0, 0.94, 1.0], false, false);

    // --- SCENE 4: CTA & OUTRO (11.8s – 16.5s) ---
    addKineticText("LET'S SCALE YOUR BRAND.", 11.8, 16.5, 840, 54, [1, 1, 1], false, true);
    addKineticText("DM 'ANIMATE' TO START", 12.0, 16.5, 930, 72, [0.0, 0.94, 1.0], true, true);
    addKineticText("TAP LINK IN BIO FOR PORTFOLIO", 12.3, 16.5, 1030, 38, [0.9, 0.9, 0.9], false, false);

    // 6. Save Project
    var saveFile = new File(aepDest);
    proj.save(saveFile);

    return "OK||Kinetic Showcase comp built successfully with 0 keyframes and full expression sliders";
})();
