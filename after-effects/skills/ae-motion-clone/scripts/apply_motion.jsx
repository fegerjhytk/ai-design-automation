// Adobe After Effects ExtendScript: General Reference-Driven Motion Matcher
// Injects physical motion archetypes (cascade_drop, carousel_scroll, elastic_pop, stagger_slide)
// Supports semantic layer filtering (elements-only), track-matte synchronization, and stacked layouts.

(function() {
    var result = {
        success: false,
        compName: "",
        archetype: "",
        layersAnimated: 0,
        layersSkipped: 0,
        error: ""
    };

    function logError(msg) {
        result.error = msg;
        writeResult(result);
    }

    function writeResult(res) {
        try {
            var f = new File("/tmp/ae_motion_result.json");
            f.open("w");
            var json = "{\n" +
                '  "success": ' + res.success + ",\n" +
                '  "compName": "' + (res.compName || "").replace(/"/g, '\\"') + '",\n" +
                '  "archetype": "' + (res.archetype || "").replace(/"/g, '\\"') + '",\n" +
                '  "layersAnimated": ' + (res.layersAnimated || 0) + ",\n" +
                '  "layersSkipped": ' + (res.layersSkipped || 0) + ",\n" +
                '  "error": "' + (res.error || "").replace(/"/g, '\\"') + '"\n' +
                "}";
            f.write(json);
            f.close();
        } catch(e) {}
    }

    try {
        if (!app.project) {
            logError("No active project open in After Effects.");
            return;
        }

        // Read configuration / recipe JSON
        var recipeFile = new File("/tmp/motion_recipe.json");
        var configFile = new File("/tmp/ae_motion_config.json");

        var compName = "";
        var elementsOnly = true;
        var archetype = "cascade_drop";
        var layoutMode = "as-is";
        var staggerDelay = 0.12;
        var holdDuration = 1.9;
        var targetDuration = 5.0;

        // Physics defaults
        var topY = -600.0;
        var bottomY = 2100.0;
        var overshootPx = 30.0;
        var reboundPx = -8.0;
        var fallDuration = 0.65;
        var exitDuration = 0.68;
        var tiltAngles = [-15.0, 18.0, -20.0, 16.0, -22.0, 20.0, -16.0, 15.0, -14.0];

        if (configFile.exists) {
            configFile.open("r");
            var cfg = configFile.read();
            configFile.close();
            var mComp = cfg.match(/"compName"\s*:\s*"([^"]+)"/);
            if (mComp) compName = mComp[1];
            var mElem = cfg.match(/"elementsOnly"\s*:\s*(true|false)/);
            if (mElem) elementsOnly = (mElem[1] === "true");
            var mArch = cfg.match(/"archetype"\s*:\s*"([^"]+)"/);
            if (mArch) archetype = mArch[1];
            var mLayout = cfg.match(/"layout"\s*:\s*"([^"]+)"/);
            if (mLayout) layoutMode = mLayout[1];
        }

        if (recipeFile.exists) {
            recipeFile.open("r");
            var rcp = recipeFile.read();
            recipeFile.close();
            var mArch2 = rcp.match(/"archetype"\s*:\s*"([^"]+)"/);
            if (mArch2) archetype = mArch2[1];
            var mStagger = rcp.match(/"stagger_delay"\s*:\s*([0-9.]+)/);
            if (mStagger) staggerDelay = parseFloat(mStagger[1]);
            var mHold = rcp.match(/"hold_duration"\s*:\s*([0-9.]+)/);
            if (mHold) holdDuration = parseFloat(mHold[1]);
            var mDur = rcp.match(/"target_duration"\s*:\s*([0-9.]+)/);
            if (mDur) targetDuration = parseFloat(mDur[1]);
            var mElem2 = rcp.match(/"elements_only"\s*:\s*(true|false)/);
            if (mElem2) elementsOnly = (mElem2[1] === "true");
            var mLayout2 = rcp.match(/"layout"\s*:\s*"([^"]+)"/);
            if (mLayout2) layoutMode = mLayout2[1];
        }

        result.archetype = archetype;

        // Clean helper to trim strings
        function clean(s) {
            return (s || "").replace(/^\s+|\s+$/g, "").toLowerCase();
        }

        // Locate target composition
        var comp = null;
        if (compName && compName !== "") {
            var targetClean = clean(compName);
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof CompItem && clean(it.name) === targetClean) {
                    comp = it;
                    break;
                }
            }
        }
        if (!comp && app.project.activeItem && app.project.activeItem instanceof CompItem) {
            comp = app.project.activeItem;
        }
        if (!comp) {
            logError("Target composition not found: " + compName);
            return;
        }

        result.compName = comp.name;
        app.beginUndoGroup("AE Motion Clone: " + archetype);

        var animatedCount = 0;
        var skippedCount = 0;

        // ==========================================
        // ARCHETYPE 1: CASCADE DROP (Arôme Style)
        // ==========================================
        if (archetype === "cascade_drop") {
            // First: Clean up & lock Typography and Background if elementsOnly
            for (var j = 1; j <= comp.numLayers; j++) {
                var ly = comp.layer(j);
                var lyName = clean(ly.name);
                var isBG = (lyName.indexOf("bg") !== -1 || lyName.indexOf("background") !== -1 || lyName.indexOf("slide-") !== -1 || j === comp.numLayers);
                var isText = (ly instanceof TextLayer || lyName.indexOf("elements") !== -1 || lyName.indexOf("headline") !== -1 || lyName.indexOf("title") !== -1);

                if (isBG || (isText && elementsOnly && ly.parent === null)) {
                    ly.locked = false;
                    try {
                        var pProp = ly.property("ADBE Transform Group").property("ADBE Position");
                        while (pProp.numKeys > 0) pProp.removeKey(1);
                        var oProp = ly.property("ADBE Transform Group").property("ADBE Opacity");
                        while (oProp.numKeys > 0) oProp.removeKey(1);
                        oProp.setValue(100);
                        var rProp = ly.property("ADBE Transform Group").property("ADBE Rotate Z");
                        if (rProp) while (rProp.numKeys > 0) rProp.removeKey(1);
                    } catch(eClean) {}
                    ly.locked = true;
                    skippedCount++;
                }
            }

            // Synchronize track mattes and masks to their parent graphic layers
            for (var m = 1; m <= comp.numLayers; m++) {
                var mLy = comp.layer(m);
                var mName = clean(mLy.name);
                if (mName.indexOf("_mask") !== -1 || mName.indexOf("clippath") !== -1) {
                    for (var s = 1; s <= comp.numLayers; s++) {
                        var sLy = comp.layer(s);
                        if (s !== m && clean(mLy.name).indexOf(clean(sLy.name)) !== -1) {
                            try { mLy.parent = sLy; } catch(ep) {}
                            break;
                        }
                    }
                }
            }

            // Identify root graphic element layers to animate
            var targetElements = [];
            for (var k = 1; k <= comp.numLayers; k++) {
                var cand = comp.layer(k);
                var candName = clean(cand.name);
                var isBgCand = (candName.indexOf("bg") !== -1 || candName.indexOf("background") !== -1 || candName.indexOf("slide-") !== -1 || k === comp.numLayers);
                var isMaskCand = (candName.indexOf("_mask") !== -1 || candName.indexOf("clippath") !== -1);
                var isTextCand = (cand instanceof TextLayer || candName.indexOf("elements") !== -1 || candName.indexOf("headline") !== -1);

                if (isBgCand || isMaskCand || (isTextCand && elementsOnly && cand.parent === null)) {
                    continue;
                }
                // Only animate root layers (or badge parents)
                if (cand.parent === null) {
                    targetElements.push(cand);
                }
            }

            // Apply optional stacked layout if requested
            if (layoutMode === "stacked" && targetElements.length >= 4) {
                // Pre-calculated organic cluster coordinates centered across middle & lower canvas
                var clusterPositions = [
                    { x: comp.width * 0.18, y: comp.height * 0.75, rot: 8.0 },
                    { x: comp.width * 0.43, y: comp.height * 0.80, rot: -6.0 },
                    { x: comp.width * 0.61, y: comp.height * 0.71, rot: 5.0 },
                    { x: comp.width * 0.85, y: comp.height * 0.76, rot: -9.0 },
                    { x: comp.width * 0.71, y: comp.height * 0.84, rot: -14.0 },
                    { x: comp.width * 0.25, y: comp.height * 0.51, rot: -18.0 },
                    { x: comp.width * 0.45, y: comp.height * 0.54, rot: 0.0 },
                    { x: comp.width * 0.67, y: comp.height * 0.52, rot: 12.0 },
                    { x: comp.width * 0.84, y: comp.height * 0.47, rot: -8.0 }
                ];
                for (var cp = 0; cp < targetElements.length && cp < clusterPositions.length; cp++) {
                    var elLayer = targetElements[cp];
                    elLayer.locked = false;
                    try {
                        elLayer.property("ADBE Transform Group").property("ADBE Position").setValue([clusterPositions[cp].x, clusterPositions[cp].y, 0]);
                        var elRot = null;
                        try { elRot = elLayer.property("ADBE Transform Group").property("ADBE Rotate Z"); } catch(er1) {
                            try { elRot = elLayer.property("ADBE Transform Group").property("ADBE Rotation"); } catch(er2) {}
                        }
                        if (elRot) elRot.setValue(clusterPositions[cp].rot);
                    } catch(ePos) {}
                }
            }

            // Animate each element with the complete 4-Phase Lifecycle
            var tExitBase = targetDuration - exitDuration - 0.50; // Dynamic exit start
            if (tExitBase < 3.2) tExitBase = 3.50;

            for (var e = 0; e < targetElements.length; e++) {
                var el = targetElements[e];
                el.locked = false;

                var posP = el.property("ADBE Transform Group").property("ADBE Position");
                var rotP = null;
                try { rotP = el.property("ADBE Transform Group").property("ADBE Rotate Z"); } catch(re1) {
                    try { rotP = el.property("ADBE Transform Group").property("ADBE Rotation"); } catch(re2) {}
                }

                if (!posP) {
                    skippedCount++;
                    continue;
                }

                // Current rest position & rotation
                var restPos = posP.value;
                var restRot = rotP ? rotP.value : 0.0;

                // Clear previous keys
                while (posP.numKeys > 0) posP.removeKey(1);
                if (rotP) while (rotP.numKeys > 0) rotP.removeKey(1);

                var t0 = 0.05 + (e * staggerDelay);
                var tb1 = t0 + (fallDuration * 0.95);
                var tb2 = t0 + (fallDuration * 1.25);
                var ts = t0 + (fallDuration * 1.48);

                var teStart = tExitBase + (e * 0.08);
                var teEnd = teStart + exitDuration;

                var by1 = restPos[1] + overshootPx;
                var by2 = restPos[1] + reboundPx;
                var wob = tiltAngles[e % tiltAngles.length];

                // 7 Position Keys
                var k1 = posP.addKey(0.0);
                posP.setValueAtKey(k1, [restPos[0], topY, restPos.length > 2 ? restPos[2] : 0]);

                var k2 = posP.addKey(t0);
                posP.setValueAtKey(k2, [restPos[0], topY, restPos.length > 2 ? restPos[2] : 0]);

                var k3 = posP.addKey(tb1);
                posP.setValueAtKey(k3, [restPos[0], by1, restPos.length > 2 ? restPos[2] : 0]);

                var k4 = posP.addKey(tb2);
                posP.setValueAtKey(k4, [restPos[0], by2, restPos.length > 2 ? restPos[2] : 0]);

                var k5 = posP.addKey(ts);
                posP.setValueAtKey(k5, restPos);

                var k6 = posP.addKey(teStart);
                posP.setValueAtKey(k6, restPos);

                var k7 = posP.addKey(teEnd);
                posP.setValueAtKey(k7, [restPos[0], bottomY, restPos.length > 2 ? restPos[2] : 0]);

                for (var ki = 1; ki <= 7; ki++) {
                    posP.setInterpolationTypeAtKey(ki, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                }

                // 7 Rotation Keys
                if (rotP) {
                    var r0 = restRot + wob;
                    var rb1 = restRot - (wob * 0.40);
                    var rb2 = restRot + (wob * 0.15);
                    var re = restRot - (wob * 1.60);

                    var rk1 = rotP.addKey(0.0);
                    rotP.setValueAtKey(rk1, r0);

                    var rk2 = rotP.addKey(t0);
                    rotP.setValueAtKey(rk2, r0);

                    var rk3 = rotP.addKey(tb1);
                    rotP.setValueAtKey(rk3, rb1);

                    var rk4 = rotP.addKey(tb2);
                    rotP.setValueAtKey(rk4, rb2);

                    var rk5 = rotP.addKey(ts);
                    rotP.setValueAtKey(rk5, restRot);

                    var rk6 = rotP.addKey(teStart);
                    rotP.setValueAtKey(rk6, restRot);

                    var rk7 = rotP.addKey(teEnd);
                    rotP.setValueAtKey(rk7, re);

                    for (var rki = 1; rki <= 7; rki++) {
                        rotP.setInterpolationTypeAtKey(rki, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    }
                }

                animatedCount++;
            }
        }

        // ==========================================
        // ARCHETYPE 2: CAROUSEL SCROLL (Slide 10 Style)
        // ==========================================
        else if (archetype === "carousel_scroll") {
            // Find root Null controller or create one
            var nullController = null;
            var childCards = [];
            for (var c = 1; c <= comp.numLayers; c++) {
                var cL = comp.layer(c);
                if (cL.nullLayer || clean(cL.name).indexOf("null") !== -1) {
                    nullController = cL;
                } else if (clean(cL.name).indexOf("bg") === -1 && clean(cL.name).indexOf("mask") === -1 && c !== comp.numLayers) {
                    childCards.push(cL);
                }
            }

            if (!nullController) {
                nullController = comp.layers.addNull();
                nullController.name = "Motion_Carousel_Controller";
                for (var cc = 0; cc < childCards.length; cc++) {
                    childCards[cc].parent = nullController;
                }
            }

            // Remove previous repeat layers
            for (var rl = comp.numLayers; rl >= 1; rl--) {
                var checkL = comp.layer(rl);
                if (checkL.name.indexOf("Repeat") !== -1) {
                    checkL.remove();
                }
            }

            // Calculate card pitch & cycle distance
            if (childCards.length >= 2) {
                var yPositions = [];
                for (var py = 0; py < childCards.length; py++) {
                    yPositions.push(childCards[py].property("ADBE Transform Group").property("ADBE Position").value[1]);
                }
                yPositions.sort(function(a, b) { return a - b; });

                var avgPitch = Math.abs(yPositions[1] - yPositions[0]);
                var cycleHeight = avgPitch * childCards.length;
                var xCoord = childCards[0].property("ADBE Transform Group").property("ADBE Position").value[0];

                // Duplicate cards into 2 repeating sets for seamless continuity
                for (var rep = 1; rep <= 2; rep++) {
                    for (var cd = 0; cd < childCards.length; cd++) {
                        var dup = childCards[cd].duplicate();
                        dup.name = childCards[cd].name + " (Repeat " + rep + ")";
                        dup.parent = nullController;
                        var baseCardY = childCards[cd].property("ADBE Transform Group").property("ADBE Position").value[1];
                        dup.property("ADBE Transform Group").property("ADBE Position").setValue([xCoord, baseCardY + (cycleHeight * rep), 0]);
                    }
                }

                // Keyframe Null controller for constant linear upward travel
                var nullPos = nullController.property("ADBE Transform Group").property("ADBE Position");
                while (nullPos.numKeys > 0) nullPos.removeKey(1);

                var startPosY = nullPos.value[1];
                var endPosY = startPosY - cycleHeight;

                var nk1 = nullPos.addKey(0.0);
                nullPos.setValueAtKey(nk1, [nullPos.value[0], startPosY, 0]);
                nullPos.setInterpolationTypeAtKey(nk1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

                var nk2 = nullPos.addKey(targetDuration);
                nullPos.setValueAtKey(nk2, [nullPos.value[0], endPosY, 0]);
                nullPos.setInterpolationTypeAtKey(nk2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

                nullPos.expression = 'loopOut("cycle");';
                animatedCount = childCards.length * 3;
            }
        }

        // ==========================================
        // ARCHETYPE 3: ELASTIC POP
        // ==========================================
        else if (archetype === "elastic_pop") {
            for (var ep = 1; ep <= comp.numLayers; ep++) {
                var epLayer = comp.layer(ep);
                var epName = clean(epLayer.name);
                var isBgPop = (epName.indexOf("bg") !== -1 || epName.indexOf("background") !== -1 || ep === comp.numLayers);
                var isTextPop = (epLayer instanceof TextLayer);
                if (isBgPop || (isTextPop && elementsOnly)) {
                    skippedCount++;
                    continue;
                }

                var scaleP = epLayer.property("ADBE Transform Group").property("ADBE Scale");
                if (scaleP) {
                    var sRest = scaleP.value;
                    while (scaleP.numKeys > 0) scaleP.removeKey(1);

                    var tPop0 = (ep - 1) * staggerDelay;
                    scaleP.setValueAtTime(tPop0, [0, 0, 0]);
                    scaleP.setValueAtTime(tPop0 + 0.40, [sRest[0] * 1.15, sRest[1] * 1.15, 100]);
                    scaleP.setValueAtTime(tPop0 + 0.60, [sRest[0] * 0.96, sRest[1] * 0.96, 100]);
                    scaleP.setValueAtTime(tPop0 + 0.80, sRest);

                    for (var spk = 1; spk <= 4; spk++) {
                        scaleP.setInterpolationTypeAtKey(spk, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    }
                    animatedCount++;
                }
            }
        }

        // ==========================================
        // ARCHETYPE 4: STAGGER SLIDE
        // ==========================================
        else if (archetype === "stagger_slide") {
            for (var ss = 1; ss <= comp.numLayers; ss++) {
                var ssLayer = comp.layer(ss);
                var ssName = clean(ssLayer.name);
                var isBgSlide = (ssName.indexOf("bg") !== -1 || ssName.indexOf("background") !== -1 || ss === comp.numLayers);
                var isTextSlide = (ssLayer instanceof TextLayer);
                if (isBgSlide || (isTextSlide && elementsOnly)) {
                    skippedCount++;
                    continue;
                }

                var posSlide = ssLayer.property("ADBE Transform Group").property("ADBE Position");
                if (posSlide) {
                    var pRest = posSlide.value;
                    while (posSlide.numKeys > 0) posSlide.removeKey(1);

                    var tSlide0 = (ss - 1) * staggerDelay;
                    posSlide.setValueAtTime(tSlide0, [pRest[0], pRest[1] + 400.0, 0]);
                    posSlide.setValueAtTime(tSlide0 + 0.70, pRest);

                    for (var ssk = 1; ssk <= 2; ssk++) {
                        posSlide.setInterpolationTypeAtKey(ssk, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    }
                    animatedCount++;
                }
            }
        }

        app.endUndoGroup();

        // Save project state
        app.project.save();

        result.success = true;
        result.layersAnimated = animatedCount;
        result.layersSkipped = skippedCount;
        writeResult(result);

    } catch(eGlobal) {
        logError("ExtendScript Exception: " + eGlobal.toString());
    }
})();
