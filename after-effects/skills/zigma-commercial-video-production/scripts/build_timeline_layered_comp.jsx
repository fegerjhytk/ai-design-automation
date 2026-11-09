app.beginUndoGroup("Build Layer-over-Layer Comparison Comp (50% Stretched)");

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

        l("Assets ready.");

        // Remove old compare comps if exist
        var compName = "Zigma_Compare_Edit_Select_9-16";
        for (var i = proj.numItems; i >= 1; i--) {
            var item = proj.item(i);
            if (item instanceof CompItem) {
                if (item.name === compName || item.name === "Zigma_Side_By_Side_FullRes_2160x1920") {
                    item.remove();
                }
            }
        }

        // Master Duration: 15.0s footage (10s + 50% stretch) + 3.5s brand outro = 18.5s (444 frames @ 24fps)
        var compDuration = 18.5;
        var footageDuration = 15.0;
        var outroStart = 15.0;

        var comp = proj.items.addComp(compName, 1080, 1920, 1.0, compDuration, 24);
        comp.workAreaStart = 0.0;
        comp.workAreaDuration = compDuration;

        // Deep Glow 2 Helper
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

        // Word Kinetic Animator Helper
        function addWordAnimator(textLyr, startTime, animDur) {
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
                startProp.setValueAtTime(startTime + (animDur || 0.85), 100);

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

        // ==========================================
        // 1. OUTRO GROUP (Top of timeline)
        // ==========================================
        // Layer 1: Outro Sub Impact SFX
        var sfxSubOutroLyr = comp.layers.add(itSubOutro);
        sfxSubOutroLyr.name = "SFX_09_Sub_Brand_Outro";
        sfxSubOutroLyr.startTime = outroStart;
        sfxSubOutroLyr.inPoint = outroStart;
        sfxSubOutroLyr.outPoint = compDuration;
        try { sfxSubOutroLyr.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]); } catch(e) {}

        // Layer 2: Outro Vector Logo
        var outroLogoLyr = comp.layers.add(itZigmaPdf);
        outroLogoLyr.name = "ASSET_ZIGMA_LOGO";
        outroLogoLyr.startTime = outroStart;
        outroLogoLyr.inPoint = outroStart;
        outroLogoLyr.outPoint = compDuration;
        outroLogoLyr.transform.position.setValue([540, 960, 0]);
        outroLogoLyr.transform.scale.setValue([52.7, 52.7, 100]);
        try { outroLogoLyr.collapseTransformation = true; } catch(e) {}

        // Layer 3: Outro White Solid
        var whiteSolidLyr = comp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
        whiteSolidLyr.startTime = outroStart;
        whiteSolidLyr.inPoint = outroStart;
        whiteSolidLyr.outPoint = compDuration;
        whiteSolidLyr.transform.position.setValue([540, 960, 0]);
        whiteSolidLyr.transform.scale.setValue([100, 100, 100]);

        // ==========================================
        // 2. BRAND GRAPHICS (Header Swoop & URL Footer)
        // ==========================================
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

        // ==========================================
        // 3. CTA BUTTON (Retimed for 15.0s footage)
        // ==========================================
        var ctaEnterTime = 13.80; // During final 13.5s - 15.0s cut
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

        var ctaSc = ctaBgLyr.transform.scale;
        ctaSc.setValueAtTime(ctaEnterTime, [0, 0, 100]);
        ctaSc.setValueAtTime(ctaEnterTime + 0.22, [106, 106, 100]);
        ctaSc.setValueAtTime(ctaEnterTime + 0.35, [100, 100, 100]);

        ctaBgLyr.transform.scale.expression = 
            "var t = Math.max(0, time - " + (ctaEnterTime + 0.35).toFixed(2) + ");\n" +
            "var blend = Math.min(1.0, t / 0.5);\n" +
            "var s = Math.sin(t * 3.2) * 1.8 * blend;\n" +
            "[value[0] + s, value[1] + s];";

        // ==========================================
        // 4. RETIMED TEXT CALLOUTS (50% Stretched: 15.0s Total)
        // ==========================================
        var callouts = [
            { name: "COMFORT.", text: "COMFORT.", inT: 0.0, outT: 3.0, pos: [540, 520], fontSize: 76, color: [1.0, 1.0, 1.0], tracking: -40, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "WARMTH.", text: "WARMTH.", inT: 3.0, outT: 6.0, pos: [540, 520], fontSize: 76, color: [1.0, 0.65, 0.25], tracking: -40, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "Safety Assurance", text: "Safety\rAssurance", inT: 6.0, outT: 7.5, pos: [280, 540], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Cool Touch Body", text: "Cool Touch\rBody", inT: 7.5, outT: 9.0, pos: [800, 880], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Silent Operation", text: "Silent\rOperation", inT: 9.0, outT: 10.5, pos: [260, 960], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.LEFT_JUSTIFY },
            { name: "Long Cord", text: "Long Cord", inT: 10.5, outT: 12.0, pos: [800, 1160], fontSize: 54, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.RIGHT_JUSTIFY },
            { name: "Built to last the season.", text: "Built to last\rthe season.", inT: 12.0, outT: 13.5, pos: [540, 480], fontSize: 64, color: [1.0, 0.88, 0.70], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY },
            { name: "One dial. That's it.", text: "One dial.\rThat's it.", inT: 13.5, outT: 15.0, pos: [540, 460], fontSize: 68, color: [1.0, 1.0, 1.0], tracking: -30, justification: ParagraphJustification.CENTER_JUSTIFY }
        ];

        for (var c = 0; c < callouts.length; c++) {
            var co = callouts[c];
            var tLyr = comp.layers.addText(co.text);
            tLyr.name = co.name;
            tLyr.inPoint = co.inT + 0.08;
            tLyr.outPoint = co.outT;
            tLyr.transform.position.setValue([co.pos[0], co.pos[1], 0]);

            var tDoc = tLyr.property("Source Text").value;
            tDoc.font = "Helvetica-Bold";
            tDoc.fontSize = co.fontSize || 54;
            tDoc.fillColor = co.color || [1, 1, 1];
            tDoc.applyFill = true;
            tDoc.tracking = co.tracking || -30;
            tDoc.justification = co.justification || ParagraphJustification.LEFT_JUSTIFY;
            tLyr.property("Source Text").setValue(tDoc);

            addWordAnimator(tLyr, co.inT + 0.08, 0.90);
            applyDeepGlow(tLyr, false);

            tLyr.transform.position.expression =
                "var t = Math.max(0, time - inPoint);\n" +
                "var blend = Math.min(1.0, t / 0.4);\n" +
                "var seed = index * 1.45;\n" +
                "var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;\n" +
                "var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;\n" +
                "value + [xW, yW, 0];";
        }

        // =========================================================================
        // 5. THE VIDEO CUTS: LAYER-OVER-LAYER (50% Stretched = 15.0s Total)
        // For each scene:
        //   - Top Layer: Cut N - V2 (Take B / Storyboard)
        //   - Layer Below: Cut N - Desktop (Take A / Original)
        // Both are FULL SCREEN 1080x1920 ([540, 960], 100% scale).
        // User views top layer, toggles eyeball to view bottom layer, and can edit or delete!
        // =========================================================================
        var cuts = [
            { id: 1, name: "Frame 1", inT: 0.0, outT: 3.0 },
            { id: 2, name: "Frame 2", inT: 3.0, outT: 6.0 },
            { id: 3, name: "Frame 3", inT: 6.0, outT: 7.5 },
            { id: 4, name: "Frame 4", inT: 7.5, outT: 9.0 },
            { id: 5, name: "Frame 5", inT: 9.0, outT: 10.5 },
            { id: 6, name: "Frame 6", inT: 10.5, outT: 12.0 },
            { id: 7, name: "Frame 7", inT: 12.0, outT: 13.5 },
            { id: 8, name: "Frame 8", inT: 13.5, outT: 15.0 }
        ];

        for (var k = 0; k < cuts.length; k++) {
            var ct = cuts[k];

            // 1. Top Layer: V2 Take (Storyboard)
            var v2Lyr = comp.layers.add(itFootageV2);
            v2Lyr.name = "Cut " + ct.id + " - V2 Take [" + ct.inT + "s-" + ct.outT + "s]";
            v2Lyr.stretch = 150; // 150% stretch = 50% longer
            v2Lyr.startTime = 0.0;
            v2Lyr.inPoint = ct.inT;
            v2Lyr.outPoint = ct.outT;
            v2Lyr.transform.position.setValue([540, 960, 0]);
            v2Lyr.transform.scale.setValue([100, 100, 100]);
            if (v2Lyr.hasAudio) v2Lyr.audioEnabled = false;

            // 2. Layer Below: Desktop Take (Original)
            var deskLyr = comp.layers.add(itFootageDesk);
            deskLyr.name = "Cut " + ct.id + " - Desktop Take [" + ct.inT + "s-" + ct.outT + "s]";
            deskLyr.stretch = 150; // 150% stretch = 50% longer
            deskLyr.startTime = 0.0;
            deskLyr.inPoint = ct.inT;
            deskLyr.outPoint = ct.outT;
            deskLyr.transform.position.setValue([540, 960, 0]);
            deskLyr.transform.scale.setValue([100, 100, 100]);
            if (deskLyr.hasAudio) deskLyr.audioEnabled = false;
        }

        // ==========================================
        // 6. RETIMED FOLEY SFX SUITE
        // ==========================================
        var foleySuite = [
            { item: itDoorbell, name: "SFX_08_CTA_Chime", inT: ctaEnterTime - 0.03, outT: outroStart, lvl: -4.0 },
            { item: itRiseHit, name: "SFX_07_Climax_Riser_Hit", inT: 12.0, outT: 14.5, lvl: -4.0 },
            { item: itFastWhooshB, name: "SFX_06_Cut6_Swoosh", inT: 10.5 - 0.05, outT: 11.5, lvl: -6.0 },
            { item: itRise0, name: "SFX_05_Cut5_Swoosh", inT: 9.0 - 0.05, outT: 10.0, lvl: -6.0 },
            { item: itSimpleWhoosh, name: "SFX_04_Cut4_Swoosh", inT: 7.5 - 0.05, outT: 8.5, lvl: -6.0 },
            { item: itFast4, name: "SFX_03_Cut3_Swoosh", inT: 6.0 - 0.05, outT: 7.0, lvl: -5.0 },
            { item: itFastWhooshB, name: "SFX_02_Cut2_Swoosh", inT: 3.0 - 0.05, outT: 4.0, lvl: -5.0 },
            { item: itWhoosh0, name: "SFX_01_Intro_Reveal_Swoosh", inT: 0.0, outT: 1.8, lvl: -4.0 }
        ];

        for (var fi = 0; fi < foleySuite.length; fi++) {
            var fxS = foleySuite[fi];
            var sLyr = comp.layers.add(fxS.item);
            sLyr.name = fxS.name;
            sLyr.startTime = fxS.inT;
            sLyr.inPoint = fxS.inT;
            sLyr.outPoint = fxS.outT;
            try { sLyr.property("Audio").property("Audio Levels").setValue([fxS.lvl, fxS.lvl]); } catch(e) {}
        }

        // ==========================================
        // 7. RETIMED MASTER MUSIC BED (0.0s – 18.5s)
        // ==========================================
        var musicLyr = comp.layers.add(itMusic);
        musicLyr.name = "Music_Bed_Quartz_Heater";
        musicLyr.startTime = 0.0;
        musicLyr.inPoint = 0.0;
        musicLyr.outPoint = compDuration;
        try {
            var alvl = musicLyr.property("Audio").property("Audio Levels");
            alvl.setValueAtTime(0.0, [-3.0, -3.0]);
            alvl.setValueAtTime(outroStart - 0.2, [-3.0, -3.0]);
            alvl.setValueAtTime(compDuration, [-45.0, -45.0]);
        } catch(e) {}

        // Open in viewer & set time to 0
        comp.openInViewer();
        comp.time = 0.0;

        // Save project
        proj.save();

        var resFile = new File("/tmp/build_layered_comp_log.txt");
        resFile.open("w");
        resFile.write("SUCCESS: " + compName + " built with " + comp.numLayers + " layers, 18.50s duration, 150% stretch.");
        resFile.close();

    } catch(err) {
        var resFile = new File("/tmp/build_layered_comp_log.txt");
        resFile.open("w");
        resFile.write("ERROR: " + err.toString() + " at line " + err.line);
        resFile.close();
    }
})();

app.endUndoGroup();
