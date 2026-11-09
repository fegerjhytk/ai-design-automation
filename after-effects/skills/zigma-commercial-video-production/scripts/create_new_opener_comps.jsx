app.beginUndoGroup("Create New Start-Opener Comps (/zigma-start-opener-video)");

(function() {
    var log = [];
    function l(msg) { log.push(msg); }

    try {
        var proj = app.project;
        if (!proj) throw new Error("No project open");

        var footageDir = "/Users/designdrop/Desktop/zigma/product/(Footage)";
        var audioDir = footageDir + "/Audio";

        // Helper: Find or import footage item
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

        // 1. Get Assets
        var itFootageV2 = getOrImportItem(footageDir + "/Zigma_Quartz_Heater_v2_10s.mp4", "Zigma_Quartz_Heater_v2_10s.mp4");
        var itFootageDesk = getOrImportItem(footageDir + "/Zigma_Quartz_Heater_10s.mp4", "Zigma_Quartz_Heater_10s.mp4");
        var itLogoPlace = getOrImportItem(footageDir + "/Logo_place.psd", "Logo_place.psd");
        var itZigmaPdf = getOrImportItem(footageDir + "/ZIGMA LOGO.pdf", "ZIGMA LOGO.pdf");
        var itSubOutro = getOrImportItem(audioDir + "/SFX_05_Cinematic_Sub_Outro.wav", "SFX_05_Cinematic_Sub_Outro.wav");
        var itMusic = getOrImportItem(audioDir + "/Funk_Alternative.mp3", "Funk_Alternative.mp3");

        var itWhoosh0 = getOrImportItem(audioDir + "/WHOOSH 0.wav", "WHOOSH 0.wav");
        var itFastWhooshB = getOrImportItem(audioDir + "/14 Fast Whoosh B.wav", "14 Fast Whoosh B.wav");
        var itFast4 = getOrImportItem(audioDir + "/4 fast whooshes.wav", "4 fast whooshes.wav");
        var itSimpleWhoosh = getOrImportItem(audioDir + "/17 Simple_Whoosh.wav", "17 Simple_Whoosh.wav");
        var itRise0 = getOrImportItem(audioDir + "/WHOOSH 2 (RISE TO 0).wav", "WHOOSH 2 (RISE TO 0).wav");
        var itRiseHit = getOrImportItem(audioDir + "/WHOOSH (RISE TO HIT).wav", "WHOOSH (RISE TO HIT).wav");
        var itDoorbell = getOrImportItem(audioDir + "/Doorbell.wav", "Doorbell.wav");

        l("All assets verified and imported.");

        // Helper function to build a complete start-opener comp
        function buildStartOpenerComp(compName, footageItem, scenes, ctaEnterTime) {
            // Remove old comp if exists
            for (var i = proj.numItems; i >= 1; i--) {
                if (proj.item(i) instanceof CompItem && proj.item(i).name === compName) {
                    proj.item(i).remove();
                }
            }

            // Total duration: 10.0s footage + 3.5s outro = 13.5s (324 frames @ 24fps)
            var comp = proj.items.addComp(compName, 1080, 1920, 1.0, 13.5, 24);
            comp.workAreaStart = 0.0;
            comp.workAreaDuration = 13.5;

            var footageDuration = 10.0;
            var outroStart = 10.0;
            var compEnd = 13.5;

            // Helper: Apply Deep Glow 2
            function applyDeepGlow(lyr, isUrl) {
                try {
                    var fx = lyr.property("ADBE Effect Parade").addProperty("PEDG2");
                    if (fx) {
                        try {
                            fx.property(23).setValue(35); // Radius = 35
                            fx.property(24).setValue(isUrl ? 0.20 : 0.245); // Exposure
                        } catch(e) {}
                    }
                } catch(e) {}
                try {
                    var ds = lyr.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
                    if (ds) {
                        ds.property("Shadow Opacity").setValue(190);
                        ds.property("Distance").setValue(0);
                        ds.property("Softness").setValue(20);
                    }
                } catch(e) {}
            }

            // Helper: Add Word Kinetic Animator
            function addWordAnimator(textLyr, startTime) {
                try {
                    var textProp = textLyr.property("ADBE Text Properties");
                    var animators = textProp.property("ADBE Text Animators");
                    var anim = animators.addProperty("ADBE Text Animator");
                    anim.name = "Kinetic Word Reveal";

                    var selectors = anim.property("ADBE Text Selectors");
                    var selector = selectors.addProperty("ADBE Text Selector");
                    var adv = selector.property("ADBE Text Range Advanced");
                    adv.property("ADBE Text Range Type2").setValue(3); // Based On: Words

                    var startProp = selector.property("ADBE Text Percent Start");
                    startProp.setValueAtTime(startTime, 0);
                    startProp.setValueAtTime(startTime + 0.80, 100);

                    var easeIn = new KeyframeEase(0, 35);
                    var easeOut = new KeyframeEase(0, 85);
                    startProp.setTemporalEaseAtKey(1, [easeIn]);
                    startProp.setTemporalEaseAtKey(2, [easeOut]);

                    var animProps = anim.property("ADBE Text Animator Properties");
                    var posProp = animProps.addProperty("ADBE Text Position 3D");
                    posProp.setValue([0, 25, 0]);

                    var blurProp = animProps.addProperty("ADBE Text Blur");
                    blurProp.setValue([20, 20]);
                } catch(e) {}
            }

            // 1. Outro Solid & Logo (Top Stacking)
            // Layer 1: Outro Sub Impact SFX
            var sfxSubOutroLyr = comp.layers.add(itSubOutro);
            sfxSubOutroLyr.name = "SFX_09_Sub_Brand_Outro";
            sfxSubOutroLyr.startTime = outroStart;
            sfxSubOutroLyr.inPoint = outroStart;
            sfxSubOutroLyr.outPoint = compEnd;
            try {
                sfxSubOutroLyr.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]);
            } catch(e) {}

            // Layer 2: Outro Vector Logo
            var outroLogoLyr = comp.layers.add(itZigmaPdf);
            outroLogoLyr.name = "ASSET_ZIGMA_LOGO";
            outroLogoLyr.startTime = outroStart;
            outroLogoLyr.inPoint = outroStart;
            outroLogoLyr.outPoint = compEnd;
            outroLogoLyr.transform.position.setValue([540, 960, 0]);
            outroLogoLyr.transform.scale.setValue([52.7, 52.7, 100]);
            try { outroLogoLyr.collapseTransformation = true; } catch(e) {}

            // Layer 3: Outro White Solid
            var whiteSolidLyr = comp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
            whiteSolidLyr.startTime = outroStart;
            whiteSolidLyr.inPoint = outroStart;
            whiteSolidLyr.outPoint = compEnd;
            whiteSolidLyr.transform.position.setValue([540, 960, 0]);
            whiteSolidLyr.transform.scale.setValue([100, 100, 100]);

            // Layer 4: Footer URL
            var urlLyr = comp.layers.addText("www.zigmaelectricals.com");
            urlLyr.name = "www.zigmaelectricals.com";
            urlLyr.inPoint = 0.0;
            urlLyr.outPoint = outroStart;
            urlLyr.transform.position.setValue([540, 1845, 0]);
            var urlDoc = urlLyr.property("Source Text").value;
            urlDoc.font = "Helvetica-Bold";
            urlDoc.fontSize = 32;
            urlDoc.fillColor = [0.95, 0.95, 0.95];
            urlDoc.applyFill = true;
            urlDoc.tracking = 40;
            urlDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            urlLyr.property("Source Text").setValue(urlDoc);
            applyDeepGlow(urlLyr, true);

            // Layer 5: Top-Left Header Swoop (Logo_place.psd)
            var headerLyr = comp.layers.add(itLogoPlace);
            headerLyr.name = "Logo_place.psd";
            headerLyr.inPoint = 0.0;
            headerLyr.outPoint = outroStart;
            headerLyr.transform.position.setValue([254.3, 63.0, 0]);
            headerLyr.transform.scale.setValue([62, 62, 100]);

            // Layer 6: CTA Button Text
            var ctaTextLyr = comp.layers.addText("Shop Now →");
            ctaTextLyr.name = "Shop Now →";
            ctaTextLyr.inPoint = ctaEnterTime;
            ctaTextLyr.outPoint = outroStart;
            var ctaDoc = ctaTextLyr.property("Source Text").value;
            ctaDoc.font = "Helvetica-Bold";
            ctaDoc.fontSize = 42;
            ctaDoc.fillColor = [1, 1, 1];
            ctaDoc.applyFill = true;
            ctaDoc.tracking = 20;
            ctaDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            ctaTextLyr.property("Source Text").setValue(ctaDoc);

            // Layer 7: CTA Button Shape
            var ctaBgLyr = comp.layers.addShape();
            ctaBgLyr.name = "CTA_BUTTON_BG";
            ctaBgLyr.inPoint = ctaEnterTime;
            ctaBgLyr.outPoint = outroStart;
            ctaBgLyr.transform.position.setValue([540, 1680, 0]);

            var grp = ctaBgLyr.property("Contents").addProperty("ADBE Vector Group");
            grp.name = "CTA Box";
            var rect = grp.property("Contents").addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue([480, 105]);
            rect.property("Roundness").setValue(52);
            var fill = grp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue([1.0, 0.55, 0.10]); // Amber #FF8C1A
            applyDeepGlow(ctaBgLyr, false);

            ctaTextLyr.parent = ctaBgLyr;
            ctaTextLyr.transform.position.setValue([0, 14, 0]);

            // CTA Scale Entrance Pop
            var ctaSc = ctaBgLyr.transform.scale;
            ctaSc.setValueAtTime(ctaEnterTime, [0, 0, 100]);
            ctaSc.setValueAtTime(ctaEnterTime + 0.22, [106, 106, 100]);
            ctaSc.setValueAtTime(ctaEnterTime + 0.35, [100, 100, 100]);

            // CTA Pulse Expression
            ctaBgLyr.transform.scale.expression = 
                "var t = Math.max(0, time - " + (ctaEnterTime + 0.35).toFixed(2) + ");\n" +
                "var blend = Math.min(1.0, t / 0.5);\n" +
                "var s = Math.sin(t * 3.2) * 1.8 * blend;\n" +
                "[value[0] + s, value[1] + s];";

            // Layer 8..N: Scene Text Callouts
            for (var s = 0; s < scenes.length; s++) {
                var sc = scenes[s];
                var tLyr = comp.layers.addText(sc.text);
                tLyr.name = sc.name;
                tLyr.inPoint = sc.inT + 0.08;
                tLyr.outPoint = sc.outT;
                tLyr.transform.position.setValue([sc.pos[0], sc.pos[1], 0]);

                var tDoc = tLyr.property("Source Text").value;
                tDoc.font = "Helvetica-Bold";
                tDoc.fontSize = sc.fontSize || 54;
                tDoc.fillColor = sc.color || [1, 1, 1];
                tDoc.applyFill = true;
                tDoc.tracking = sc.tracking || -30;
                tDoc.justification = sc.justification || ParagraphJustification.LEFT_JUSTIFY;
                tLyr.property("Source Text").setValue(tDoc);

                addWordAnimator(tLyr, sc.inT + 0.08);
                applyDeepGlow(tLyr, false);

                // Buoyant drift expression
                tLyr.transform.position.expression =
                    "var t = Math.max(0, time - inPoint);\n" +
                    "var blend = Math.min(1.0, t / 0.4);\n" +
                    "var seed = index * 1.45;\n" +
                    "var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;\n" +
                    "var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;\n" +
                    "value + [xW, yW, 0];";
            }

            // Layer N+1..M: Video Cuts
            for (var c = 0; c < scenes.length; c++) {
                var cut = scenes[c];
                var vLyr = comp.layers.add(footageItem);
                vLyr.name = "Frame " + (c + 1);
                vLyr.startTime = 0.0;
                vLyr.inPoint = cut.inT;
                vLyr.outPoint = cut.outT;
                vLyr.transform.position.setValue([540, 960, 0]);
                vLyr.transform.scale.setValue([100, 100, 100]);
            }

            // Foley SFX Layers
            var foleySuite = [
                { item: itDoorbell, name: "SFX_08_CTA_Chime", inT: ctaEnterTime - 0.03, outT: outroStart, lvl: -4.0 },
                { item: itRiseHit, name: "SFX_07_Climax_Riser_Hit", inT: scenes[scenes.length - 2].inT, outT: scenes[scenes.length - 1].inT + 0.5, lvl: -4.0 },
                { item: itFastWhooshB, name: "SFX_06_Cut6_Swoosh", inT: scenes[5].inT - 0.05, outT: scenes[5].inT + 0.9, lvl: -6.0 },
                { item: itRise0, name: "SFX_05_Cut5_Swoosh", inT: scenes[4].inT - 0.05, outT: scenes[4].inT + 0.9, lvl: -6.0 },
                { item: itSimpleWhoosh, name: "SFX_04_Cut4_Swoosh", inT: scenes[3].inT - 0.05, outT: scenes[3].inT + 0.9, lvl: -6.0 },
                { item: itFast4, name: "SFX_03_Cut3_Swoosh", inT: scenes[2].inT - 0.05, outT: scenes[2].inT + 0.9, lvl: -5.0 },
                { item: itFastWhooshB, name: "SFX_02_Cut2_Swoosh", inT: scenes[1].inT - 0.05, outT: scenes[1].inT + 0.9, lvl: -5.0 },
                { item: itWhoosh0, name: "SFX_01_Intro_Reveal_Swoosh", inT: 0.0, outT: 1.5, lvl: -4.0 }
            ];

            for (var fi = 0; fi < foleySuite.length; fi++) {
                var fxS = foleySuite[fi];
                var sLyr = comp.layers.add(fxS.item);
                sLyr.name = fxS.name;
                sLyr.startTime = fxS.inT;
                sLyr.inPoint = fxS.inT;
                sLyr.outPoint = fxS.outT;
                try {
                    sLyr.property("Audio").property("Audio Levels").setValue([fxS.lvl, fxS.lvl]);
                } catch(e) {}
            }

            // Master Music Bed (Bottom)
            var musicLyr = comp.layers.add(itMusic);
            musicLyr.name = "Music_Bed_Quartz_Heater";
            musicLyr.startTime = 0.0;
            musicLyr.inPoint = 0.0;
            musicLyr.outPoint = compEnd;
            try {
                var alvl = musicLyr.property("Audio").property("Audio Levels");
                alvl.setValueAtTime(0.0, [-3.0, -3.0]);
                alvl.setValueAtTime(outroStart - 0.1, [-3.0, -3.0]);
                alvl.setValueAtTime(compEnd, [-45.0, -45.0]);
            } catch(e) {}

            l("Composition \"" + compName + "\" built successfully with " + comp.numLayers + " layers.");
            return comp;
        }

        // ==========================================
        // COMPOSITION 1: Zigma_Quartz_Heater_v2_Opener_9-16
        // (Using NEW 00:19 Storyboard Generation Video)
        // ==========================================
        var scenesV2 = [
            { name: "WARMTH.", text: "WARMTH.", inT: 0.0, outT: 1.0, pos: [540, 520], fontSize: 76, color: [1.0, 0.65, 0.25], tracking: -40, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "Instant Heating", text: "Instant\rHeating", inT: 1.0, outT: 2.0, pos: [540, 520], fontSize: 68, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "Safety Assurance", text: "Safety\rAssurance", inT: 2.0, outT: 3.0, pos: [780, 560], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Infrared Rods", text: "Infrared\rRods", inT: 3.0, outT: 5.0, pos: [280, 960], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Silent Operation", text: "Silent\rOperation", inT: 5.0, outT: 6.0, pos: [780, 960], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Cool Touch Body", text: "Cool Touch\rBody", inT: 6.0, outT: 7.0, pos: [280, 1160], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Built to last the season.", text: "Built to last\rthe season.", inT: 7.0, outT: 8.0, pos: [540, 480], fontSize: 64, color: [1.0, 0.88, 0.70], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "One dial. That's it.", text: "One dial.\rThat's it.", inT: 8.0, outT: 10.0, pos: [540, 460], fontSize: 68, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY }
        ];

        var compV2 = buildStartOpenerComp("Zigma_Quartz_Heater_v2_Opener_9-16", itFootageV2, scenesV2, 8.25);

        // ==========================================
        // COMPOSITION 2: Zigma_Quartz_Heater_10s_Opener_9-16
        // (Using Desktop Original Video at 100% normal speed)
        // ==========================================
        var scenesDesk = [
            { name: "COMFORT.", text: "COMFORT.", inT: 0.0, outT: 2.0, pos: [540, 520], fontSize: 76, color: [1.0, 1.0, 1.0], tracking: -40, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "WARMTH.", text: "WARMTH.", inT: 2.0, outT: 4.0, pos: [540, 520], fontSize: 76, color: [1.0, 0.65, 0.25], tracking: -40, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "Safety Assurance", text: "Safety\rAssurance", inT: 4.0, outT: 5.0, pos: [280, 540], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Cool Touch Body", text: "Cool Touch\rBody", inT: 5.0, outT: 6.0, pos: [800, 880], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Silent Operation", text: "Silent\rOperation", inT: 6.0, outT: 7.0, pos: [260, 960], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Long Cord", text: "Long Cord", inT: 7.0, outT: 8.0, pos: [800, 1160], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Built to last the season.", text: "Built to last\rthe season.", inT: 8.0, outT: 9.0, pos: [540, 480], fontSize: 64, color: [1.0, 0.88, 0.70], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "One dial. That's it.", text: "One dial.\rThat's it.", inT: 9.0, outT: 10.0, pos: [540, 460], fontSize: 68, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY }
        ];

        var compDesk = buildStartOpenerComp("Zigma_Quartz_Heater_10s_Opener_9-16", itFootageDesk, scenesDesk, 9.15);

        // Open Comp V2 in Viewer
        compV2.openInViewer();
        compV2.time = 0.0;

        // Save project
        proj.save();

        var resFile = new File("/tmp/build_new_comps_log.txt");
        resFile.open("w");
        resFile.write("SUCCESS:\n" + log.join("\n"));
        resFile.close();

    } catch(err) {
        var resFile = new File("/tmp/build_new_comps_log.txt");
        resFile.open("w");
        resFile.write("ERROR: " + err.toString() + " at line " + err.line + "\n" + log.join("\n"));
        resFile.close();
    }
})();

app.endUndoGroup();
