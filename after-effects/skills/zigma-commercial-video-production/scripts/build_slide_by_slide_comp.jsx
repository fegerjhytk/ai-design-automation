app.beginUndoGroup("Build Slide-by-Slide Timeline Comp (50% Stretched)");

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

        // Get Assets
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

        // Remove old compare comp if exists
        var compName = "Zigma_Compare_Edit_Select_9-16";
        for (var i = proj.numItems; i >= 1; i--) {
            var item = proj.item(i);
            if (item instanceof CompItem && item.name === compName) {
                item.remove();
            }
        }

        // Master Duration: 16 sequential slides (30.0s total) + 3.5s outro = 33.5s (804 frames @ 24fps)
        var compDuration = 33.5;
        var footageDuration = 30.0;
        var outroStart = 30.0;

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
                adv.property("ADBE Text Range Type2").setValue(3); // Words

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

        // 16 Sequential Slides Definition (Stretched 50% longer = 1.5x)
        var slides = [
            // Frame 1
            { id: 1, name: "Slide 01 - Frame 1 (Desktop Take)", item: itFootageDesk, srcIn: 0.0, srcOut: 2.0, compIn: 0.0, compOut: 3.0, text: "COMFORT.", tag: "TAKE 1: DESKTOP", pos: [540, 520], fontSize: 76, color: [1.0, 1.0, 1.0], align: ParagraphJustification.CENTER_JUSTIFY },
            { id: 2, name: "Slide 02 - Frame 1 (V2 Take)", item: itFootageV2, srcIn: 0.0, srcOut: 2.0, compIn: 3.0, compOut: 6.0, text: "WARMTH.", tag: "TAKE 2: V2 STORYBOARD", pos: [540, 520], fontSize: 76, color: [1.0, 0.65, 0.25], align: ParagraphJustification.CENTER_JUSTIFY },
            // Frame 2
            { id: 3, name: "Slide 03 - Frame 2 (Desktop Take)", item: itFootageDesk, srcIn: 2.0, srcOut: 4.0, compIn: 6.0, compOut: 9.0, text: "WARMTH.", tag: "TAKE 1: DESKTOP", pos: [540, 520], fontSize: 76, color: [1.0, 0.65, 0.25], align: ParagraphJustification.CENTER_JUSTIFY },
            { id: 4, name: "Slide 04 - Frame 2 (V2 Take)", item: itFootageV2, srcIn: 2.0, srcOut: 4.0, compIn: 9.0, compOut: 12.0, text: "Instant\rHeating", tag: "TAKE 2: V2 STORYBOARD", pos: [540, 520], fontSize: 68, color: [1.0, 1.0, 1.0], align: ParagraphJustification.CENTER_JUSTIFY },
            // Frame 3
            { id: 5, name: "Slide 05 - Frame 3 (Desktop Take)", item: itFootageDesk, srcIn: 4.0, srcOut: 5.0, compIn: 12.0, compOut: 13.5, text: "Safety\rAssurance", tag: "TAKE 1: DESKTOP", pos: [280, 540], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.LEFT_JUSTIFY },
            { id: 6, name: "Slide 06 - Frame 3 (V2 Take)", item: itFootageV2, srcIn: 4.0, srcOut: 5.0, compIn: 13.5, compOut: 15.0, text: "Safety\rAssurance", tag: "TAKE 2: V2 STORYBOARD", pos: [280, 540], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.LEFT_JUSTIFY },
            // Frame 4
            { id: 7, name: "Slide 07 - Frame 4 (Desktop Take)", item: itFootageDesk, srcIn: 5.0, srcOut: 6.0, compIn: 15.0, compOut: 16.5, text: "Cool Touch\rBody", tag: "TAKE 1: DESKTOP", pos: [800, 880], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.RIGHT_JUSTIFY },
            { id: 8, name: "Slide 08 - Frame 4 (V2 Take)", item: itFootageV2, srcIn: 5.0, srcOut: 6.0, compIn: 16.5, compOut: 18.0, text: "Cool Touch\rBody", tag: "TAKE 2: V2 STORYBOARD", pos: [800, 880], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.RIGHT_JUSTIFY },
            // Frame 5
            { id: 9, name: "Slide 09 - Frame 5 (Desktop Take)", item: itFootageDesk, srcIn: 6.0, srcOut: 7.0, compIn: 18.0, compOut: 19.5, text: "Silent\rOperation", tag: "TAKE 1: DESKTOP", pos: [260, 960], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.LEFT_JUSTIFY },
            { id: 10, name: "Slide 10 - Frame 5 (V2 Take)", item: itFootageV2, srcIn: 6.0, srcOut: 7.0, compIn: 19.5, compOut: 21.0, text: "Silent\rOperation", tag: "TAKE 2: V2 STORYBOARD", pos: [260, 960], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.LEFT_JUSTIFY },
            // Frame 6
            { id: 11, name: "Slide 11 - Frame 6 (Desktop Take)", item: itFootageDesk, srcIn: 7.0, srcOut: 8.0, compIn: 21.0, compOut: 22.5, text: "Long Cord", tag: "TAKE 1: DESKTOP", pos: [800, 1160], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.RIGHT_JUSTIFY },
            { id: 12, name: "Slide 12 - Frame 6 (V2 Take)", item: itFootageV2, srcIn: 7.0, srcOut: 8.0, compIn: 22.5, compOut: 24.0, text: "Long Cord", tag: "TAKE 2: V2 STORYBOARD", pos: [800, 1160], fontSize: 54, color: [1.0, 1.0, 1.0], align: ParagraphJustification.RIGHT_JUSTIFY },
            // Frame 7
            { id: 13, name: "Slide 13 - Frame 7 (Desktop Take)", item: itFootageDesk, srcIn: 8.0, srcOut: 9.0, compIn: 24.0, compOut: 25.5, text: "Built to last\rthe season.", tag: "TAKE 1: DESKTOP", pos: [540, 480], fontSize: 64, color: [1.0, 0.88, 0.70], align: ParagraphJustification.CENTER_JUSTIFY },
            { id: 14, name: "Slide 14 - Frame 7 (V2 Take)", item: itFootageV2, srcIn: 8.0, srcOut: 9.0, compIn: 25.5, compOut: 27.0, text: "Built to last\rthe season.", tag: "TAKE 2: V2 STORYBOARD", pos: [540, 480], fontSize: 64, color: [1.0, 0.88, 0.70], align: ParagraphJustification.CENTER_JUSTIFY },
            // Frame 8
            { id: 15, name: "Slide 15 - Frame 8 (Desktop Take)", item: itFootageDesk, srcIn: 9.0, srcOut: 10.0, compIn: 27.0, compOut: 28.5, text: "One dial.\rThat's it.", tag: "TAKE 1: DESKTOP", pos: [540, 460], fontSize: 68, color: [1.0, 1.0, 1.0], align: ParagraphJustification.CENTER_JUSTIFY },
            { id: 16, name: "Slide 16 - Frame 8 (V2 Take)", item: itFootageV2, srcIn: 9.0, srcOut: 10.0, compIn: 28.5, compOut: 30.0, text: "One dial.\rThat's it.", tag: "TAKE 2: V2 STORYBOARD", pos: [540, 460], fontSize: 68, color: [1.0, 1.0, 1.0], align: ParagraphJustification.CENTER_JUSTIFY }
        ];

        // 1. Build Outro Group
        var sfxSubOutroLyr = comp.layers.add(itSubOutro);
        sfxSubOutroLyr.name = "SFX_09_Sub_Brand_Outro";
        sfxSubOutroLyr.startTime = outroStart;
        sfxSubOutroLyr.inPoint = outroStart;
        sfxSubOutroLyr.outPoint = compDuration;
        try { sfxSubOutroLyr.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]); } catch(e) {}

        var outroLogoLyr = comp.layers.add(itZigmaPdf);
        outroLogoLyr.name = "ASSET_ZIGMA_LOGO";
        outroLogoLyr.startTime = outroStart;
        outroLogoLyr.inPoint = outroStart;
        outroLogoLyr.outPoint = compDuration;
        outroLogoLyr.transform.position.setValue([540, 960, 0]);
        outroLogoLyr.transform.scale.setValue([52.7, 52.7, 100]);
        try { outroLogoLyr.collapseTransformation = true; } catch(e) {}

        var whiteSolidLyr = comp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
        whiteSolidLyr.startTime = outroStart;
        whiteSolidLyr.inPoint = outroStart;
        whiteSolidLyr.outPoint = compDuration;
        whiteSolidLyr.transform.position.setValue([540, 960, 0]);

        // 2. Build Brand Header Swoop & URL Footer
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

        var headerLyr = comp.layers.add(itLogoPlace);
        headerLyr.name = "Logo_place.psd";
        headerLyr.inPoint = 0.0;
        headerLyr.outPoint = outroStart;
        headerLyr.transform.position.setValue([254.3, 63.0, 0]);
        headerLyr.transform.scale.setValue([62, 62, 100]);

        // 3. CTA Button (Enters at 28.8s in final Slide 16)
        var ctaEnter = 28.80;
        var ctaTextLyr = comp.layers.addText("Shop Now →");
        ctaTextLyr.name = "Shop Now →";
        ctaTextLyr.inPoint = ctaEnter;
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
        ctaBgLyr.inPoint = ctaEnter;
        ctaBgLyr.outPoint = outroStart;
        ctaBgLyr.transform.position.setValue([540, 1680, 0]);

        var grp = ctaBgLyr.property("Contents").addProperty("ADBE Vector Group");
        grp.name = "CTA Box";
        var rect = grp.property("Contents").addProperty("ADBE Vector Shape - Rect");
        rect.property("Size").setValue([480, 105]);
        rect.property("Roundness").setValue(52);
        var fill = grp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([1.0, 0.55, 0.10]);
        applyDeepGlow(ctaBgLyr, false);

        ctaTextLyr.parent = ctaBgLyr;
        ctaTextLyr.transform.position.setValue([0, 14, 0]);

        var ctaSc = ctaBgLyr.transform.scale;
        ctaSc.setValueAtTime(ctaEnter, [0, 0, 100]);
        ctaSc.setValueAtTime(ctaEnter + 0.22, [106, 106, 100]);
        ctaSc.setValueAtTime(ctaEnter + 0.35, [100, 100, 100]);

        ctaBgLyr.transform.scale.expression = 
            "var t = Math.max(0, time - " + (ctaEnter + 0.35).toFixed(2) + ");\n" +
            "var blend = Math.min(1.0, t / 0.5);\n" +
            "var s = Math.sin(t * 3.2) * 1.8 * blend;\n" +
            "[value[0] + s, value[1] + s];";

        // 4. Build Text Callouts for each Slide
        for (var s = 0; s < slides.length; s++) {
            var sld = slides[s];
            var tLyr = comp.layers.addText(sld.text);
            tLyr.name = "Text: " + sld.name;
            tLyr.inPoint = sld.compIn + 0.08;
            tLyr.outPoint = sld.compOut;
            tLyr.transform.position.setValue([sld.pos[0], sld.pos[1], 0]);

            var tDoc = tLyr.property("Source Text").value;
            tDoc.font = "Helvetica-Bold";
            tDoc.fontSize = sld.fontSize || 54;
            tDoc.fillColor = sld.color || [1, 1, 1];
            tDoc.applyFill = true;
            tDoc.tracking = -30;
            tDoc.justification = sld.align || ParagraphJustification.CENTER_JUSTIFY;
            tLyr.property("Source Text").setValue(tDoc);

            addWordAnimator(tLyr, sld.compIn + 0.08, 0.85);
            applyDeepGlow(tLyr, false);

            tLyr.transform.position.expression =
                "var t = Math.max(0, time - inPoint);\n" +
                "var blend = Math.min(1.0, t / 0.4);\n" +
                "var seed = index * 1.45;\n" +
                "var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;\n" +
                "var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;\n" +
                "value + [xW, yW, 0];";
        }

        // 5. Build the 16 Video Slides (STAIRCASE / SLIDE-BY-SLIDE TIMELINE)
        // Each slide starts exactly where the previous slide ends!
        for (var s = 0; s < slides.length; s++) {
            var sld = slides[s];
            var vLyr = comp.layers.add(sld.item);
            vLyr.name = sld.name;
            vLyr.stretch = 150; // 50% longer duration
            vLyr.startTime = sld.compIn - (sld.srcIn * 1.5);
            vLyr.inPoint = sld.compIn;
            vLyr.outPoint = sld.compOut;
            vLyr.transform.position.setValue([540, 960, 0]);
            vLyr.transform.scale.setValue([100, 100, 100]);
            if (vLyr.hasAudio) vLyr.audioEnabled = false;
        }

        // 6. Foley SFX Suite
        var foley = [
            { item: itDoorbell, name: "SFX_CTA_Chime", inT: ctaEnter - 0.03, outT: outroStart, lvl: -4.0 },
            { item: itRiseHit, name: "SFX_Climax_Riser_Hit", inT: 27.0, outT: 29.5, lvl: -4.0 },
            { item: itFastWhooshB, name: "SFX_Slide12_Swoosh", inT: 22.5 - 0.05, outT: 23.5, lvl: -6.0 },
            { item: itRise0, name: "SFX_Slide10_Swoosh", inT: 19.5 - 0.05, outT: 20.5, lvl: -6.0 },
            { item: itSimpleWhoosh, name: "SFX_Slide08_Swoosh", inT: 16.5 - 0.05, outT: 17.5, lvl: -6.0 },
            { item: itFast4, name: "SFX_Slide06_Swoosh", inT: 13.5 - 0.05, outT: 14.5, lvl: -5.0 },
            { item: itFastWhooshB, name: "SFX_Slide04_Swoosh", inT: 9.0 - 0.05, outT: 10.0, lvl: -5.0 },
            { item: itWhoosh0, name: "SFX_Slide02_Swoosh", inT: 3.0 - 0.05, outT: 4.0, lvl: -5.0 },
            { item: itWhoosh0, name: "SFX_Slide01_Intro", inT: 0.0, outT: 1.8, lvl: -4.0 }
        ];

        for (var fi = 0; fi < foley.length; fi++) {
            var fxS = foley[fi];
            var sLyr = comp.layers.add(fxS.item);
            sLyr.name = fxS.name;
            sLyr.startTime = fxS.inT;
            sLyr.inPoint = fxS.inT;
            sLyr.outPoint = fxS.outT;
            try { sLyr.property("Audio").property("Audio Levels").setValue([fxS.lvl, fxS.lvl]); } catch(e) {}
        }

        // 7. Master Music Bed
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

        // ==========================================
        // 8. STRICT LAYER STACKING REORDERING
        // Move from bottom (music) up to top (outro SFX)
        // ==========================================
        function findLayer(name) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === name) return comp.layer(j);
            }
            return null;
        }

        var order = [
            "SFX_09_Sub_Brand_Outro",
            "ASSET_ZIGMA_LOGO",
            "White Solid 1",
            "www.zigmaelectricals.com",
            "Logo_place.psd",
            "Shop Now →",
            "CTA_BUTTON_BG"
        ];

        // Text Callout layers
        for (var s = 0; s < slides.length; s++) {
            order.push("Text: " + slides[s].name);
        }

        // Video Slide layers (1 to 16 in order!)
        for (var s = 0; s < slides.length; s++) {
            order.push(slides[s].name);
        }

        // Foley SFX
        for (var fi = 0; fi < foley.length; fi++) {
            order.push(foley[fi].name);
        }

        order.push("Music_Bed_Quartz_Heater");

        // Reorder by moving from last to first
        for (var k = order.length - 1; k >= 0; k--) {
            var lyr = findLayer(order[k]);
            if (lyr) {
                lyr.moveToBeginning();
            }
        }

        // Open in viewer
        comp.openInViewer();
        comp.time = 0.0;

        // Save project
        proj.save();

        var resFile = new File("/tmp/build_slide_comp_log.txt");
        resFile.open("w");
        resFile.write("SUCCESS: " + compName + " built with " + comp.numLayers + " layers, 33.50s duration, slide-by-slide staircase timeline.");
        resFile.close();

    } catch(err) {
        var resFile = new File("/tmp/build_slide_comp_log.txt");
        resFile.open("w");
        resFile.write("ERROR: " + err.toString() + " at line " + err.line);
        resFile.close();
    }
})();

app.endUndoGroup();
