app.beginUndoGroup("Build Zigma White Fan Opener Comp (/zigma-start-opener-video)");

(function() {
    var log = [];
    function l(msg) { log.push(msg); }
    function logErr(msg) { log.push("ERROR: " + msg); }

    try {
        var proj = app.project;
        if (!proj) {
            proj = app.newProject();
        }

        var footageDir = "/Users/designdrop/Desktop/zigma/product/(Footage)";
        var audioDir = footageDir + "/Audio";

        // Helper: Find or import item
        function getOrImportItem(path, name) {
            for (var i = 1; i <= proj.numItems; i++) {
                if (proj.item(i).name === name) return proj.item(i);
            }
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);
            var io = new ImportOptions(f);
            var it = proj.importFile(io);
            return it;
        }

        // 1. Verify and Import Brand Assets & Audio
        var itLogoPlace = getOrImportItem(footageDir + "/Logo_place.psd", "Logo_place.psd");
        var itZigmaPdf = getOrImportItem(footageDir + "/ZIGMA LOGO.pdf", "ZIGMA LOGO.pdf");
        var itSubOutro = getOrImportItem(audioDir + "/SFX_05_Cinematic_Sub_Outro.wav", "SFX_05_Cinematic_Sub_Outro.wav");
        var itMusic = getOrImportItem(audioDir + "/Corporate_Upbeat_30s.mp3", "Corporate_Upbeat_30s.mp3");

        var itWhoosh0 = getOrImportItem(audioDir + "/WHOOSH 0.wav", "WHOOSH 0.wav");
        var itFastWhooshB = getOrImportItem(audioDir + "/14 Fast Whoosh B.wav", "14 Fast Whoosh B.wav");
        var itFast4 = getOrImportItem(audioDir + "/4 fast whooshes.wav", "4 fast whooshes.wav");
        var itSimpleWhoosh = getOrImportItem(audioDir + "/17 Simple_Whoosh.wav", "17 Simple_Whoosh.wav");
        var itRiseHit = getOrImportItem(audioDir + "/WHOOSH (RISE TO HIT).wav", "WHOOSH (RISE TO HIT).wav");
        var itDoorbell = getOrImportItem(audioDir + "/Doorbell.wav", "Doorbell.wav");

        // 2. Verify and Import all 9 White Fan Video Clips
        var videoFiles = [
            { id: "cut1", path: footageDir + "/White_Fan_01_Reveal_Hero.mp4", name: "White_Fan_01_Reveal_Hero.mp4", scale: [150, 150] },
            { id: "cut2", path: footageDir + "/White_Fan_02_Macro_Detail.mp4", name: "White_Fan_02_Macro_Detail.mp4", scale: [150, 150] },
            { id: "cut3", path: footageDir + "/White_Fan_03_Aerodynamic_Spin.mp4", name: "White_Fan_03_Aerodynamic_Spin.mp4", scale: [150, 150] },
            { id: "cut4", path: footageDir + "/White_Fan_04_Room_Scale.mp4", name: "White_Fan_04_Room_Scale.mp4", scale: [150, 150] },
            { id: "cut5", path: footageDir + "/White_Fan_05_Bottom_Up_Symmetry.mp4", name: "White_Fan_05_Bottom_Up_Symmetry.mp4", scale: [150, 150] },
            { id: "cut6", path: footageDir + "/White_Fan_06_FHD_Push_In.mp4", name: "White_Fan_06_FHD_Push_In.mp4", scale: [177.78, 177.78] },
            { id: "cut7", path: footageDir + "/White_Fan_07_Architectural_Shadows.mp4", name: "White_Fan_07_Architectural_Shadows.mp4", scale: [150, 150] },
            { id: "cut8", path: footageDir + "/White_Fan_08_Cinematic_Dolly.mp4", name: "White_Fan_08_Cinematic_Dolly.mp4", scale: [266.67, 266.67] },
            { id: "cut9", path: footageDir + "/White_Fan_09_Climax_Orbit.mp4", name: "White_Fan_09_Climax_Orbit.mp4", scale: [266.67, 266.67] }
        ];

        var videoItems = [];
        for (var v = 0; v < videoFiles.length; v++) {
            var itv = getOrImportItem(videoFiles[v].path, videoFiles[v].name);
            videoItems.push({ item: itv, scale: videoFiles[v].scale });
        }
        l("All 9 video clips and audio assets verified.");

        // 3. Setup Composition
        var compName = "Zigma_White_Fan_Commercial_9-16";
        for (var i = proj.numItems; i >= 1; i--) {
            if (proj.item(i) instanceof CompItem && proj.item(i).name === compName) {
                proj.item(i).remove();
            }
        }

        // Total Duration: 18.5s footage + 3.5s outro = 22.0s (528 frames @ 24fps)
        var compDuration = 22.0;
        var outroStart = 18.5;
        var comp = proj.items.addComp(compName, 1080, 1920, 1.0, compDuration, 24);
        comp.workAreaStart = 0.0;
        comp.workAreaDuration = compDuration;

        var primaryFont = "Helvetica-Bold";

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
            "var blend = Math.min(1.0, t / 0.5);",
            "var s = Math.sin(t * 3.2) * 1.8 * blend;",
            "[value[0] + s, value[1] + s];"
        ].join("\n");

        // Helper: Add Word Kinetic Animator
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
                    advanced.property("ADBE Text Range Type2").setValue(3); // Based on: Words
                } catch(e) {}

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
                    dropShadow.property("ADBE Drop Shadow-0002").setValue(180); // Opacity
                    dropShadow.property("ADBE Drop Shadow-0003").setValue(135); // Direction
                    dropShadow.property("ADBE Drop Shadow-0004").setValue(8);   // Distance
                    dropShadow.property("ADBE Drop Shadow-0005").setValue(16);  // Softness
                }
            } catch(e3) {}
        }

        // ==========================================
        // BUILD SCENES (Head-to-Tail, 0 gaps, 0 overlap)
        // ==========================================
        var sceneTimeline = [
            { inTime: 0.0,  outTime: 2.0,  copy: "PURE.\rDESIGN.",            fontSize: 76, color: [1, 1, 1] },
            { inTime: 2.0,  outTime: 4.0,  copy: "PRECISION\rCRAFTED.",       fontSize: 72, color: [0.96, 0.96, 0.97] },
            { inTime: 4.0,  outTime: 6.0,  copy: "SILENT.\rPOWERFUL.",        fontSize: 74, color: [1, 1, 1] },
            { inTime: 6.0,  outTime: 8.0,  copy: "SEAMLESS\rINTEGRATION.",    fontSize: 70, color: [0.96, 0.96, 0.97] },
            { inTime: 8.0,  outTime: 10.0, copy: "BLDC MOTOR\rEFFICIENCY.",   fontSize: 70, color: [1, 1, 1] },
            { inTime: 10.0, outTime: 12.0, copy: "AERODYNAMIC\rBLADES.",      fontSize: 70, color: [0.96, 0.96, 0.97] },
            { inTime: 12.0, outTime: 14.0, copy: "TIMELESS\rAESTHETIC.",      fontSize: 72, color: [1, 1, 1] },
            { inTime: 14.0, outTime: 16.0, copy: "PERFECT AIR.\rEVERY CORNER.", fontSize: 68, color: [0.96, 0.96, 0.97] },
            { inTime: 16.0, outTime: 18.5, copy: "UPGRADE\rYOUR LIVING.",     fontSize: 72, color: [1, 1, 1] }
        ];

        // 1. OUTRO SOLID & BRAND LOGO (Top Layer Hierarchy)
        // SFX_09_Sub_Brand_Outro
        var sfxSubLyr = comp.layers.add(itSubOutro);
        sfxSubLyr.name = "SFX_09_Sub_Brand_Outro";
        sfxSubLyr.startTime = outroStart;
        sfxSubLyr.inPoint = outroStart;
        sfxSubLyr.outPoint = compDuration;
        try { sfxSubLyr.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]); } catch(e) {}

        // ASSET_ZIGMA_LOGO
        var logoVectorLyr = comp.layers.add(itZigmaPdf);
        logoVectorLyr.name = "ASSET_ZIGMA_LOGO";
        logoVectorLyr.startTime = outroStart;
        logoVectorLyr.inPoint = outroStart;
        logoVectorLyr.outPoint = compDuration;
        logoVectorLyr.transform.position.setValue([540, 960, 0]);
        logoVectorLyr.transform.scale.setValue([52.7, 52.7, 100]);
        try { logoVectorLyr.collapseTransformation = true; } catch(e) {}

        // White Solid 1
        var whiteSolidLyr = comp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
        whiteSolidLyr.startTime = outroStart;
        whiteSolidLyr.inPoint = outroStart;
        whiteSolidLyr.outPoint = compDuration;
        whiteSolidLyr.transform.position.setValue([540, 960, 0]);

        // 2. PERSISTENT FOOTER URL (0.0s - 18.5s)
        var urlLyr = comp.layers.addText("www.zigmaelectricals.com");
        urlLyr.name = "www.zigmaelectricals.com";
        urlLyr.inPoint = 0.0;
        urlLyr.outPoint = outroStart;
        urlLyr.transform.position.setValue([540, 1845, 0]);
        var urlProp = urlLyr.property("ADBE Text Properties").property("ADBE Text Document");
        var urlDoc = urlProp.value;
        urlDoc.fontSize = 32;
        urlDoc.font = primaryFont;
        urlDoc.fillColor = [0.95, 0.95, 0.95];
        urlDoc.tracking = 40;
        urlDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        urlDoc.applyFill = true;
        urlProp.setValue(urlDoc);
        applyGlowAndShadow(urlLyr, true);

        // 3. PERSISTENT HEADER SWOOP LOGO (0.0s - 18.5s)
        // Placement STRICT: [254, 63], Scale: 65%
        var logoPlaceLyr = comp.layers.add(itLogoPlace);
        logoPlaceLyr.name = "Logo_place.psd";
        logoPlaceLyr.inPoint = 0.0;
        logoPlaceLyr.outPoint = outroStart;
        logoPlaceLyr.transform.position.setValue([254, 63, 0]);
        logoPlaceLyr.transform.scale.setValue([65, 65, 100]);

        // 4. CTA BUTTON (16.20s - 18.50s)
        var ctaBg = comp.layers.addShape();
        ctaBg.name = "CTA_BUTTON_BG";
        ctaBg.inPoint = 16.20;
        ctaBg.outPoint = outroStart;
        ctaBg.transform.position.setValue([540, 1620, 0]);

        var shapeGroup = ctaBg.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var shapeContents = shapeGroup.property("ADBE Vectors Group");
        var rect = shapeContents.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([380, 88]);
        rect.property("ADBE Vector Rect Roundness").setValue(24);

        var fill = shapeContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([0.10, 0.10, 0.12]);

        // Pop in scale animation
        var ctaScaleProp = ctaBg.property("Scale");
        ctaScaleProp.setValueAtTime(16.20, [0, 0, 100]);
        ctaScaleProp.setValueAtTime(16.50, [105, 105, 100]);
        ctaScaleProp.setValueAtTime(16.65, [100, 100, 100]);
        ctaScaleProp.expression = ctaPulseExpr;

        var ctaTxt = comp.layers.addText("Shop Now →");
        ctaTxt.name = "Shop Now →";
        ctaTxt.inPoint = 16.20;
        ctaTxt.outPoint = outroStart;

        var ctaDoc = ctaTxt.property("ADBE Text Properties").property("ADBE Text Document").value;
        ctaDoc.fontSize = 40;
        ctaDoc.font = primaryFont;
        ctaDoc.fillColor = [1, 1, 1];
        ctaDoc.tracking = 20;
        ctaDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        ctaTxt.property("ADBE Text Properties").property("ADBE Text Document").setValue(ctaDoc);
        ctaTxt.parent = ctaBg;
        ctaTxt.property("Position").setValue([0, 14, 0]);

        // 5. FEATURE TEXT CALLOUTS (Scenes 1 - 9)
        for (var s = 0; s < sceneTimeline.length; s++) {
            var sc = sceneTimeline[s];
            var calloutLyr = comp.layers.addText(sc.copy);
            calloutLyr.name = sc.copy.replace(/\r/g, " ");
            calloutLyr.inPoint = sc.inTime;
            calloutLyr.outPoint = sc.outTime;
            calloutLyr.transform.position.setValue([540, (s === 8 ? 440 : 480), 0]);

            var txtProp = calloutLyr.property("ADBE Text Properties").property("ADBE Text Document");
            var txtDoc = txtProp.value;
            txtDoc.fontSize = sc.fontSize;
            txtDoc.font = primaryFont;
            txtDoc.fillColor = sc.color;
            txtDoc.tracking = -30;
            txtDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            txtDoc.applyFill = true;
            txtProp.setValue(txtDoc);

            addWordRevealAnimation(calloutLyr, sc.inTime + 0.12, 0.75);
            calloutLyr.transform.position.expression = textFloatExpr;
            applyGlowAndShadow(calloutLyr, false);
        }

        // 6. VIDEO CUT LAYERS (Frames 1 to 9, sliced head-to-tail)
        for (var v = 0; v < videoItems.length; v++) {
            var vObj = videoItems[v];
            var sc = sceneTimeline[v];
            var vLyr = comp.layers.add(vObj.item);
            vLyr.name = "Frame " + (v + 1) + " - " + vObj.item.name;
            vLyr.startTime = sc.inTime;
            vLyr.inPoint = sc.inTime;
            vLyr.outPoint = sc.outTime;
            vLyr.transform.position.setValue([540, 960, 0]);
            vLyr.transform.scale.setValue([vObj.scale[0], vObj.scale[1], 100]);
            if (vLyr.hasAudio) {
                vLyr.audioEnabled = false;
            }
        }

        // 7. FOLEY SUITE (Synchronized to cuts)
        // SFX 1: Reveal Whoosh at Cut 1
        var sfx1 = comp.layers.add(itWhoosh0);
        sfx1.name = "SFX_01_Intro_Reveal_Whoosh";
        sfx1.startTime = 0.0;
        sfx1.inPoint = 0.0;
        sfx1.outPoint = 2.0;
        try { sfx1.property("Audio").property("Audio Levels").setValue([-4.0, -4.0]); } catch(e) {}

        // SFX 2: Cut 2 Fast Whoosh
        var sfx2 = comp.layers.add(itFastWhooshB);
        sfx2.name = "SFX_02_Cut2_Wipe";
        sfx2.startTime = 1.90;
        sfx2.inPoint = 1.90;
        sfx2.outPoint = 3.90;
        try { sfx2.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}

        // SFX 3: Cut 3 Whoosh
        var sfx3 = comp.layers.add(itFast4);
        sfx3.name = "SFX_03_Cut3_Wipe";
        sfx3.startTime = 3.90;
        sfx3.inPoint = 3.90;
        sfx3.outPoint = 5.90;
        try { sfx3.property("Audio").property("Audio Levels").setValue([-5.5, -5.5]); } catch(e) {}

        // SFX 4: Cut 4 Simple Whoosh
        var sfx4 = comp.layers.add(itSimpleWhoosh);
        sfx4.name = "SFX_04_Cut4_Wipe";
        sfx4.startTime = 5.90;
        sfx4.inPoint = 5.90;
        sfx4.outPoint = 7.90;
        try { sfx4.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}

        // SFX 5: Cut 5 Fast Whoosh
        var sfx5 = comp.layers.add(itFastWhooshB);
        sfx5.name = "SFX_05_Cut5_Wipe";
        sfx5.startTime = 7.90;
        sfx5.inPoint = 7.90;
        sfx5.outPoint = 9.90;
        try { sfx5.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}

        // SFX 6: Cut 6 Whoosh
        var sfx6 = comp.layers.add(itFast4);
        sfx6.name = "SFX_06_Cut6_Wipe";
        sfx6.startTime = 9.90;
        sfx6.inPoint = 9.90;
        sfx6.outPoint = 11.90;
        try { sfx6.property("Audio").property("Audio Levels").setValue([-5.5, -5.5]); } catch(e) {}

        // SFX 7: Cut 7 Simple Whoosh
        var sfx7 = comp.layers.add(itSimpleWhoosh);
        sfx7.name = "SFX_07_Cut7_Wipe";
        sfx7.startTime = 11.90;
        sfx7.inPoint = 11.90;
        sfx7.outPoint = 13.90;
        try { sfx7.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}

        // SFX 8: Cut 8 Tension Riser into CTA
        var sfx8 = comp.layers.add(itRiseHit);
        sfx8.name = "SFX_08_Tension_Riser";
        sfx8.startTime = 14.50;
        sfx8.inPoint = 14.50;
        sfx8.outPoint = 16.50;
        try { sfx8.property("Audio").property("Audio Levels").setValue([-4.0, -4.0]); } catch(e) {}

        // SFX 9: CTA Chime
        var sfxChime = comp.layers.add(itDoorbell);
        sfxChime.name = "SFX_CTA_Chime";
        sfxChime.startTime = 16.20;
        sfxChime.inPoint = 16.20;
        sfxChime.outPoint = 18.20;
        try { sfxChime.property("Audio").property("Audio Levels").setValue([-4.0, -4.0]); } catch(e) {}

        // 8. MASTER MUSIC TRACK (Bottom Layer)
        var musicLyr = comp.layers.add(itMusic);
        musicLyr.name = "Music_Bed_Corporate_Upbeat";
        musicLyr.startTime = 0.0;
        musicLyr.inPoint = 0.0;
        musicLyr.outPoint = compDuration;
        try {
            var audioProp = musicLyr.property("Audio").property("Audio Levels");
            audioProp.setValueAtTime(0.0, [-3.0, -3.0]);
            audioProp.setValueAtTime(18.3, [-3.0, -3.0]);
            audioProp.setValueAtTime(compDuration, [-45.0, -45.0]);
        } catch(e) {}

        // Save project file in active working directory
        var saveFile = new File("/Users/designdrop/Desktop/zigma/product/Zigma_White_Fan_Commercial.aep");
        proj.save(saveFile);
        l("Composition created successfully and project saved to: " + saveFile.fsName);

        // Write log file
        var logFile = new File("/Users/designdrop/Desktop/zigma/product/build_log.txt");
        logFile.open("w");
        logFile.write(log.join("\n"));
        logFile.close();

    } catch(globalErr) {
        var errFile = new File("/Users/designdrop/Desktop/zigma/product/build_error.txt");
        errFile.open("w");
        errFile.write("FATAL ERROR: " + globalErr.toString() + "\n" + (globalErr.line ? "Line: " + globalErr.line : ""));
        errFile.close();
    }
})();
