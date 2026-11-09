app.beginUndoGroup("Create Side-by-Side Comparison Comps");

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

        // Frame timing definitions (8 similar frames)
        var scenes = [
            { id: 1, name: "Frame 1: 0-2s (Ignition / Sweep)", inT: 0.0, outT: 2.0, deskDesc: "Empty Podium Sweep", v2Desc: "Dial Ignition & Heat Glow" },
            { id: 2, name: "Frame 2: 2-4s (Heater Reveal / Warming)", inT: 2.0, outT: 4.0, deskDesc: "Heater Cold Reveal", v2Desc: "Instant Heating Amber Glow" },
            { id: 3, name: "Frame 3: 4-5s (Safety Assurance)", inT: 4.0, outT: 5.0, deskDesc: "Safety Mesh Front", v2Desc: "Quartz Rods & Grill Close-up" },
            { id: 4, name: "Frame 4: 5-6s (Cool Touch Body)", inT: 5.0, outT: 6.0, deskDesc: "Cool Touch Housing", v2Desc: "Body Angle & Frame Detail" },
            { id: 5, name: "Frame 5: 6-7s (Silent Operation)", inT: 6.0, outT: 7.0, deskDesc: "Silent Operation Angle", v2Desc: "Thermal Heat Waves Undulation" },
            { id: 6, name: "Frame 6: 7-8s (Long Cord)", inT: 7.0, outT: 8.0, deskDesc: "Long Cord Base", v2Desc: "Base Stand & Cable" },
            { id: 7, name: "Frame 7: 8-9s (Hero Shot)", inT: 8.0, outT: 9.0, deskDesc: "Rotated Angle Glow", v2Desc: "Warm Glowing Perspective" },
            { id: 8, name: "Frame 8: 9-10s (Control Dial & CTA)", inT: 9.0, outT: 10.0, deskDesc: "Control Knob Push-in", v2Desc: "Macro Dial Push-in" }
        ];

        // =========================================================================
        // COMPOSITION 1: Zigma_Compare_Edit_Select_9-16 (1080 x 1920)
        // Interactive paired review: Side-by-side with auto-expand to full screen
        // =========================================================================
        var compName916 = "Zigma_Compare_Edit_Select_9-16";
        for (var i = proj.numItems; i >= 1; i--) {
            if (proj.item(i) instanceof CompItem && proj.item(i).name === compName916) {
                proj.item(i).remove();
            }
        }

        var comp916 = proj.items.addComp(compName916, 1080, 1920, 1.0, 13.5, 24);
        comp916.workAreaStart = 0.0;
        comp916.workAreaDuration = 13.5;

        // 1. Controller Null Layer
        var ctrlNull = comp916.layers.addNull();
        ctrlNull.name = "VIEW_CONTROLLER";
        ctrlNull.guideLayer = true;
        ctrlNull.inPoint = 0.0;
        ctrlNull.outPoint = 13.5;
        var cbEffect = ctrlNull.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
        cbEffect.name = "Side-by-Side Compare";
        cbEffect.property("Checkbox").setValue(1); // Default ON

        // 2. Guide Labels & Center Splitter
        var guideSplitter = comp916.layers.addSolid([1, 1, 1], "GUIDE_CENTER_SPLIT_LINE", 2, 1920, 1.0, 10.0);
        guideSplitter.guideLayer = true;
        guideSplitter.transform.position.setValue([540, 960, 0]);
        guideSplitter.transform.opacity.setValue(35);
        guideSplitter.transform.opacity.expression = 
            "var on = 1;\n" +
            "try { on = thisComp.layer(\"VIEW_CONTROLLER\").effect(\"Side-by-Side Compare\")(\"Checkbox\").value; } catch(e){}\n" +
            "on ? 35 : 0;";

        var guideLeft = comp916.layers.addText("LEFT: ORIGINAL (Desktop)");
        guideLeft.name = "GUIDE_LABEL_LEFT";
        guideLeft.guideLayer = true;
        guideLeft.inPoint = 0.0;
        guideLeft.outPoint = 10.0;
        guideLeft.transform.position.setValue([270, 175, 0]);
        var glDoc = guideLeft.property("Source Text").value;
        glDoc.font = "Helvetica-Bold";
        glDoc.fontSize = 24;
        glDoc.fillColor = [1.0, 0.70, 0.20]; // Warm Amber
        glDoc.applyFill = true;
        glDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        guideLeft.property("Source Text").setValue(glDoc);
        guideLeft.transform.opacity.expression = 
            "var on = 1;\n" +
            "try { on = thisComp.layer(\"VIEW_CONTROLLER\").effect(\"Side-by-Side Compare\")(\"Checkbox\").value; } catch(e){}\n" +
            "on ? 85 : 0;";

        var guideRight = comp916.layers.addText("RIGHT: NEW (V2 Storyboard)");
        guideRight.name = "GUIDE_LABEL_RIGHT";
        guideRight.guideLayer = true;
        guideRight.inPoint = 0.0;
        guideRight.outPoint = 10.0;
        guideRight.transform.position.setValue([810, 175, 0]);
        var grDoc = guideRight.property("Source Text").value;
        grDoc.font = "Helvetica-Bold";
        grDoc.fontSize = 24;
        grDoc.fillColor = [0.30, 0.85, 1.0]; // Cyan
        grDoc.applyFill = true;
        grDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        guideRight.property("Source Text").setValue(grDoc);
        guideRight.transform.opacity.expression = 
            "var on = 1;\n" +
            "try { on = thisComp.layer(\"VIEW_CONTROLLER\").effect(\"Side-by-Side Compare\")(\"Checkbox\").value; } catch(e){}\n" +
            "on ? 85 : 0;";

        // 3. Outro Group (10.0s - 13.5s)
        var sfxSubOutroLyr = comp916.layers.add(itSubOutro);
        sfxSubOutroLyr.name = "SFX_09_Sub_Brand_Outro";
        sfxSubOutroLyr.startTime = 10.0;
        sfxSubOutroLyr.inPoint = 10.0;
        sfxSubOutroLyr.outPoint = 13.5;
        try { sfxSubOutroLyr.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]); } catch(e) {}

        var outroLogoLyr = comp916.layers.add(itZigmaPdf);
        outroLogoLyr.name = "ASSET_ZIGMA_LOGO";
        outroLogoLyr.startTime = 10.0;
        outroLogoLyr.inPoint = 10.0;
        outroLogoLyr.outPoint = 13.5;
        outroLogoLyr.transform.position.setValue([540, 960, 0]);
        outroLogoLyr.transform.scale.setValue([52.7, 52.7, 100]);
        try { outroLogoLyr.collapseTransformation = true; } catch(e) {}

        var whiteSolidLyr = comp916.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, 3.5);
        whiteSolidLyr.startTime = 10.0;
        whiteSolidLyr.inPoint = 10.0;
        whiteSolidLyr.outPoint = 13.5;
        whiteSolidLyr.transform.position.setValue([540, 960, 0]);

        // 4. Brand Graphics (Top-left swoosh & footer URL)
        var headerLyr = comp916.layers.add(itLogoPlace);
        headerLyr.name = "Logo_place.psd";
        headerLyr.inPoint = 0.0;
        headerLyr.outPoint = 10.0;
        headerLyr.transform.position.setValue([254.3, 63.0, 0]);
        headerLyr.transform.scale.setValue([62, 62, 100]);

        var urlLyr = comp916.layers.addText("www.zigmaelectricals.com");
        urlLyr.name = "www.zigmaelectricals.com";
        urlLyr.inPoint = 0.0;
        urlLyr.outPoint = 10.0;
        urlLyr.transform.position.setValue([540, 1845, 0]);
        var urlDoc = urlLyr.property("Source Text").value;
        urlDoc.font = "Helvetica-Bold";
        urlDoc.fontSize = 32;
        urlDoc.fillColor = [0.95, 0.95, 0.95];
        urlDoc.applyFill = true;
        urlDoc.tracking = 40;
        urlDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        urlLyr.property("Source Text").setValue(urlDoc);

        // 5. CTA Button
        var ctaTextLyr = comp916.layers.addText("Shop Now →");
        ctaTextLyr.name = "Shop Now →";
        ctaTextLyr.inPoint = 9.0;
        ctaTextLyr.outPoint = 10.0;
        var ctaDoc = ctaTextLyr.property("Source Text").value;
        ctaDoc.font = "Helvetica-Bold";
        ctaDoc.fontSize = 42;
        ctaDoc.fillColor = [1, 1, 1];
        ctaDoc.applyFill = true;
        ctaDoc.tracking = 20;
        ctaDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        ctaTextLyr.property("Source Text").setValue(ctaDoc);

        var ctaBgLyr = comp916.layers.addShape();
        ctaBgLyr.name = "CTA_BUTTON_BG";
        ctaBgLyr.inPoint = 9.0;
        ctaBgLyr.outPoint = 10.0;
        ctaBgLyr.transform.position.setValue([540, 1680, 0]);
        var grp = ctaBgLyr.property("Contents").addProperty("ADBE Vector Group");
        grp.name = "CTA Box";
        var rect = grp.property("Contents").addProperty("ADBE Vector Shape - Rect");
        rect.property("Size").setValue([480, 105]);
        rect.property("Roundness").setValue(52);
        var fill = grp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([1.0, 0.55, 0.10]); // Amber #FF8C1A
        ctaTextLyr.parent = ctaBgLyr;
        ctaTextLyr.transform.position.setValue([0, 14, 0]);

        // 6. Paired Video Cut Layers (The 8 Similar Frames)
        // For each frame, we create:
        // - Right Layer: V2 Storyboard
        // - Left Layer: Desktop Original
        for (var s = 0; s < scenes.length; s++) {
            var sc = scenes[s];
            var rightName = "Cut " + sc.id + " - V2 (Right) [" + sc.inT + "s-" + sc.outT + "s]";
            var leftName = "Cut " + sc.id + " - Desktop (Left) [" + sc.inT + "s-" + sc.outT + "s]";

            // Right Layer (V2)
            var lyrR = comp916.layers.add(itFootageV2);
            lyrR.name = rightName;
            lyrR.startTime = 0.0;
            lyrR.inPoint = sc.inT;
            lyrR.outPoint = sc.outT;
            lyrR.transform.position.setValue([810, 960, 0]);
            lyrR.transform.scale.setValue([50, 50, 100]);

            lyrR.transform.position.expression = 
                "var partnerName = \"" + leftName + "\";\n" +
                "var p = [540, 960];\n" +
                "try {\n" +
                "    var ctrl = thisComp.layer(\"VIEW_CONTROLLER\");\n" +
                "    var sbsOn = ctrl.effect(\"Side-by-Side Compare\")(\"Checkbox\").value == 1;\n" +
                "    var partner = thisComp.layer(partnerName);\n" +
                "    if (sbsOn && partner && partner.enabled) {\n" +
                "        p = [810, 960];\n" +
                "    }\n" +
                "} catch(err) {\n" +
                "    p = [540, 960];\n" +
                "}\n" +
                "(value.length > 2) ? [p[0], p[1], value[2]] : [p[0], p[1]];";

            lyrR.transform.scale.expression = 
                "var partnerName = \"" + leftName + "\";\n" +
                "var s = [100, 100];\n" +
                "try {\n" +
                "    var ctrl = thisComp.layer(\"VIEW_CONTROLLER\");\n" +
                "    var sbsOn = ctrl.effect(\"Side-by-Side Compare\")(\"Checkbox\").value == 1;\n" +
                "    var partner = thisComp.layer(partnerName);\n" +
                "    if (sbsOn && partner && partner.enabled) {\n" +
                "        s = [50, 50];\n" +
                "    }\n" +
                "} catch(err) {\n" +
                "    s = [100, 100];\n" +
                "}\n" +
                "(value.length > 2) ? [s[0], s[1], value[2]] : [s[0], s[1]];";

            // Left Layer (Desktop)
            var lyrL = comp916.layers.add(itFootageDesk);
            lyrL.name = leftName;
            lyrL.startTime = 0.0;
            lyrL.inPoint = sc.inT;
            lyrL.outPoint = sc.outT;
            lyrL.transform.position.setValue([270, 960, 0]);
            lyrL.transform.scale.setValue([50, 50, 100]);

            lyrL.transform.position.expression = 
                "var partnerName = \"" + rightName + "\";\n" +
                "var p = [540, 960];\n" +
                "try {\n" +
                "    var ctrl = thisComp.layer(\"VIEW_CONTROLLER\");\n" +
                "    var sbsOn = ctrl.effect(\"Side-by-Side Compare\")(\"Checkbox\").value == 1;\n" +
                "    var partner = thisComp.layer(partnerName);\n" +
                "    if (sbsOn && partner && partner.enabled) {\n" +
                "        p = [270, 960];\n" +
                "    }\n" +
                "} catch(err) {\n" +
                "    p = [540, 960];\n" +
                "}\n" +
                "(value.length > 2) ? [p[0], p[1], value[2]] : [p[0], p[1]];";

            lyrL.transform.scale.expression = 
                "var partnerName = \"" + rightName + "\";\n" +
                "var s = [100, 100];\n" +
                "try {\n" +
                "    var ctrl = thisComp.layer(\"VIEW_CONTROLLER\");\n" +
                "    var sbsOn = ctrl.effect(\"Side-by-Side Compare\")(\"Checkbox\").value == 1;\n" +
                "    var partner = thisComp.layer(partnerName);\n" +
                "    if (sbsOn && partner && partner.enabled) {\n" +
                "        s = [50, 50];\n" +
                "    }\n" +
                "} catch(err) {\n" +
                "    s = [100, 100];\n" +
                "}\n" +
                "(value.length > 2) ? [s[0], s[1], value[2]] : [s[0], s[1]];";
        }

        // 7. Foley & Music Bed
        var foleySuite = [
            { item: itDoorbell, name: "SFX_08_CTA_Chime", inT: 9.0, outT: 10.0, lvl: -4.0 },
            { item: itRiseHit, name: "SFX_07_Climax_Riser_Hit", inT: 8.0, outT: 9.5, lvl: -4.0 },
            { item: itFastWhooshB, name: "SFX_06_Cut6_Swoosh", inT: 7.0 - 0.05, outT: 7.9, lvl: -6.0 },
            { item: itRise0, name: "SFX_05_Cut5_Swoosh", inT: 6.0 - 0.05, outT: 6.9, lvl: -6.0 },
            { item: itSimpleWhoosh, name: "SFX_04_Cut4_Swoosh", inT: 5.0 - 0.05, outT: 5.9, lvl: -6.0 },
            { item: itFast4, name: "SFX_03_Cut3_Swoosh", inT: 4.0 - 0.05, outT: 4.9, lvl: -5.0 },
            { item: itFastWhooshB, name: "SFX_02_Cut2_Swoosh", inT: 2.0 - 0.05, outT: 2.9, lvl: -5.0 },
            { item: itWhoosh0, name: "SFX_01_Intro_Reveal_Swoosh", inT: 0.0, outT: 1.5, lvl: -4.0 }
        ];

        for (var fi = 0; fi < foleySuite.length; fi++) {
            var fxS = foleySuite[fi];
            var sLyr = comp916.layers.add(fxS.item);
            sLyr.name = fxS.name;
            sLyr.startTime = fxS.inT;
            sLyr.inPoint = fxS.inT;
            sLyr.outPoint = fxS.outT;
            try { sLyr.property("Audio").property("Audio Levels").setValue([fxS.lvl, fxS.lvl]); } catch(e) {}
        }

        var musicLyr = comp916.layers.add(itMusic);
        musicLyr.name = "Music_Bed_Quartz_Heater";
        musicLyr.startTime = 0.0;
        musicLyr.inPoint = 0.0;
        musicLyr.outPoint = 13.5;
        try {
            var alvl = musicLyr.property("Audio").property("Audio Levels");
            alvl.setValueAtTime(0.0, [-3.0, -3.0]);
            alvl.setValueAtTime(9.8, [-3.0, -3.0]);
            alvl.setValueAtTime(13.5, [-45.0, -45.0]);
        } catch(e) {}

        l("Comp 1 built: " + compName916);

        // =========================================================================
        // COMPOSITION 2: Zigma_Side_By_Side_FullRes_2160x1920 (2160 x 1920)
        // Full resolution native pixel comparison (Left: Desktop 100%, Right: V2 100%)
        // =========================================================================
        var compName2160 = "Zigma_Side_By_Side_FullRes_2160x1920";
        for (var i = proj.numItems; i >= 1; i--) {
            if (proj.item(i) instanceof CompItem && proj.item(i).name === compName2160) {
                proj.item(i).remove();
            }
        }

        var comp2160 = proj.items.addComp(compName2160, 2160, 1920, 1.0, 13.5, 24);
        comp2160.workAreaStart = 0.0;
        comp2160.workAreaDuration = 13.5;

        // Divider
        var div2160 = comp2160.layers.addSolid([1, 1, 1], "DIVIDER_LINE", 3, 1920, 1.0, 13.5);
        div2160.transform.position.setValue([1080, 960, 0]);
        div2160.transform.opacity.setValue(40);

        // Headers
        var lblLeft2160 = comp2160.layers.addText("ORIGINAL FOOTAGE (Desktop Take)");
        lblLeft2160.inPoint = 0.0;
        lblLeft2160.outPoint = 13.5;
        lblLeft2160.transform.position.setValue([540, 120, 0]);
        var lDoc2160 = lblLeft2160.property("Source Text").value;
        lDoc2160.font = "Helvetica-Bold";
        lDoc2160.fontSize = 36;
        lDoc2160.fillColor = [1.0, 0.75, 0.25];
        lDoc2160.applyFill = true;
        lDoc2160.justification = ParagraphJustification.CENTER_JUSTIFY;
        lblLeft2160.property("Source Text").setValue(lDoc2160);

        var lblRight2160 = comp2160.layers.addText("NEW FOOTAGE (V2 Storyboard Take)");
        lblRight2160.inPoint = 0.0;
        lblRight2160.outPoint = 13.5;
        lblRight2160.transform.position.setValue([1620, 120, 0]);
        var rDoc2160 = lblRight2160.property("Source Text").value;
        rDoc2160.font = "Helvetica-Bold";
        rDoc2160.fontSize = 36;
        rDoc2160.fillColor = [0.35, 0.85, 1.0];
        rDoc2160.applyFill = true;
        rDoc2160.justification = ParagraphJustification.CENTER_JUSTIFY;
        lblRight2160.property("Source Text").setValue(rDoc2160);

        // Outro for 2160
        var outroLogoL = comp2160.layers.add(itZigmaPdf);
        outroLogoL.startTime = 10.0;
        outroLogoL.inPoint = 10.0;
        outroLogoL.outPoint = 13.5;
        outroLogoL.transform.position.setValue([540, 960, 0]);
        outroLogoL.transform.scale.setValue([52.7, 52.7, 100]);
        try { outroLogoL.collapseTransformation = true; } catch(e) {}

        var outroLogoR = comp2160.layers.add(itZigmaPdf);
        outroLogoR.startTime = 10.0;
        outroLogoR.inPoint = 10.0;
        outroLogoR.outPoint = 13.5;
        outroLogoR.transform.position.setValue([1620, 960, 0]);
        outroLogoR.transform.scale.setValue([52.7, 52.7, 100]);
        try { outroLogoR.collapseTransformation = true; } catch(e) {}

        var outroSolid2160 = comp2160.layers.addSolid([1, 1, 1], "White Solid Outro", 2160, 1920, 1.0, 3.5);
        outroSolid2160.startTime = 10.0;
        outroSolid2160.inPoint = 10.0;
        outroSolid2160.outPoint = 13.5;
        outroSolid2160.transform.position.setValue([1080, 960, 0]);

        // Sliced Cuts for 2160
        for (var s = 0; s < scenes.length; s++) {
            var sc = scenes[s];

            // Right: V2 (center [1620, 960])
            var cR = comp2160.layers.add(itFootageV2);
            cR.name = "V2_Cut_" + sc.id + " [" + sc.inT + "s-" + sc.outT + "s]";
            cR.startTime = 0.0;
            cR.inPoint = sc.inT;
            cR.outPoint = sc.outT;
            cR.transform.position.setValue([1620, 960, 0]);
            cR.transform.scale.setValue([100, 100, 100]);

            // Left: Desktop (center [540, 960])
            var cL = comp2160.layers.add(itFootageDesk);
            cL.name = "Desktop_Cut_" + sc.id + " [" + sc.inT + "s-" + sc.outT + "s]";
            cL.startTime = 0.0;
            cL.inPoint = sc.inT;
            cL.outPoint = sc.outT;
            cL.transform.position.setValue([540, 960, 0]);
            cL.transform.scale.setValue([100, 100, 100]);
        }

        // Music
        var m2160 = comp2160.layers.add(itMusic);
        m2160.name = "Music_Bed";
        m2160.startTime = 0.0;
        m2160.inPoint = 0.0;
        m2160.outPoint = 13.5;

        l("Comp 2 built: " + compName2160);

        // Open 9:16 Compare Comp in Viewer
        comp916.openInViewer();
        comp916.time = 0.0;

        // Save project
        proj.save();

        var resFile = new File("/tmp/compare_comp_log.txt");
        resFile.open("w");
        resFile.write("SUCCESS:\n" + log.join("\n"));
        resFile.close();

    } catch(err) {
        var resFile = new File("/tmp/compare_comp_log.txt");
        resFile.open("w");
        resFile.write("ERROR: " + err.toString() + " at line " + err.line + "\n" + log.join("\n"));
        resFile.close();
    }
})();

app.endUndoGroup();
