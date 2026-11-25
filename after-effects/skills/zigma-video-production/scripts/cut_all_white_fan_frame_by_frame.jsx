app.beginUndoGroup("Cut Each Video Frame by Frame & Place on Timeline (/zigma-start-opener-video)");

(function() {
    var log = [];
    function l(msg) { log.push(msg); }
    function logErr(msg) { log.push("ERROR: " + msg); }

    try {
        var proj = app.project;
        if (!proj) proj = app.newProject();

        var footageDir = "/Users/designdrop/Desktop/zigma/product/(Footage)";
        var audioDir = footageDir + "/Audio";

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

        // 1. Brand Assets & Audio
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

        // 2. Video Items
        var videoDef = [
            { id: 1, file: "White_Fan_01_Reveal_Hero.mp4", scale: [150, 150] },
            { id: 2, file: "White_Fan_02_Macro_Detail.mp4", scale: [150, 150] },
            { id: 3, file: "White_Fan_03_Aerodynamic_Spin.mp4", scale: [150, 150] },
            { id: 4, file: "White_Fan_04_Room_Scale.mp4", scale: [150, 150] },
            { id: 5, file: "White_Fan_05_Bottom_Up_Symmetry.mp4", scale: [150, 150] },
            { id: 6, file: "White_Fan_06_FHD_Push_In.mp4", scale: [177.78, 177.78] },
            { id: 7, file: "White_Fan_07_Architectural_Shadows.mp4", scale: [150, 150] },
            { id: 8, file: "White_Fan_08_Cinematic_Dolly.mp4", scale: [266.67, 266.67] },
            { id: 9, file: "White_Fan_09_Climax_Orbit.mp4", scale: [266.67, 266.67] }
        ];

        var videoItemMap = {};
        for (var v = 0; v < videoDef.length; v++) {
            var it = getOrImportItem(footageDir + "/" + videoDef[v].file, videoDef[v].file);
            videoItemMap[videoDef[v].id] = { item: it, scale: videoDef[v].scale, file: videoDef[v].file };
        }

        // 3. Complete 29 Cuts Definition (Exact Frame Boundaries)
        var cuts = [
            // Video 1: Reveal Hero (5 shots)
            { vidId: 1, shotId: 1, srcIn: 0.000, srcOut: 1.958, label: "Vid 1 Shot 1 - Start Stationary Upward" },
            { vidId: 1, shotId: 2, srcIn: 1.958, srcOut: 2.833, label: "Vid 1 Shot 2 - Slow Acceleration" },
            { vidId: 1, shotId: 3, srcIn: 2.833, srcOut: 6.000, label: "Vid 1 Shot 3 - Full Speed Spin" },
            { vidId: 1, shotId: 4, srcIn: 6.000, srcOut: 8.000, label: "Vid 1 Shot 4 - Warm Light Transition" },
            { vidId: 1, shotId: 5, srcIn: 8.000, srcOut: 10.000, label: "Vid 1 Shot 5 - Hero High Angle" },
            // Video 2: Macro Detail (1 continuous shot)
            { vidId: 2, shotId: 1, srcIn: 0.000, srcOut: 10.000, label: "Vid 2 Shot 1 - Macro Loop Bracket Tracking" },
            // Video 3: Aerodynamic Spin (1 continuous shot)
            { vidId: 3, shotId: 1, srcIn: 0.000, srcOut: 10.000, label: "Vid 3 Shot 1 - Dark Cove Aerodynamic Spin" },
            // Video 4: Room Scale (4 shots)
            { vidId: 4, shotId: 1, srcIn: 0.000, srcOut: 2.000, label: "Vid 4 Shot 1 - Upward Tilt Room View" },
            { vidId: 4, shotId: 2, srcIn: 2.000, srcOut: 4.375, label: "Vid 4 Shot 2 - Ceiling Height Perspective" },
            { vidId: 4, shotId: 3, srcIn: 4.375, srcOut: 7.417, label: "Vid 4 Shot 3 - Daylight Wall Joinery" },
            { vidId: 4, shotId: 4, srcIn: 7.417, srcOut: 10.000, label: "Vid 4 Shot 4 - High Angle Overview" },
            // Video 5: Bottom Up Symmetry (4 shots)
            { vidId: 5, shotId: 1, srcIn: 0.000, srcOut: 1.958, label: "Vid 5 Shot 1 - Symmetrical Center Angle" },
            { vidId: 5, shotId: 2, srcIn: 1.958, srcOut: 4.333, label: "Vid 5 Shot 2 - Blade Shadow Sweep" },
            { vidId: 5, shotId: 3, srcIn: 4.333, srcOut: 7.375, label: "Vid 5 Shot 3 - Warm Curtain Backlight" },
            { vidId: 5, shotId: 4, srcIn: 7.375, srcOut: 10.000, label: "Vid 5 Shot 4 - Low Angle Hero Hold" },
            // Video 6: FHD Push In (3 shots)
            { vidId: 6, shotId: 1, srcIn: 0.000, srcOut: 2.375, label: "Vid 6 Shot 1 - 1080p Wide Ceiling Room" },
            { vidId: 6, shotId: 2, srcIn: 2.375, srcOut: 6.333, label: "Vid 6 Shot 2 - 1080p Push-In on Hub" },
            { vidId: 6, shotId: 3, srcIn: 6.333, srcOut: 8.000, label: "Vid 6 Shot 3 - 1080p Detail Lock" },
            // Video 7: Architectural Shadows (5 shots)
            { vidId: 7, shotId: 1, srcIn: 0.000, srcOut: 1.958, label: "Vid 7 Shot 1 - Morning Sun Beam Tilt" },
            { vidId: 7, shotId: 2, srcIn: 1.958, srcOut: 3.958, label: "Vid 7 Shot 2 - Diagonal Ceiling Shadows" },
            { vidId: 7, shotId: 3, srcIn: 3.958, srcOut: 6.000, label: "Vid 7 Shot 3 - Downrod Junction View" },
            { vidId: 7, shotId: 4, srcIn: 6.000, srcOut: 8.000, label: "Vid 7 Shot 4 - High Contrast Lighting" },
            { vidId: 7, shotId: 5, srcIn: 8.000, srcOut: 10.000, label: "Vid 7 Shot 5 - Clean Ceiling Hold" },
            // Video 8: Cinematic Dolly (2 shots)
            { vidId: 8, shotId: 1, srcIn: 0.000, srcOut: 7.417, label: "Vid 8 Shot 1 - Horizontal Dolly Track" },
            { vidId: 8, shotId: 2, srcIn: 7.417, srcOut: 10.000, label: "Vid 8 Shot 2 - Room Raking Light Track" },
            // Video 9: Climax Orbit (4 shots)
            { vidId: 9, shotId: 1, srcIn: 0.000, srcOut: 2.000, label: "Vid 9 Shot 1 - Orbital Camera Drift" },
            { vidId: 9, shotId: 2, srcIn: 2.000, srcOut: 4.375, label: "Vid 9 Shot 2 - Dynamic 3/4 Orbit" },
            { vidId: 9, shotId: 3, srcIn: 4.375, srcOut: 7.417, label: "Vid 9 Shot 3 - Continuous Blade Rotation" },
            { vidId: 9, shotId: 4, srcIn: 7.417, srcOut: 10.000, label: "Vid 9 Shot 4 - Climax Hero Hold" }
        ];

        // Calculate sequential comp timing
        var compTimeline = 0.0;
        for (var c = 0; c < cuts.length; c++) {
            var dur = cuts[c].srcOut - cuts[c].srcIn;
            cuts[c].compIn = compTimeline;
            cuts[c].compOut = compTimeline + dur;
            cuts[c].dur = dur;
            compTimeline += dur;
        }

        var footageTotalDur = compTimeline; // 88.0s
        var outroDuration = 3.5;
        var masterTotalDur = footageTotalDur + outroDuration; // 91.5s
        var outroStart = footageTotalDur;

        // 4. Create Master All-Cuts Composition
        var masterCompName = "Zigma_White_Fan_All_Cuts_Timeline_9-16";
        for (var i = proj.numItems; i >= 1; i--) {
            if (proj.item(i) instanceof CompItem && proj.item(i).name === masterCompName) {
                proj.item(i).remove();
            }
        }

        var masterComp = proj.items.addComp(masterCompName, 1080, 1920, 1.0, masterTotalDur, 24);
        masterComp.workAreaStart = 0.0;
        masterComp.workAreaDuration = masterTotalDur;

        // Helper: Deep Glow & Drop Shadow
        function applyGlowAndShadow(layer, isUrl) {
            var effects = layer.property("ADBE Effect Parade");
            try {
                var dg = effects.addProperty("Deep Glow 2");
                if (dg) {
                    dg.property(23).setValue(35);
                    dg.property(24).setValue(isUrl ? 0.20 : 0.245);
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
                    dropShadow.property("ADBE Drop Shadow-0002").setValue(180);
                    dropShadow.property("ADBE Drop Shadow-0003").setValue(135);
                    dropShadow.property("ADBE Drop Shadow-0004").setValue(8);
                    dropShadow.property("ADBE Drop Shadow-0005").setValue(16);
                }
            } catch(e3) {}
        }

        // ==========================================
        // 5. ADD ALL 29 CUTS TO MASTER TIMELINE
        // ==========================================
        for (var k = 0; k < cuts.length; k++) {
            var ct = cuts[k];
            var vData = videoItemMap[ct.vidId];
            var vLyr = masterComp.layers.add(vData.item);
            
            // Format name with index, shot, and src timecode
            var padIdx = (k + 1 < 10 ? "0" : "") + (k + 1);
            vLyr.name = "Cut " + padIdx + " [" + ct.label + "]";
            
            // Exact head-to-tail placement
            vLyr.startTime = ct.compIn - ct.srcIn;
            vLyr.inPoint = ct.compIn;
            vLyr.outPoint = ct.compOut;
            vLyr.transform.position.setValue([540, 960, 0]);
            vLyr.transform.scale.setValue([vData.scale[0], vData.scale[1], 100]);
            
            if (vLyr.hasAudio) {
                vLyr.audioEnabled = false;
            }
        }
        l("Added all 29 frame-by-frame cuts to Master Timeline.");

        // ==========================================
        // 6. ADD MANDATORY ZIGMA BRAND ELEMENTS
        // ==========================================
        // A. Outro Sub Bass Impact
        var sfxOutro = masterComp.layers.add(itSubOutro);
        sfxOutro.name = "SFX_09_Sub_Brand_Outro";
        sfxOutro.startTime = outroStart;
        sfxOutro.inPoint = outroStart;
        sfxOutro.outPoint = masterTotalDur;
        try { sfxOutro.property("Audio").property("Audio Levels").setValue([-2.0, -2.0]); } catch(e) {}

        // B. Outro Vector Logo
        var logoVector = masterComp.layers.add(itZigmaPdf);
        logoVector.name = "ASSET_ZIGMA_LOGO";
        logoVector.startTime = outroStart;
        logoVector.inPoint = outroStart;
        logoVector.outPoint = masterTotalDur;
        logoVector.transform.position.setValue([540, 960, 0]);
        logoVector.transform.scale.setValue([52.7, 52.7, 100]);
        try { logoVector.collapseTransformation = true; } catch(e) {}

        // C. Outro White Solid
        var whiteSolid = masterComp.layers.addSolid([1, 1, 1], "White Solid 1", 1080, 1920, 1.0, outroDuration);
        whiteSolid.startTime = outroStart;
        whiteSolid.inPoint = outroStart;
        whiteSolid.outPoint = masterTotalDur;
        whiteSolid.transform.position.setValue([540, 960, 0]);

        // D. Persistent Footer URL: www.zigmaelectricals.com
        var urlLyr = masterComp.layers.addText("www.zigmaelectricals.com");
        urlLyr.name = "www.zigmaelectricals.com";
        urlLyr.inPoint = 0.0;
        urlLyr.outPoint = outroStart;
        urlLyr.transform.position.setValue([540, 1845, 0]);
        var urlDoc = urlLyr.property("ADBE Text Properties").property("ADBE Text Document").value;
        urlDoc.font = "Helvetica-Bold";
        urlDoc.fontSize = 32;
        urlDoc.fillColor = [0.95, 0.95, 0.95];
        urlDoc.tracking = 40;
        urlDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
        urlDoc.applyFill = true;
        urlLyr.property("ADBE Text Properties").property("ADBE Text Document").setValue(urlDoc);
        applyGlowAndShadow(urlLyr, true);

        // E. Persistent Header Swoop: Logo_place.psd ([254, 63], scale 65%)
        var logoPlace = masterComp.layers.add(itLogoPlace);
        logoPlace.name = "Logo_place.psd";
        logoPlace.inPoint = 0.0;
        logoPlace.outPoint = outroStart;
        logoPlace.transform.position.setValue([254, 63, 0]);
        logoPlace.transform.scale.setValue([65, 65, 100]);

        // ==========================================
        // 7. MUSIC BED (Bottom Layer)
        // ==========================================
        var musicLyr = masterComp.layers.add(itMusic);
        musicLyr.name = "Music_Bed_Corporate_Upbeat";
        musicLyr.startTime = 0.0;
        musicLyr.inPoint = 0.0;
        musicLyr.outPoint = masterTotalDur;
        try {
            var aProp = musicLyr.property("Audio").property("Audio Levels");
            aProp.setValueAtTime(0.0, [-3.0, -3.0]);
            aProp.setValueAtTime(outroStart - 0.2, [-3.0, -3.0]);
            aProp.setValueAtTime(masterTotalDur, [-45.0, -45.0]);
        } catch(e) {}

        // ==========================================
        // 8. REORDER MASTER COMP TO STRICT HIERARCHY
        // ==========================================
        // Top: Outro SFX, Outro Logo, Outro Solid, URL, Header Logo, Cuts (1 to 29), Music
        var desiredHierarchy = [
            "SFX_09_Sub_Brand_Outro",
            "ASSET_ZIGMA_LOGO",
            "White Solid 1",
            "www.zigmaelectricals.com",
            "Logo_place.psd"
        ];
        // Append all 29 cuts
        for (var q = 0; q < cuts.length; q++) {
            var pad = (q + 1 < 10 ? "0" : "") + (q + 1);
            desiredHierarchy.push("Cut " + pad + " [" + cuts[q].label + "]");
        }
        desiredHierarchy.push("Music_Bed_Corporate_Upbeat");

        function findMasterLayer(name) {
            for (var j = 1; j <= masterComp.numLayers; j++) {
                if (masterComp.layer(j).name === name) return masterComp.layer(j);
            }
            return null;
        }

        for (var h = desiredHierarchy.length - 1; h >= 0; h--) {
            var ml = findMasterLayer(desiredHierarchy[h]);
            if (ml) ml.moveToBeginning();
        }

        // ==========================================
        // 9. INDIVIDUAL VIDEO SLICED COMPS FOLDER
        // ==========================================
        var folderName = "01_Individual_Video_Slices";
        var sliceFolder = null;
        for (var f = 1; f <= proj.numItems; f++) {
            if (proj.item(f) instanceof FolderItem && proj.item(f).name === folderName) {
                sliceFolder = proj.item(f);
                break;
            }
        }
        if (!sliceFolder) {
            sliceFolder = proj.items.addFolder(folderName);
        }

        for (var vId = 1; vId <= 9; vId++) {
            var vInfo = videoItemMap[vId];
            var vCompName = "Vid_0" + vId + "_Sliced_" + vInfo.file.replace(".mp4", "");
            
            // Remove old comp if exists
            for (var r = proj.numItems; r >= 1; r--) {
                if (proj.item(r) instanceof CompItem && proj.item(r).name === vCompName) {
                    proj.item(r).remove();
                }
            }
            
            // Filter cuts for this video
            var vCuts = [];
            for (var cIdx = 0; cIdx < cuts.length; cIdx++) {
                if (cuts[cIdx].vidId === vId) vCuts.push(cuts[cIdx]);
            }
            
            var vidDur = (vId === 6 ? 8.0 : 10.0);
            var vComp = proj.items.addComp(vCompName, 1080, 1920, 1.0, vidDur, 24);
            vComp.parentFolder = sliceFolder;
            
            // Add cuts for this specific video
            for (var sc = 0; sc < vCuts.length; sc++) {
                var subCut = vCuts[sc];
                var subLyr = vComp.layers.add(vInfo.item);
                subLyr.name = "Shot " + subCut.shotId + " [" + subCut.srcIn.toFixed(2) + "s - " + subCut.srcOut.toFixed(2) + "s]";
                subLyr.startTime = 0.0;
                subLyr.inPoint = subCut.srcIn;
                subLyr.outPoint = subCut.srcOut;
                subLyr.transform.position.setValue([540, 960, 0]);
                subLyr.transform.scale.setValue([vInfo.scale[0], vInfo.scale[1], 100]);
                if (subLyr.hasAudio) subLyr.audioEnabled = false;
            }
            
            // Add top-left logo
            var subLogo = vComp.layers.add(itLogoPlace);
            subLogo.name = "Logo_place.psd";
            subLogo.transform.position.setValue([254, 63, 0]);
            subLogo.transform.scale.setValue([65, 65, 100]);
            subLogo.moveToBeginning();
        }

        // Save project
        var savePath = "/Users/designdrop/Desktop/zigma/product/Zigma_White_Fan_Commercial.aep";
        proj.save(new File(savePath));
        l("Project saved successfully to: " + savePath);

        // Write log
        var fLog = new File("/Users/designdrop/Desktop/zigma/product/frame_cut_log.txt");
        fLog.open("w");
        fLog.write(log.join("\n"));
        fLog.close();

    } catch(err) {
        var fErr = new File("/Users/designdrop/Desktop/zigma/product/frame_cut_err.txt");
        fErr.open("w");
        fErr.write("ERROR: " + err.toString() + (err.line ? " (Line: " + err.line + ")" : ""));
        fErr.close();
    }
})();
app.endUndoGroup();
