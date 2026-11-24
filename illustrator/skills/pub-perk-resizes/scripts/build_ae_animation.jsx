// ExtendScript for Adobe After Effects
// Builds high-end promotional motion graphics from unpacked Illustrator files
// Enforces 4-step product choreography, 30.0 fps locked timing, 0-9s active timeline, 1s static hold, smooth cubic easing

function buildAnimation(aiFilePath, aepOutputPath) {
    var aiFile = new File(aiFilePath);
    if (!aiFile.exists) throw new Error("AI file not found: " + aiFilePath);

    if (app.project && app.project.dirty) throw new Error("Save the current After Effects project before creating a new one");
    app.newProject();

    var io = new ImportOptions(aiFile);
    if (!io.canImportAs(ImportAsType.COMP_CROPPED_LAYERS)) throw new Error("Artwork cannot be imported as cropped composition layers");
    io.importAs = ImportAsType.COMP_CROPPED_LAYERS;
    var importedItem = app.project.importFile(io);

    var comp = null;
    if (importedItem instanceof CompItem) {
        comp = importedItem;
    } else {
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof CompItem) {
                comp = app.project.item(i);
                break;
            }
        }
    }
    if (!comp) throw new Error("Could not find imported composition");

    comp.duration = 10.0;
    comp.frameRate = 30.0;
    var classicRenderer = "ADBE Advanced 3d"; // Historical scripting identifier for Classic 3D.
    var supported = false;
    for (var rendererIndex = 0; rendererIndex < comp.renderers.length; rendererIndex++) {
        if (comp.renderers[rendererIndex] === classicRenderer) supported = true;
    }
    if (!supported) throw new Error("Verify the Classic 3D renderer identifier for this installed version");
    comp.renderer = classicRenderer;
    try { comp.motionBlur = true; } catch(e) {}

    function getLayer(name) {
        try {
            return comp.layer(name);
        } catch(e) {
            return null;
        }
    }

    // Configure all layers inPoint/outPoint and motion blur
    for (var i = 1; i <= comp.numLayers; i++) {
        var l = comp.layer(i);
        l.inPoint = 0;
        l.outPoint = 10.0;
        try { l.collapseTransformation = true; } catch(e) {}
        try {
            if (l.name.indexOf("BG_") === -1 && l.name !== "Header_Specials") {
                l.motionBlur = true;
            } else {
                l.motionBlur = false;
            }
        } catch(e) {}
    }

    // 1. Re-stack background layers to the bottom
    // Order bottom to top: BG_Base, BG_Star_1..N, BG_Border, Header_Specials, BG_Disclaimer
    var bgDisclaimer = getLayer("BG_Disclaimer");
    var hSpecials = getLayer("Header_Specials");
    var bgBorder = getLayer("BG_Border");
    var bgBase = getLayer("BG_Base");

    if (bgDisclaimer) bgDisclaimer.moveToEnd();
    if (hSpecials) hSpecials.moveToEnd();
    if (bgBorder) bgBorder.moveToEnd();

    for (var s = 6; s >= 1; s--) {
        var star = getLayer("BG_Stars_" + s) || getLayer("BG_Star_" + s);
        if (star) star.moveToEnd();
    }
    if (bgBase) bgBase.moveToEnd();

    // Easing helpers
    var easeOut85 = new KeyframeEase(0, 85);
    var easeOut75 = new KeyframeEase(0, 75);
    var easeIn60 = new KeyframeEase(0, 60);
    var easeIn70 = new KeyframeEase(0, 70);
    var easeBounceMid = new KeyframeEase(0, 45);

    function makeArray(easeObj, count) {
        var arr = [];
        for (var c = 0; c < count; c++) arr.push(easeObj);
        return arr;
    }

    // 2. Rotate stars until 9.0s, then hold through the end.
    for (var s = 1; s <= 6; s++) {
        var star = getLayer("BG_Stars_" + s) || getLayer("BG_Star_" + s);
        if (star) {
            star.inPoint = 0;
            star.outPoint = 10.0;
            star.motionBlur = true;
            var r = star.transform.rotation || star.transform.zRotation;
            while (r.numKeys > 0) r.removeKey(1);
            var k1 = r.addKey(0);
            r.setValueAtKey(k1, 0);
            var k2 = r.addKey(9.0);
            r.setValueAtKey(k2, (s % 2 === 1) ? 180 : -180);
            r.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            r.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

            // Initial 0.5s Opacity Fade-in
            var op = star.transform.opacity;
            while (op.numKeys > 0) op.removeKey(1);
            var ok1 = op.addKey(0);
            op.setValueAtKey(ok1, 0);
            var ok2 = op.addKey(0.5);
            op.setValueAtKey(ok2, 100);
        }
    }

    // Header_Specials static border frame
    if (hSpecials) {
        hSpecials.inPoint = 0;
        hSpecials.outPoint = 10.0;
        while (hSpecials.transform.position.numKeys > 0) hSpecials.transform.position.removeKey(1);
        while (hSpecials.transform.opacity.numKeys > 0) hSpecials.transform.opacity.removeKey(1);
    }

    // 3. Header_Logo (Frame 5 = 0.167s drop 80px)
    var hLogo = getLayer("Header_Logo");
    if (hLogo) {
        var tIn = 5 / 30.0;
        var tDrop = 16 / 30.0;
        var tFade = 12 / 30.0;
        hLogo.inPoint = tIn;
        hLogo.outPoint = 10.0;

        var p = hLogo.transform.position;
        var op = hLogo.transform.opacity;
        var finalPos = [p.value[0], p.value[1], p.value[2] || 0];

        while (p.numKeys > 0) p.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var pk1 = p.addKey(tIn);
        p.setValueAtKey(pk1, [finalPos[0], finalPos[1] - 80, 0]);
        p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

        var pk2 = p.addKey(tIn + tDrop);
        p.setValueAtKey(pk2, finalPos);
        p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(tIn);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey(tIn + tFade);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    // 4. Header_Title (Frame 17 = 0.567s drop 80px)
    var hTitle = getLayer("Header_Title");
    if (hTitle) {
        var tIn = 17 / 30.0;
        var tDrop = 16 / 30.0;
        var tFade = 12 / 30.0;
        hTitle.inPoint = tIn;
        hTitle.outPoint = 10.0;

        var p = hTitle.transform.position;
        var op = hTitle.transform.opacity;
        var finalPos = [p.value[0], p.value[1], p.value[2] || 0];

        while (p.numKeys > 0) p.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var pk1 = p.addKey(tIn);
        p.setValueAtKey(pk1, [finalPos[0], finalPos[1] - 80, 0]);
        p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

        var pk2 = p.addKey(tIn + tDrop);
        p.setValueAtKey(pk2, finalPos);
        p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(tIn);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey(tIn + tFade);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    // 5. BG_Disclaimer (Frame 27 = 0.900s slide in from left 80px)
    var bgDisc = getLayer("BG_Disclaimer");
    if (bgDisc) {
        var tIn = 27 / 30.0;
        var tSlide = 18 / 30.0;
        var tFade = 13 / 30.0;
        bgDisc.inPoint = tIn;
        bgDisc.outPoint = 10.0;

        var p = bgDisc.transform.position;
        var op = bgDisc.transform.opacity;
        var finalPos = [p.value[0], p.value[1], p.value[2] || 0];

        while (p.numKeys > 0) p.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var pk1 = p.addKey(tIn);
        p.setValueAtKey(pk1, [finalPos[0] - 80, finalPos[1], 0]);
        p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

        var pk2 = p.addKey(tIn + tSlide);
        p.setValueAtKey(pk2, finalPos);
        p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(tIn);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey(tIn + tFade);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    // 6. Product Offers (4-Step Sequence per Offer) - 30fps frame locked
    function animateProduct30Fps(prefix, startFrame, slideDeltaX) {
        var prod = getLayer(prefix + "_Product");
        var badge = getLayer(prefix + "_Badge");
        var title = getLayer(prefix + "_Title");
        var price = getLayer(prefix + "_PriceTag");

        var tStart = startFrame / 30.0;

        // Step 1: Product Scale & Opacity (15 frames = 0.500s)
        if (prod) {
            prod.inPoint = tStart;
            prod.outPoint = 10.0;
            var sc = prod.transform.scale;
            var op = prod.transform.opacity;
            while (sc.numKeys > 0) sc.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var k1 = sc.addKey(tStart);
            sc.setValueAtKey(k1, [92, 92, 100]);
            sc.setTemporalEaseAtKey(k1, makeArray(easeIn60, 3), makeArray(easeIn60, 3));

            var k2 = sc.addKey(tStart + 15 / 30.0);
            sc.setValueAtKey(k2, [100, 100, 100]);
            sc.setTemporalEaseAtKey(k2, makeArray(easeOut85, 3), makeArray(easeOut85, 3));

            var ok1 = op.addKey(tStart);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey(tStart + 15 / 30.0);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 2: Badge Pop Bounce (+11 frames, 15 frames duration)
        var fBadge = startFrame + 11;
        var tBadge = fBadge / 30.0;
        if (badge) {
            badge.inPoint = tBadge;
            badge.outPoint = 10.0;
            var sc = badge.transform.scale;
            var op = badge.transform.opacity;
            while (sc.numKeys > 0) sc.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var k1 = sc.addKey(tBadge);
            sc.setValueAtKey(k1, [0, 0, 100]);
            sc.setTemporalEaseAtKey(k1, makeArray(easeIn70, 3), makeArray(easeIn70, 3));

            var k2 = sc.addKey((fBadge + 9) / 30.0);
            sc.setValueAtKey(k2, [108, 108, 100]);
            sc.setTemporalEaseAtKey(k2, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

            var k3 = sc.addKey((fBadge + 15) / 30.0);
            sc.setValueAtKey(k3, [100, 100, 100]);
            sc.setTemporalEaseAtKey(k3, makeArray(easeOut85, 3), makeArray(easeOut85, 3));

            var ok1 = op.addKey(tBadge);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey((fBadge + 8) / 30.0);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 3: Title Slide (+21 frames, 18 frames duration)
        var fTitle = startFrame + 21;
        var tTitle = fTitle / 30.0;
        if (title) {
            title.inPoint = tTitle;
            title.outPoint = 10.0;
            var p = title.transform.position;
            var op = title.transform.opacity;
            var finalPos = [p.value[0], p.value[1], p.value[2] || 0];
            while (p.numKeys > 0) p.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var pk1 = p.addKey(tTitle);
            p.setValueAtKey(pk1, [finalPos[0] + slideDeltaX, finalPos[1], 0]);
            p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

            var pk2 = p.addKey((fTitle + 18) / 30.0);
            p.setValueAtKey(pk2, finalPos);
            p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

            var ok1 = op.addKey(tTitle);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey((fTitle + 14) / 30.0);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 4: PriceTag 3D Fold Down (+33 frames, 20 frames duration)
        var fPrice = startFrame + 33;
        var tPrice = fPrice / 30.0;
        if (price) {
            price.inPoint = tPrice;
            price.outPoint = 10.0;
            price.threeDLayer = true;
            var rx = price.transform.xRotation;
            var op = price.transform.opacity;
            while (rx.numKeys > 0) rx.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var rk1 = rx.addKey(tPrice);
            rx.setValueAtKey(rk1, -90);
            rx.setTemporalEaseAtKey(rk1, [easeIn70], [easeIn70]);

            var rk2 = rx.addKey((fPrice + 10) / 30.0);
            rx.setValueAtKey(rk2, 16);
            rx.setTemporalEaseAtKey(rk2, [easeBounceMid], [easeBounceMid]);

            var rk3 = rx.addKey((fPrice + 15) / 30.0);
            rx.setValueAtKey(rk3, -6);
            rx.setTemporalEaseAtKey(rk3, [easeBounceMid], [easeBounceMid]);

            var rk4 = rx.addKey((fPrice + 20) / 30.0);
            rx.setValueAtKey(rk4, 0);
            rx.setTemporalEaseAtKey(rk4, [easeOut85], [easeOut85]);

            var ok1 = op.addKey(tPrice);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey((fPrice + 7) / 30.0);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }
    }

    animateProduct30Fps("Offer1", 40, -80);
    animateProduct30Fps("Offer2", 90, (comp.width > comp.height ? -80 : 80));
    animateProduct30Fps("Offer3", 140, 80);

    // 7. Offer 4 / Callout Box (Frame 189 to Frame 270)
    var o4Base = getLayer("Offer4_Base");
    var o4Text = getLayer("Offer4_Text");
    var o4Price = getLayer("Offer4_PriceTag");

    if (o4Base) {
        var fBase = 189;
        var tBase = fBase / 30.0;
        o4Base.inPoint = tBase;
        o4Base.outPoint = 10.0;
        var p = o4Base.transform.position;
        var op = o4Base.transform.opacity;
        var finalPos = [p.value[0], p.value[1], p.value[2] || 0];
        while (p.numKeys > 0) p.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var pk1 = p.addKey(tBase);
        p.setValueAtKey(pk1, [finalPos[0] - 60, finalPos[1] + 40, 0]);
        p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

        var pk2 = p.addKey((fBase + 18) / 30.0);
        p.setValueAtKey(pk2, finalPos);
        p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(tBase);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey((fBase + 11) / 30.0);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    if (o4Text) {
        var fText = 200;
        var tText = fText / 30.0;
        o4Text.inPoint = tText;
        o4Text.outPoint = 10.0;
        var op = o4Text.transform.opacity;
        while (op.numKeys > 0) op.removeKey(1);

        var ok1 = op.addKey(tText);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey((fText + 10) / 30.0);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    if (o4Price) {
        var fPrice = 208;
        var tPrice = fPrice / 30.0;
        o4Price.inPoint = tPrice;
        o4Price.outPoint = 10.0;
        o4Price.threeDLayer = true;
        var rx = o4Price.transform.xRotation;
        var sc = o4Price.transform.scale;
        var op = o4Price.transform.opacity;
        while (rx.numKeys > 0) rx.removeKey(1);
        while (sc.numKeys > 0) sc.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var rk1 = rx.addKey(tPrice);
        rx.setValueAtKey(rk1, -90);
        rx.setTemporalEaseAtKey(rk1, [easeIn70], [easeIn70]);

        var rk2 = rx.addKey((fPrice + 10) / 30.0);
        rx.setValueAtKey(rk2, 16);
        rx.setTemporalEaseAtKey(rk2, [easeBounceMid], [easeBounceMid]);

        var rk3 = rx.addKey((fPrice + 15) / 30.0);
        rx.setValueAtKey(rk3, -6);
        rx.setTemporalEaseAtKey(rk3, [easeBounceMid], [easeBounceMid]);

        var rk4 = rx.addKey((fPrice + 20) / 30.0);
        rx.setValueAtKey(rk4, 0);
        rx.setTemporalEaseAtKey(rk4, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(tPrice);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey((fPrice + 7) / 30.0);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);

        // Attention scale pulse settling cleanly at frame 270 (9.000s)
        var sk1 = sc.addKey(228 / 30.0);
        sc.setValueAtKey(sk1, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk1, makeArray(easeOut75, 3), makeArray(easeOut75, 3));

        var sk2 = sc.addKey(246 / 30.0);
        sc.setValueAtKey(sk2, [104, 104, 100]);
        sc.setTemporalEaseAtKey(sk2, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

        var sk3 = sc.addKey(258 / 30.0);
        sc.setValueAtKey(sk3, [98, 98, 100]);
        sc.setTemporalEaseAtKey(sk3, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

        var sk4 = sc.addKey(270 / 30.0);
        sc.setValueAtKey(sk4, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk4, makeArray(easeOut85, 3), makeArray(easeOut85, 3));
    }

    // 8. CTA_Button (Square Ad Placement)
    var cta = getLayer("CTA_Button");
    if (cta) {
        var fCTA = 215;
        var tCTA = fCTA / 30.0;
        cta.inPoint = tCTA;
        cta.outPoint = 10.0;
        var sc = cta.transform.scale;
        var op = cta.transform.opacity;
        while (sc.numKeys > 0) sc.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var sk1 = sc.addKey(tCTA);
        sc.setValueAtKey(sk1, [0, 0, 100]);
        sc.setTemporalEaseAtKey(sk1, makeArray(easeIn70, 3), makeArray(easeIn70, 3));

        var sk2 = sc.addKey((fCTA + 11) / 30.0);
        sc.setValueAtKey(sk2, [108, 108, 100]);
        sc.setTemporalEaseAtKey(sk2, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

        var sk3 = sc.addKey((fCTA + 19) / 30.0);
        sc.setValueAtKey(sk3, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk3, makeArray(easeOut85, 3), makeArray(easeOut85, 3));

        var ok1 = op.addKey(tCTA);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey((fCTA + 8) / 30.0);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);

        var sk4 = sc.addKey(248 / 30.0);
        sc.setValueAtKey(sk4, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk4, makeArray(easeOut75, 3), makeArray(easeOut75, 3));

        var sk5 = sc.addKey(258 / 30.0);
        sc.setValueAtKey(sk5, [105, 105, 100]);
        sc.setTemporalEaseAtKey(sk5, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

        var sk6 = sc.addKey(266 / 30.0);
        sc.setValueAtKey(sk6, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk6, makeArray(easeOut85, 3), makeArray(easeOut85, 3));
    }

    // 9. Save Project
    var saveFile = aepOutputPath ? new File(aepOutputPath) : new File(aiFile.path + "/" + aiFile.name.replace(/\.ai$/i, ".aep"));
    comp.openInViewer();
    app.project.save(saveFile);
    return "SUCCESS: Project saved to " + saveFile.fsName;
}
