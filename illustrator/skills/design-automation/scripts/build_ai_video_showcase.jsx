/**
 * build_ai_video_showcase.jsx
 * 
 * Clean, Human-Editable After Effects 2026 Composition Builder:
 * - 9:16 Vertical Composition (1080 x 1920 @ 24fps)
 * - ZERO BAKED KEYFRAME CLUTTER: Only minimal 2-keyframe pairs with 80% smooth Bezier easing.
 * - Master Controller Null ([MOTION_CONTROLLER]) with Slider Controls:
 *   * "Buoyancy Amplitude" (default 6)
 *   * "Buoyancy Speed" (default 1.2)
 * - Single press of 'U' reveals only 2 clean, drag-and-drop keyframes per property.
 */

(function() {
    app.beginUndoGroup("Build Clean AI Video Showcase Comp");

    var proj = app.project;
    if (!proj) proj = app.newProject();

    var projectDir = "/Users/admin/Desktop/AI Video Making Showcase";
    var footageDir = projectDir + "/(Footage)";
    var audioDir = footageDir + "/Audio";
    var aepDest = projectDir + "/AI Video Making Showcase.aep";

    var compWidth = 1080;
    var compHeight = 1920;
    var compDuration = 17.5;
    var compFps = 24;

    // 1. Create or Find Master Composition
    var comp = null;
    for (var i = 1; i <= proj.numItems; i++) {
        if (proj.item(i) instanceof CompItem && proj.item(i).name === "AI_Video_Showcase_Promo_9-16") {
            comp = proj.item(i);
            break;
        }
    }
    if (!comp) {
        comp = proj.items.addComp("AI_Video_Showcase_Promo_9-16", compWidth, compHeight, 1.0, compDuration, compFps);
    }
    comp.bgColor = [0.03, 0.04, 0.07];

    // Clear existing layers if rebuilding
    while (comp.numLayers > 0) {
        comp.layer(1).remove();
    }

    // 2. Add Master Motion Controller Null (Allows 1-Click Tweaks Without Keyframes)
    var ctrlNull = comp.layers.addNull();
    ctrlNull.name = "[MOTION_CONTROLLER]";
    ctrlNull.label = 13; // Gold label
    ctrlNull.inPoint = 0;
    ctrlNull.outPoint = compDuration;

    var ampSlider = ctrlNull.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    ampSlider.name = "Buoyancy Amplitude";
    ampSlider.property("ADBE Slider Control-0001").setValue(6);

    var speedSlider = ctrlNull.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    speedSlider.name = "Buoyancy Speed";
    speedSlider.property("ADBE Slider Control-0001").setValue(1.2);

    // Easing helpers: 80% smooth bezier curve
    var easeSmooth = new KeyframeEase(0, 80);
    function applySmoothEase2D(prop, keyIdx) {
        try {
            prop.setTemporalEaseAtKey(keyIdx, [easeSmooth, easeSmooth], [easeSmooth, easeSmooth]);
        } catch(e) {}
    }
    function applySmoothEase1D(prop, keyIdx) {
        try {
            prop.setTemporalEaseAtKey(keyIdx, [easeSmooth], [easeSmooth]);
        } catch(e) {}
    }

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

    // 3. Import Audio & SFX
    var voItem = importFileSafely(audioDir + "/voiceover_promo.wav");
    var whooshFast = importFileSafely(audioDir + "/14 Fast Whoosh B.wav");
    var whooshSimple = importFileSafely(audioDir + "/17 Simple_Whoosh.wav");
    var sfxFlash = importFileSafely(audioDir + "/camera shot flash 2.mp3");

    // 4. Background & Placeholder Solid
    var bgSolid = comp.layers.addSolid([0.05, 0.07, 0.12], "AI_Video_Placeholder_Background", compWidth, compHeight, 1.0);
    bgSolid.moveToEnd();

    var placeholderGuide = comp.layers.addText("DROP YOUR 15S AI VIDEO HERE");
    placeholderGuide.name = "[PLACEHOLDER_USER_AI_VIDEO]";
    var guideDoc = placeholderGuide.property("Source Text").value;
    guideDoc.fontSize = 38;
    guideDoc.fillColor = [0.4, 0.45, 0.55];
    guideDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
    placeholderGuide.property("Source Text").setValue(guideDoc);
    placeholderGuide.position.setValue([540, 960]);
    placeholderGuide.outPoint = 15.0;

    // 5. Audio Layers (Green Label)
    if (voItem) {
        var vo = comp.layers.add(voItem);
        vo.name = "VO_Promotional_Narration";
        vo.startTime = 0.3;
        vo.label = 9; // Green
    }
    if (whooshFast) {
        var w1 = comp.layers.add(whooshFast); w1.name = "SFX_Whoosh_Intro"; w1.startTime = 0.0; w1.label = 9;
        var w2 = comp.layers.add(whooshFast); w2.name = "SFX_Whoosh_ValueProp1"; w2.startTime = 3.6; w2.label = 9;
        var w3 = comp.layers.add(whooshFast); w3.name = "SFX_Whoosh_ValueProp2"; w3.startTime = 8.2; w3.label = 9;
    }
    if (whooshSimple) {
        var w4 = comp.layers.add(whooshSimple); w4.name = "SFX_Whoosh_CTA"; w4.startTime = 12.8; w4.label = 9;
    }
    if (sfxFlash) {
        var f1 = comp.layers.add(sfxFlash); f1.name = "SFX_Impact_01"; f1.startTime = 3.8; f1.label = 9;
        var f2 = comp.layers.add(sfxFlash); f2.name = "SFX_Impact_02"; f2.startTime = 8.4; f2.label = 9;
    }

    /**
     * CLEAN 2-KEYFRAME ANIMATOR:
     * - Only 2 keyframes for entrance (Key 1 -> Key 2)
     * - Only 2 keyframes for exit (Key 3 -> Key 4)
     * - Every keyframe has smooth 80% Bezier easing
     * - No dense clutter! Sliding the keyframes adjusts timing instantly.
     */
    function addCleanAnimatedText(textString, inT, outT, yPos, fontSize, colorRGB, enableFloat) {
        var textLyr = comp.layers.addText(textString);
        var doc = textLyr.property("Source Text").value;
        doc.fontSize = fontSize;
        doc.fillColor = colorRGB;
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        textLyr.property("Source Text").setValue(doc);

        textLyr.inPoint = inT;
        textLyr.outPoint = outT;
        textLyr.label = 11; // Orange / Yellow

        var posProp = textLyr.transform.position;
        var scaleProp = textLyr.transform.scale;
        var opacProp = textLyr.transform.opacity;

        // Position: Clean static baseline
        posProp.setValue([540, yPos]);

        // Clean 2-keyframe Scale Entrance (0.35s duration)
        var kS1 = scaleProp.addKey(inT);
        scaleProp.setValueAtKey(kS1, [75, 75]);
        var kS2 = scaleProp.addKey(inT + 0.35);
        scaleProp.setValueAtKey(kS2, [100, 100]);
        applySmoothEase2D(scaleProp, 1);
        applySmoothEase2D(scaleProp, 2);

        // Clean 2-keyframe Opacity Fade In
        var kO1 = opacProp.addKey(inT);
        opacProp.setValueAtKey(kO1, 0);
        var kO2 = opacProp.addKey(inT + 0.20);
        opacProp.setValueAtKey(kO2, 100);
        applySmoothEase1D(opacProp, 1);
        applySmoothEase1D(opacProp, 2);

        // Clean 2-keyframe Opacity Fade Out
        var kO3 = opacProp.addKey(outT - 0.25);
        opacProp.setValueAtKey(kO3, 100);
        var kO4 = opacProp.addKey(outT);
        opacProp.setValueAtKey(kO4, 0);
        applySmoothEase1D(opacProp, 3);
        applySmoothEase1D(opacProp, 4);

        // Optional Float: Linked to Master Controller Null (Zero keyframes!)
        if (enableFloat) {
            posProp.expression = 
                "var ctrl = thisComp.layer('[MOTION_CONTROLLER]');\n" +
                "var amp = ctrl.effect('Buoyancy Amplitude')('Slider');\n" +
                "var spd = ctrl.effect('Buoyancy Speed')('Slider');\n" +
                "var yOffset = Math.sin((time - inPoint) * spd * Math.PI * 2) * amp;\n" +
                "[value[0], value[1] + yOffset];";
        }

        return textLyr;
    }

    // Scene 1: Hook (0.0s – 3.8s)
    addCleanAnimatedText("STOP SETTLING FOR", 0.0, 3.8, 480, 52, [1, 1, 1], false);
    addCleanAnimatedText("GENERIC VIDEOS.", 0.2, 3.8, 560, 68, [0.98, 0.78, 0.15], true);

    // Scene 2: Craft & Capabilities (3.8s – 8.3s)
    addCleanAnimatedText("CINEMATIC AI GENERATION", 3.8, 8.3, 440, 56, [0.0, 0.94, 1.0], true);
    addCleanAnimatedText("4K MOTION DESIGN & DIRECTION", 4.0, 8.3, 520, 48, [1, 1, 1], false);

    // Scene 3: Scalability & Engagement (8.3s – 12.8s)
    addCleanAnimatedText("HIGH-CONVERSION REELS", 8.3, 12.8, 460, 60, [0.98, 0.78, 0.15], true);
    addCleanAnimatedText("BUILT TO SCALE YOUR BRAND", 8.5, 12.8, 540, 46, [1, 1, 1], false);

    // Scene 4: CTA & Outro (12.8s – 17.5s)
    addCleanAnimatedText("CRAFT YOUR NEXT", 12.8, 17.5, 880, 52, [1, 1, 1], false);
    addCleanAnimatedText("VIRAL CREATIVE", 13.0, 17.5, 960, 72, [0.0, 0.94, 1.0], true);
    addCleanAnimatedText("TAP TO BOOK YOUR PROJECT", 13.3, 17.5, 1060, 38, [0.9, 0.9, 0.9], false);

    // 6. Save Project
    var saveFile = new File(aepDest);
    proj.save(saveFile);

    return "OK||Comp built with clean 2-point keyframes and master slider controls";
})();
