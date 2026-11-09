// Zigma Quartz Heater 15s Promo Composition Builder (50% Longer Video Cuts)
// Compatibility: Adobe After Effects 2026+
// Standards: zigma-start-opener-video & zigma-commercial-video-production

app.beginUndoGroup("Build Zigma Quartz Heater 15s Promo");

(function() {
    var log = [];
    var errors = [];

    function logMsg(msg) {
        log.push(msg);
    }

    function logErr(err) {
        errors.push(err);
    }

    var projectFolder = "/Users/designdrop/Desktop/zigma/product/";
    var footageFolder = projectFolder + "(Footage)/";
    var audioFolder = footageFolder + "Audio/";

    // 1. Create or verify Project
    if (!app.project) {
        app.newProject();
    }

    // Helper: Find or Import file
    function findOrImportFile(filePath) {
        var f = new File(filePath);
        if (!f.exists) {
            logErr("File not found: " + filePath);
            return null;
        }
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem && item.file && item.file.fsName === f.fsName) {
                return item;
            }
        }
        try {
            var io = new ImportOptions(f);
            return app.project.importFile(io);
        } catch (e) {
            logErr("Error importing " + filePath + ": " + e.toString());
            return null;
        }
    }

    var primaryFont = "Helvetica-Bold";

    // 2. Main Composition Setup (1080 x 1920, 24fps, 15.0s)
    var compName = "Zigma_Quartz_Heater_Promo_9-16";
    var compWidth = 1080;
    var compHeight = 1920;
    var pixelAspect = 1.0;
    var duration = 15.0; // 15.0 seconds (50% longer than 10.0s)
    var frameRate = 24.0;

    var comp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var it = app.project.item(i);
        if (it instanceof CompItem && it.name === compName) {
            comp = it;
            break;
        }
    }

    if (!comp) {
        comp = app.project.items.addComp(compName, compWidth, compHeight, pixelAspect, duration, frameRate);
    } else {
        comp.width = compWidth;
        comp.height = compHeight;
        comp.duration = duration;
        comp.frameRate = frameRate;
        while (comp.numLayers > 0) {
            comp.layer(1).remove();
        }
    }

    comp.bgColor = [0.08, 0.08, 0.08];
    logMsg("Set composition: " + compName + " (1080x1920, 24fps, 15.0s)");

    // 3. Import Video Footage
    var videoItem = findOrImportFile(footageFolder + "Zigma_Quartz_Heater_10s.mp4");
    if (!videoItem) {
        logErr("Master video footage missing!");
    }

    // 4. Video Cut Layers (Frame 1 to Frame 8) - Sliced and stretched to 150% (50% longer each)
    // Frame 1: 0.00s - 3.00s (Empty podium)
    // Frame 2: 3.00s - 6.00s (Heater appear, off)
    // Frame 3: 6.00s - 7.50s (Macro push-in / safety dial)
    // Frame 4: 7.50s - 9.00s (Cool touch body / glowing heater)
    // Frame 5: 9.00s - 10.50s (Silent operation)
    // Frame 6: 10.50s - 12.00s (Long cord)
    // Frame 7: 12.00s - 13.50s (Final glowing hero shot)
    // Frame 8: 13.50s - 15.00s (Macro push-in on control knob)

    var cutDefs = [
        { name: "Frame 1", inTime: 0.0, outTime: 3.0 },
        { name: "Frame 2", inTime: 3.0, outTime: 6.0 },
        { name: "Frame 3", inTime: 6.0, outTime: 7.5 },
        { name: "Frame 4", inTime: 7.5, outTime: 9.0 },
        { name: "Frame 5", inTime: 9.0, outTime: 10.5 },
        { name: "Frame 6", inTime: 10.5, outTime: 12.0 },
        { name: "Frame 7", inTime: 12.0, outTime: 13.5 },
        { name: "Frame 8", inTime: 13.5, outTime: 15.0 }
    ];

    if (videoItem) {
        for (var c = 0; c < cutDefs.length; c++) {
            var def = cutDefs[c];
            var vLayer = comp.layers.add(videoItem);
            vLayer.name = def.name;
            vLayer.stretch = 150; // 150% stretch = 50% longer duration
            vLayer.startTime = 0.0;
            vLayer.inPoint = def.inTime;
            vLayer.outPoint = def.outTime;
            if (vLayer.hasAudio) {
                vLayer.audioEnabled = false;
            }
            logMsg("Added cut layer: " + def.name + " (" + def.inTime + "s - " + def.outTime + "s, stretch 150%)");
        }
    }

    // Expressions
    var textFloatExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var seed = index * 1.45;",
        "var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;",
        "var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;",
        "value + [xW, yW, 0];"
    ].join("\n");

    var ctaPulseExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var s = Math.sin(t * 4.0) * 2.2 * blend;",
        "[value[0] + s, value[1] + s];"
    ].join("\n");

    // Helper: Add kinetic word reveal text animator
    function addWordRevealAnimation(textLayer, animStart, animDur) {
        try {
            var textProp = textLayer.property("ADBE Text Properties");
            var animators = textProp.property("ADBE Text Animators");
            var anim = animators.addProperty("ADBE Text Animator");
            anim.name = "Kinetic Word Reveal";

            var animProps = anim.property("ADBE Text Animator Properties");
            var posProp = animProps.addProperty("ADBE Text Position 3D");
            posProp.setValue([0, 25, 0]);

            var blurProp = animProps.addProperty("ADBE Text Blur");
            blurProp.setValue([20, 20]);

            var opacityProp = animProps.addProperty("ADBE Text Opacity");
            opacityProp.setValue(0);

            var selectors = anim.property("ADBE Text Selectors");
            var rangeSel = selectors.addProperty("ADBE Text Selector");
            
            var advanced = rangeSel.property("ADBE Text Range Advanced");
            try {
                advanced.property("ADBE Text Range Type2").setValue(3); // Words
            } catch(e) {
                try {
                    advanced.property("ADBE Text Range Type2").setValue(2);
                } catch(e2) {}
            }

            var startProp = rangeSel.property("ADBE Text Percent Start");
            startProp.setValueAtTime(animStart, 0);
            startProp.setValueAtTime(animStart + animDur, 100);

            try {
                var easeIn = new KeyframeEase(0, 35);
                var easeOut = new KeyframeEase(0, 85);
                startProp.setTemporalEaseAtKey(1, [easeIn], [easeOut]);
                startProp.setTemporalEaseAtKey(2, [easeIn], [easeOut]);
            } catch(easeErr) {}

        } catch(e) {
            logErr("Animator error on " + textLayer.name + ": " + e.toString());
        }
    }

    // Helper: Apply Deep Glow 2 & Drop Shadow
    function applyGlowAndShadow(layer, isUrl) {
        var effects = layer.property("ADBE Effect Parade");
        try {
            var dg = effects.addProperty("Deep Glow 2");
            if (dg) {
                dg.property(23).setValue(35); // Radius strictly 35
                dg.property(24).setValue(isUrl ? 0.20 : 0.245); // Exposure
            }
        } catch(e) {
            try {
                var nativeGlow = effects.addProperty("ADBE Glo2");
                if (nativeGlow) {
                    nativeGlow.property("ADBE Glo2-0002").setValue(35);
                    nativeGlow.property("ADBE Glo2-0003").setValue(0.3);
                }
            } catch(e2) {}
        }

        try {
            var dropShadow = effects.addProperty("ADBE Drop Shadow");
            if (dropShadow) {
                dropShadow.property("ADBE Drop Shadow-0002").setValue(180); // Opacity ~70%
                dropShadow.property("ADBE Drop Shadow-0003").setValue(135); // Direction
                dropShadow.property("ADBE Drop Shadow-0004").setValue(8);   // Distance
                dropShadow.property("ADBE Drop Shadow-0005").setValue(12);  // Softness
            }
        } catch(e3) {}
    }

    // 5. Create Text Callouts (Adjusted for 15.0s timeline)
    var callouts = [
        {
            layerName: "COMFORT.",
            text: "COMFORT.",
            inTime: 0.15,
            outTime: 3.00,
            pos: [540, 480],
            fontSize: 76,
            tracking: -40,
            color: [1, 1, 1],
            animDur: 0.80,
            justify: ParagraphJustification.CENTER_JUSTIFY
        },
        {
            layerName: "WARMTH.",
            text: "WARMTH.",
            inTime: 3.15,
            outTime: 6.00,
            pos: [540, 480],
            fontSize: 76,
            tracking: -40,
            color: [1, 0.75, 0.38], // Warm Amber
            animDur: 0.80,
            justify: ParagraphJustification.CENTER_JUSTIFY
        },
        {
            layerName: "Safety Assurance",
            text: "Safety\rAssurance",
            inTime: 6.10,
            outTime: 7.50,
            pos: [280, 540],
            fontSize: 54,
            tracking: -30,
            color: [1, 1, 1],
            animDur: 0.65,
            justify: ParagraphJustification.LEFT_JUSTIFY
        },
        {
            layerName: "Cool Touch Body",
            text: "Cool Touch\rBody",
            inTime: 7.60,
            outTime: 9.00,
            pos: [800, 880],
            fontSize: 54,
            tracking: -30,
            color: [1, 1, 1],
            animDur: 0.65,
            justify: ParagraphJustification.LEFT_JUSTIFY
        },
        {
            layerName: "Silent Operation",
            text: "Silent\rOperation",
            inTime: 9.10,
            outTime: 10.50,
            pos: [260, 960],
            fontSize: 54,
            tracking: -30,
            color: [1, 1, 1],
            animDur: 0.65,
            justify: ParagraphJustification.LEFT_JUSTIFY
        },
        {
            layerName: "Long Cord",
            text: "Long Cord",
            inTime: 10.60,
            outTime: 12.00,
            pos: [800, 1160],
            fontSize: 54,
            tracking: -30,
            color: [1, 1, 1],
            animDur: 0.65,
            justify: ParagraphJustification.LEFT_JUSTIFY
        },
        {
            layerName: "Built to last the season.",
            text: "Built to last\rthe season.",
            inTime: 12.10,
            outTime: 13.50,
            pos: [540, 480],
            fontSize: 66,
            tracking: -30,
            color: [1, 0.88, 0.70],
            animDur: 0.75,
            justify: ParagraphJustification.CENTER_JUSTIFY
        },
        {
            layerName: "One dial. That's it.",
            text: "One dial.\rThat's it.",
            inTime: 13.55,
            outTime: 15.00,
            pos: [540, 460],
            fontSize: 68,
            tracking: -30,
            color: [1, 1, 1],
            animDur: 0.70,
            justify: ParagraphJustification.CENTER_JUSTIFY
        }
    ];

    for (var k = 0; k < callouts.length; k++) {
        var cData = callouts[k];
        var txtLayer = comp.layers.addText(cData.text);
        txtLayer.name = cData.layerName;
        txtLayer.inPoint = cData.inTime;
        txtLayer.outPoint = cData.outTime;
        txtLayer.property("Position").setValue(cData.pos);

        var txtProp = txtLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var txtDoc = txtProp.value;
        txtDoc.fontSize = cData.fontSize;
        txtDoc.font = primaryFont;
        txtDoc.fillColor = cData.color;
        txtDoc.tracking = cData.tracking;
        txtDoc.justification = cData.justify;
        txtDoc.applyFill = true;
        txtProp.setValue(txtDoc);

        addWordRevealAnimation(txtLayer, cData.inTime, cData.animDur);
        txtLayer.property("Position").expression = textFloatExpr;
        applyGlowAndShadow(txtLayer, false);

        logMsg("Added callout: " + cData.layerName + " (" + cData.inTime + "s - " + cData.outTime + "s)");
    }

    // 6. Modern CTA Button (13.75s - 15.00s)
    try {
        var ctaBg = comp.layers.addShape();
        ctaBg.name = "CTA_BUTTON_BG";
        ctaBg.inPoint = 13.75;
        ctaBg.outPoint = 15.00;
        ctaBg.property("Position").setValue([540, 1680]);

        var shapeGroup = ctaBg.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var shapeContents = shapeGroup.property("ADBE Vectors Group");
        var rect = shapeContents.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([380, 88]);
        rect.property("ADBE Vector Rect Roundness").setValue(24);

        var fill = shapeContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1.0, 0.55, 0.10]);

        ctaBg.property("Scale").expression = ctaPulseExpr;

        var ctaTxt = comp.layers.addText("Shop Now →");
        ctaTxt.name = "Shop Now →";
        ctaTxt.inPoint = 13.75;
        ctaTxt.outPoint = 15.00;

        var ctaDoc = ctaTxt.property("ADBE Text Properties").property("ADBE Text Document").value;
        ctaDoc.fontSize = 42;
        ctaDoc.font = primaryFont;
        ctaDoc.fillColor = [1, 1, 1];
        ctaDoc.tracking = 20;
        ctaDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        ctaTxt.property("ADBE Text Properties").property("ADBE Text Document").setValue(ctaDoc);

        ctaTxt.parent = ctaBg;
        ctaTxt.property("Position").setValue([0, 14]);

        logMsg("Created modern CTA button: Shop Now → (13.75s - 15.00s)");
    } catch(e) {
        logErr("CTA Button creation error: " + e.toString());
    }

    // 7. Persistent Brand Elements (0.0s - 15.0s)
    // A. Official Header Swoosh Logo Banner: Logo_place.psd
    var logoPsdItem = findOrImportFile(footageFolder + "Logo_place.psd");
    if (logoPsdItem) {
        var logoLayer = comp.layers.add(logoPsdItem);
        logoLayer.name = "Logo_place.psd";
        logoLayer.inPoint = 0.0;
        logoLayer.outPoint = 15.0;
        logoLayer.property("Position").setValue([540, 95]);
        logoLayer.property("Scale").setValue([62, 62]);
        logMsg("Added official header swoosh logo: Logo_place.psd");
    }

    // B. Website URL at Bottom Center: www.zigmaelectricals.com
    var urlLayer = comp.layers.addText("www.zigmaelectricals.com");
    urlLayer.name = "www.zigmaelectricals.com";
    urlLayer.inPoint = 0.0;
    urlLayer.outPoint = 15.0;
    urlLayer.property("Position").setValue([540, 1845]);

    var urlDoc = urlLayer.property("ADBE Text Properties").property("ADBE Text Document").value;
    urlDoc.fontSize = 32;
    urlDoc.font = primaryFont;
    urlDoc.fillColor = [0.95, 0.95, 0.95];
    urlDoc.tracking = 40;
    urlDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
    urlLayer.property("ADBE Text Properties").property("ADBE Text Document").setValue(urlDoc);
    applyGlowAndShadow(urlLayer, true);
    logMsg("Added website URL: www.zigmaelectricals.com (0.0s - 15.0s)");

    // 8. 10-Track Audio & Foley Design (Adjusted for 15.0s timeline)
    // Use Funk_Alternative.mp3 (19.54s long, perfect for 15.0s comp)
    var musicItem = findOrImportFile(audioFolder + "Funk_Alternative.mp3");
    if (!musicItem) {
        musicItem = findOrImportFile(audioFolder + "Zigma_Quartz_Heater_Music.mp3");
    }
    if (musicItem) {
        var musicLayer = comp.layers.add(musicItem);
        musicLayer.name = "Music_Bed_Quartz_Heater";
        musicLayer.startTime = 0.0;
        musicLayer.inPoint = 0.0;
        musicLayer.outPoint = 15.0;

        var audioProp = musicLayer.property("ADBE Audio Group").property("ADBE Audio Levels");
        audioProp.setValueAtTime(0.0, [-2.0, -2.0]);
        audioProp.setValueAtTime(13.8, [-2.0, -2.0]);
        audioProp.setValueAtTime(15.0, [-38.0, -38.0]);
        logMsg("Added Music Bed with smooth fade (0.0s - 15.0s)");
    }

    function addSfx(fileName, sfxName, startTime, inTime, outTime, volDb) {
        var sfxItem = findOrImportFile(audioFolder + fileName);
        if (!sfxItem) return;
        var sLayer = comp.layers.add(sfxItem);
        sLayer.name = sfxName;
        sLayer.startTime = startTime;
        sLayer.inPoint = inTime;
        sLayer.outPoint = outTime;
        if (sLayer.property("ADBE Audio Group")) {
            sLayer.property("ADBE Audio Group").property("ADBE Audio Levels").setValue([volDb, volDb]);
        }
        logMsg("Added SFX: " + sfxName + " at " + startTime + "s");
    }

    // Foley aligned to 15.0s cut points:
    addSfx("WHOOSH 0.wav", "SFX_01_Intro_Reveal_Swoosh", 0.0, 0.0, 1.8, -4.0);
    addSfx("14 Fast Whoosh B.wav", "SFX_02_Cut2_Heater_Appear", 2.95, 2.95, 4.5, -5.0);
    addSfx("4 fast whooshes.wav", "SFX_03_Cut3_Safety_Assurance", 5.95, 5.95, 7.2, -6.0);
    addSfx("17 Simple_Whoosh.wav", "SFX_04_Cut4_Cool_Touch", 7.45, 7.45, 8.8, -6.0);
    addSfx("WHOOSH 2 (RISE TO 0).wav", "SFX_05_Cut5_Silent_Op", 8.95, 8.95, 10.2, -6.0);
    addSfx("14 Fast Whoosh B.wav", "SFX_06_Cut6_Long_Cord", 10.45, 10.45, 11.8, -6.0);
    addSfx("WHOOSH (RISE TO HIT).wav", "SFX_07_Climax_Riser_Hit", 11.85, 11.85, 14.0, -4.0);
    addSfx("Doorbell.wav", "SFX_08_CTA_Chime", 13.72, 13.72, 15.0, -4.0);

    // 9. Save project file
    var projectFile = new File(projectFolder + "Zigma_Quartz_Heater_Promo_9-16.aep");
    app.project.save(projectFile);
    logMsg("Saved project to: " + projectFile.fsName);

    comp.openInViewer();

    // Write execution report
    var reportFile = new File("/tmp/ae_quartz_heater_15s_build_report.txt");
    reportFile.open("w");
    reportFile.writeln("=== Zigma Quartz Heater 15s Build Report ===");
    reportFile.writeln("Layers created: " + comp.numLayers);
    reportFile.writeln("Duration: " + comp.duration + "s");
    reportFile.writeln("Errors count: " + errors.length);
    if (errors.length > 0) {
        reportFile.writeln("ERRORS:\n" + errors.join("\n"));
    }
    reportFile.writeln("\nLOGS:\n" + log.join("\n"));
    reportFile.close();

})();

app.endUndoGroup();
