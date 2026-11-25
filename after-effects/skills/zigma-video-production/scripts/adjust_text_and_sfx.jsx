app.beginUndoGroup("Adjust Text Layers & SFX to Bottom Frames (Preserve Frame 1)");

(function() {
    var log = [];
    function l(msg) { log.push(msg); }

    try {
        var proj = app.project;
        if (!proj) throw new Error("No project open");

        var comp = proj.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            // Find Zigma_Compare_Edit_Select_9-16
            for (var i = 1; i <= proj.numItems; i++) {
                if (proj.item(i) instanceof CompItem && proj.item(i).name === "Zigma_Compare_Edit_Select_9-16") {
                    comp = proj.item(i);
                    break;
                }
            }
        }
        if (!comp) throw new Error("Comp not found");

        var footageDir = "/Users/designdrop/Desktop/zigma/product/(Footage)";
        var audioDir = footageDir + "/Audio";

        function getOrImportItem(path, name) {
            for (var i = 1; i <= proj.numItems; i++) {
                if (proj.item(i).name === name) return proj.item(i);
            }
            var f = new File(path);
            if (!f.exists) throw new Error("File not found: " + path);
            var io = new ImportOptions(f);
            return proj.importFile(io);
        }

        var itFastWhooshB = getOrImportItem(audioDir + "/14 Fast Whoosh B.wav", "14 Fast Whoosh B.wav");
        var itFast4 = getOrImportItem(audioDir + "/4 fast whooshes.wav", "4 fast whooshes.wav");
        var itSimpleWhoosh = getOrImportItem(audioDir + "/17 Simple_Whoosh.wav", "17 Simple_Whoosh.wav");
        var itRise0 = getOrImportItem(audioDir + "/WHOOSH 2 (RISE TO 0).wav", "WHOOSH 2 (RISE TO 0).wav");
        var itWhoosh0 = getOrImportItem(audioDir + "/WHOOSH 0.wav", "WHOOSH 0.wav");

        // Helper: Find layer by exact name
        function findLayer(name) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === name) return comp.layer(j);
            }
            return null;
        }

        // Helper: Add Word Kinetic Animator
        function addWordAnimator(textLyr, startTime, animDur) {
            try {
                var textProp = textLyr.property("ADBE Text Properties");
                var animators = textProp.property("ADBE Text Animators");
                // Remove existing animators if any to avoid stacking
                for (var a = animators.numProperties; a >= 1; a--) {
                    animators.property(a).remove();
                }
                var anim = animators.addProperty("ADBE Text Animator");
                anim.name = "Kinetic Word Reveal";

                var selectors = anim.property("ADBE Text Selectors");
                var selector = selectors.addProperty("ADBE Text Selector");
                var adv = selector.property("ADBE Text Range Advanced");
                adv.property("ADBE Text Range Type2").setValue(3); // Words

                var startProp = selector.property("ADBE Text Percent Start");
                startProp.setValueAtTime(startTime, 0);
                startProp.setValueAtTime(startTime + (animDur || 0.80), 100);

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

        // Helper: Set text document properties cleanly
        function setTextDoc(lyr, textStr, fontSize, color, align) {
            var doc = lyr.property("Source Text").value;
            doc.text = textStr;
            doc.font = "Helvetica-Bold";
            doc.fontSize = fontSize;
            doc.fillColor = color;
            doc.applyFill = true;
            doc.tracking = -30;
            doc.justification = align;
            lyr.property("Source Text").setValue(doc);
        }

        // =========================================================================
        // 1. ADJUST TEXT LAYERS ACCORDING TO BOTTOM FRAMES (PRESERVE 1ST FRAME)
        // 1st Frame (L8, L9, L10, L25) is strictly UNTOUCHED.
        // =========================================================================

        // Cut 2: Slide 02 - Frame 1 (V2 Take) [3.833s - 6.833s]
        // Bottom frame: Dial Ignition & Amber Glow
        var tLyr2 = findLayer("Text: Slide 03 - Frame 2 (Desktop Take)");
        if (tLyr2) {
            tLyr2.name = "Text: Frame 1 (V2 Take) - WARMTH.";
            tLyr2.inPoint = 3.913;
            tLyr2.outPoint = 6.833;
            tLyr2.transform.position.setValue([540, 520, 0]);
            setTextDoc(tLyr2, "WARMTH.", 76, [1.0, 0.65, 0.25], ParagraphJustification.CENTER_JUSTIFY);
            addWordAnimator(tLyr2, 3.913, 0.85);
            l("Adjusted Text for Cut 2 (WARMTH.)");
        }

        // Cut 3: Slide 04 - Frame 2 (V2 Take) [6.833s - 9.833s]
        // Bottom frame: Instant Heating glow
        var tLyr3 = findLayer("Text: Slide 04 - Frame 2 (V2 Take)");
        if (tLyr3) {
            tLyr3.name = "Text: Frame 2 (V2 Take) - Instant Heating";
            tLyr3.inPoint = 6.913;
            tLyr3.outPoint = 9.833;
            tLyr3.transform.position.setValue([540, 520, 0]);
            setTextDoc(tLyr3, "Instant\rHeating", 68, [1.0, 1.0, 1.0], ParagraphJustification.CENTER_JUSTIFY);
            addWordAnimator(tLyr3, 6.913, 0.85);
            l("Adjusted Text for Cut 3 (Instant Heating)");
        }

        // Cut 4: Slide 06 - Frame 3 (V2 Take) [9.833s - 11.333s]
        // Bottom frame: Safety Assurance quartz rods grill
        var tLyr4 = findLayer("Text: Slide 05 - Frame 3 (Desktop Take)");
        if (tLyr4) {
            tLyr4.name = "Text: Frame 3 (V2 Take) - Safety Assurance";
            tLyr4.inPoint = 9.913;
            tLyr4.outPoint = 11.333;
            tLyr4.transform.position.setValue([280, 540, 0]);
            setTextDoc(tLyr4, "Safety\rAssurance", 54, [1.0, 1.0, 1.0], ParagraphJustification.LEFT_JUSTIFY);
            addWordAnimator(tLyr4, 9.913, 0.70);
            l("Adjusted Text for Cut 4 (Safety Assurance)");
        }

        // Cut 5: Slide 07 - Frame 4 (Desktop Take) [11.333s - 12.833s]
        // Bottom frame: Cool Touch Body
        var tLyr5 = findLayer("Text: Slide 06 - Frame 3 (V2 Take)");
        if (tLyr5) {
            tLyr5.name = "Text: Frame 4 (Desktop Take) - Cool Touch Body";
            tLyr5.inPoint = 11.413;
            tLyr5.outPoint = 12.833;
            tLyr5.transform.position.setValue([800, 880, 0]);
            setTextDoc(tLyr5, "Cool Touch\rBody", 54, [1.0, 1.0, 1.0], ParagraphJustification.RIGHT_JUSTIFY);
            addWordAnimator(tLyr5, 11.413, 0.70);
            l("Adjusted Text for Cut 5 (Cool Touch Body)");
        }

        // Cut 6: Slide 08 - Frame 4 (V2 Take) [12.833s - 14.333s]
        // Bottom frame: Cool Touch Body angle & mesh
        var tLyr6 = findLayer("Text: Slide 07 - Frame 4 (Desktop Take)");
        if (tLyr6) {
            tLyr6.name = "Text: Frame 4 (V2 Take) - Cool Touch Body";
            tLyr6.inPoint = 12.913;
            tLyr6.outPoint = 14.333;
            tLyr6.transform.position.setValue([800, 880, 0]);
            setTextDoc(tLyr6, "Cool Touch\rBody", 54, [1.0, 1.0, 1.0], ParagraphJustification.RIGHT_JUSTIFY);
            addWordAnimator(tLyr6, 12.913, 0.70);
            l("Adjusted Text for Cut 6 (Cool Touch Body)");
        }

        // Cut 7: Slide 10 - Frame 5 (V2 Take) [14.333s - 15.833s]
        // Bottom frame: Silent Operation heat waves
        var tLyr7 = findLayer("Text: Slide 08 - Frame 4 (V2 Take)");
        if (tLyr7) {
            tLyr7.name = "Text: Frame 5 (V2 Take) - Silent Operation";
            tLyr7.inPoint = 14.413;
            tLyr7.outPoint = 15.833;
            tLyr7.transform.position.setValue([260, 960, 0]);
            setTextDoc(tLyr7, "Silent\rOperation", 54, [1.0, 1.0, 1.0], ParagraphJustification.LEFT_JUSTIFY);
            addWordAnimator(tLyr7, 14.413, 0.70);
            l("Adjusted Text for Cut 7 (Silent Operation)");
        }

        // Cut 8: Slide 12 - Frame 6 (V2 Take) [15.833s - 17.333s]
        // Bottom frame: Long Cord base & cable
        var tLyr8 = findLayer("Text: Slide 09 - Frame 5 (Desktop Take)");
        if (tLyr8) {
            tLyr8.name = "Text: Frame 6 (V2 Take) - Long Cord";
            tLyr8.inPoint = 15.913;
            tLyr8.outPoint = 17.333;
            tLyr8.transform.position.setValue([800, 1160, 0]);
            setTextDoc(tLyr8, "Long Cord", 54, [1.0, 1.0, 1.0], ParagraphJustification.RIGHT_JUSTIFY);
            addWordAnimator(tLyr8, 15.913, 0.70);
            l("Adjusted Text for Cut 8 (Long Cord)");
        }

        // Cut 9: Slide 14 - Frame 7 (V2 Take) [17.300s - 18.800s]
        // Bottom frame: Built to last glowing hero angle
        var tLyr9 = findLayer("Text: Slide 10 - Frame 5 (V2 Take)");
        if (tLyr9) {
            tLyr9.name = "Text: Frame 7 (V2 Take) - Built to last the season.";
            tLyr9.inPoint = 17.380;
            tLyr9.outPoint = 18.800;
            tLyr9.transform.position.setValue([540, 480, 0]);
            setTextDoc(tLyr9, "Built to last\rthe season.", 64, [1.0, 0.88, 0.70], ParagraphJustification.CENTER_JUSTIFY);
            addWordAnimator(tLyr9, 17.380, 0.75);
            l("Adjusted Text for Cut 9 (Built to last the season.)");
        }

        // Cut 10: Slide 13 - Frame 7 (Desktop Take) [18.800s - 21.800s]
        // Bottom frame: Hero rotated glowing angle
        var tLyr10 = findLayer("Text: Slide 11 - Frame 6 (Desktop Take)");
        if (tLyr10) {
            tLyr10.name = "Text: Frame 7 (Desktop Take) - Built to last the season.";
            tLyr10.inPoint = 18.880;
            tLyr10.outPoint = 21.800;
            tLyr10.transform.position.setValue([540, 480, 0]);
            setTextDoc(tLyr10, "Built to last\rthe season.", 64, [1.0, 0.88, 0.70], ParagraphJustification.CENTER_JUSTIFY);
            addWordAnimator(tLyr10, 18.880, 0.85);
            l("Adjusted Text for Cut 10 (Built to last the season.)");
        }

        // Disable orphaned text layers that have no bottom frame
        var orphanedNames = [
            "Text: Slide 12 - Frame 6 (V2 Take)",
            "Text: Slide 13 - Frame 7 (Desktop Take)",
            "Text: Slide 14 - Frame 7 (V2 Take)"
        ];
        for (var o = 0; o < orphanedNames.length; o++) {
            var oLyr = findLayer(orphanedNames[o]);
            if (oLyr) {
                oLyr.enabled = false;
                l("Disabled orphaned text layer: " + orphanedNames[o]);
            }
        }

        // Preserve Frame 8 text (L23 & L24) which the user placed before CTA and Outro
        l("Preserved Frame 8 text layers and user CTA/Outro.");

        // =========================================================================
        // 2. ADD AND ADJUST SOUND EFFECTS
        // Synchronize transitions across all cut points:
        // Cut 1: 0.633s / 0.867s (SFX_Slide01_Intro - untouched)
        // Cut 2: 3.833s
        // Cut 3: 6.833s
        // Cut 4: 9.833s
        // Cut 5: 11.333s
        // Cut 6: 12.833s
        // Cut 7: 14.333s
        // Cut 8: 15.833s
        // Cut 9: 17.300s
        // Cut 10: 18.800s
        // Climax Riser: 24.833s - 27.333s
        // CTA Chime: 26.603s
        // Outro Sub Impact: 27.833s
        // Music Bed: extended to 31.333s
        // =========================================================================

        // Adjust existing SFX
        var sfx2 = findLayer("SFX_Slide02_Swoosh");
        if (sfx2) {
            sfx2.startTime = 3.80;
            sfx2.inPoint = 3.80;
            sfx2.outPoint = 4.80;
            try { sfx2.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}
        }

        var sfx4 = findLayer("SFX_Slide04_Swoosh");
        if (sfx4) {
            sfx4.startTime = 6.78;
            sfx4.inPoint = 6.78;
            sfx4.outPoint = 7.80;
            try { sfx4.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}
        }

        var sfx6 = findLayer("SFX_Slide06_Swoosh");
        if (sfx6) {
            sfx6.startTime = 11.28;
            sfx6.inPoint = 11.28;
            sfx6.outPoint = 12.30;
            try { sfx6.property("Audio").property("Audio Levels").setValue([-6.0, -6.0]); } catch(e) {}
        }

        var sfx8 = findLayer("SFX_Slide08_Swoosh");
        if (sfx8) {
            sfx8.startTime = 14.28;
            sfx8.inPoint = 14.28;
            sfx8.outPoint = 15.30;
            try { sfx8.property("Audio").property("Audio Levels").setValue([-6.0, -6.0]); } catch(e) {}
        }

        var sfx10 = findLayer("SFX_Slide10_Swoosh");
        if (sfx10) {
            sfx10.startTime = 17.25;
            sfx10.inPoint = 17.25;
            sfx10.outPoint = 18.30;
            try { sfx10.property("Audio").property("Audio Levels").setValue([-6.0, -6.0]); } catch(e) {}
        }

        var sfx12 = findLayer("SFX_Slide12_Swoosh");
        if (sfx12) {
            sfx12.startTime = 18.75;
            sfx12.inPoint = 18.75;
            sfx12.outPoint = 19.80;
            try { sfx12.property("Audio").property("Audio Levels").setValue([-5.0, -5.0]); } catch(e) {}
        }

        // Add missing swooshes for Cuts 4 (9.83s), 6 (12.83s), and 8 (15.83s)
        function addSfxLayer(item, name, timePt, lvl) {
            var existing = findLayer(name);
            if (!existing) {
                var lyr = comp.layers.add(item);
                lyr.name = name;
                lyr.startTime = timePt;
                lyr.inPoint = timePt;
                lyr.outPoint = timePt + 1.1;
                try { lyr.property("Audio").property("Audio Levels").setValue([lvl, lvl]); } catch(e) {}
                l("Added SFX: " + name + " at " + timePt + "s");
                return lyr;
            } else {
                existing.startTime = timePt;
                existing.inPoint = timePt;
                existing.outPoint = timePt + 1.1;
                try { existing.property("Audio").property("Audio Levels").setValue([lvl, lvl]); } catch(e) {}
                l("Adjusted SFX: " + name + " to " + timePt + "s");
                return existing;
            }
        }

        addSfxLayer(itFast4, "SFX_Cut04_Swoosh_9.8s", 9.78, -5.0);
        addSfxLayer(itSimpleWhoosh, "SFX_Cut06_Swoosh_12.8s", 12.78, -6.0);
        addSfxLayer(itFastWhooshB, "SFX_Cut08_Swoosh_15.8s", 15.78, -6.0);

        // Adjust Music Bed to play through to Outro (31.333s)
        var musicLyr = findLayer("Music_Bed_Quartz_Heater");
        if (musicLyr) {
            musicLyr.outPoint = 31.333;
            try {
                var alvl = musicLyr.property("Audio").property("Audio Levels");
                // Clear old keys
                for (var k = alvl.numKeys; k >= 1; k--) {
                    alvl.removeKey(k);
                }
                alvl.setValueAtTime(0.833, [-3.0, -3.0]);
                alvl.setValueAtTime(27.60, [-3.0, -3.0]);
                alvl.setValueAtTime(31.333, [-45.0, -45.0]);
                l("Music Bed extended to 31.333s with smooth fade-out.");
            } catch(e) {}
        }

        // Save project
        proj.save();

        var resFile = new File("/tmp/adjust_text_sfx_log.txt");
        resFile.open("w");
        resFile.write("SUCCESS:\n" + log.join("\n"));
        resFile.close();

    } catch(err) {
        var resFile = new File("/tmp/adjust_text_sfx_log.txt");
        resFile.open("w");
        resFile.write("ERROR: " + err.toString() + " at line " + err.line);
        resFile.close();
    }
})();

app.endUndoGroup();
