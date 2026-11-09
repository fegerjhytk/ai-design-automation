// ExtendScript for Adobe After Effects
// Builds high-end promotional motion graphics from unpacked Illustrator files
// Enforces 4-step product choreography, 0-9s active timeline, 1s static hold, smooth cubic easing

function buildAnimation(aiFilePath, aepOutputPath) {
    var aiFile = new File(aiFilePath);
    if (!aiFile.exists) throw new Error("AI file not found: " + aiFilePath);

    app.newProject();

    var io = new ImportOptions(aiFile);
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
    comp.frameRate = 24.0;
    comp.motionBlur = true;

    function getLayer(name) {
        try {
            return comp.layer(name);
        } catch(e) {
            return null;
        }
    }

    // 1. Re-stack background layers to the bottom
    var bgBase = getLayer("BG_Base");
    var bg = getLayer("BG");
    var bgBorder = getLayer("BG_Border");

    if (bgBase) bgBase.moveToEnd();
    if (bg) bg.moveToEnd();
    if (bgBorder) bgBorder.moveToEnd();

    for (var s = 6; s >= 1; s--) {
        var star = getLayer("BG_Star_" + s);
        if (star) star.moveToEnd();
    }

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

    // Continuous rasterization & motion blur
    for (var i = 1; i <= comp.numLayers; i++) {
        var l = comp.layer(i);
        try { l.collapseTransformation = true; } catch(e) {}
        if (l.name.indexOf("BG") === -1) {
            l.motionBlur = true;
        }
    }

    // 2. Static Backgrounds & Rotating Stars (0s - 10s)
    if (bgBase) { bgBase.inPoint = 0; bgBase.outPoint = 10; }
    if (bg) { bg.inPoint = 0; bg.outPoint = 10; }
    if (bgBorder) { bgBorder.inPoint = 0; bgBorder.outPoint = 10; }

    for (var s = 1; s <= 6; s++) {
        var star = getLayer("BG_Star_" + s);
        if (star) {
            star.inPoint = 0;
            star.outPoint = 10;
            var r = star.transform.rotation;
            while (r.numKeys > 0) r.removeKey(1);
            var k1 = r.addKey(0);
            r.setValueAtKey(k1, 0);
            var k2 = r.addKey(10);
            r.setValueAtKey(k2, (s % 2 === 1) ? 360 : -360);
            r.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            r.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        }
    }

    // 3. Header Animation (0.20s - 1.30s)
    function animateHeaderDrop(layerName, tIn, tDrop, tFade) {
        var lyr = getLayer(layerName);
        if (!lyr) return;
        lyr.inPoint = tIn;
        lyr.outPoint = 10;
        var p = lyr.transform.position;
        var op = lyr.transform.opacity;
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

    animateHeaderDrop("Header_Logo", 0.20, 0.55, 0.40);
    animateHeaderDrop("Header_Title", 0.50, 0.55, 0.40);
    animateHeaderDrop("Header_Specials", 0.75, 0.55, 0.40);

    // 4. Product Offers (4-Step Sequence per Offer)
    function animateProduct(prefix, tStart, slideDeltaX) {
        var prod = getLayer(prefix + "_Product");
        var badge = getLayer(prefix + "_Badge");
        var title = getLayer(prefix + "_Title");
        var price = getLayer(prefix + "_PriceTag");

        // Step 1: Bottle Scale & Fade
        if (prod) {
            prod.inPoint = tStart;
            prod.outPoint = 10;
            var sc = prod.transform.scale;
            var op = prod.transform.opacity;
            while (sc.numKeys > 0) sc.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var k1 = sc.addKey(tStart);
            sc.setValueAtKey(k1, [92, 92, 100]);
            sc.setTemporalEaseAtKey(k1, makeArray(easeIn60, 3), makeArray(easeIn60, 3));

            var k2 = sc.addKey(tStart + 0.50);
            sc.setValueAtKey(k2, [100, 100, 100]);
            sc.setTemporalEaseAtKey(k2, makeArray(easeOut85, 3), makeArray(easeOut85, 3));

            var ok1 = op.addKey(tStart);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey(tStart + 0.50);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 2: Badge Pop with Bounce
        var tBadge = tStart + 0.35;
        if (badge) {
            badge.inPoint = tBadge;
            badge.outPoint = 10;
            var sc = badge.transform.scale;
            var op = badge.transform.opacity;
            while (sc.numKeys > 0) sc.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var k1 = sc.addKey(tBadge);
            sc.setValueAtKey(k1, [0, 0, 100]);
            sc.setTemporalEaseAtKey(k1, makeArray(easeIn70, 3), makeArray(easeIn70, 3));

            var k2 = sc.addKey(tBadge + 0.30);
            sc.setValueAtKey(k2, [108, 108, 100]);
            sc.setTemporalEaseAtKey(k2, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

            var k3 = sc.addKey(tBadge + 0.50);
            sc.setValueAtKey(k3, [100, 100, 100]);
            sc.setTemporalEaseAtKey(k3, makeArray(easeOut85, 3), makeArray(easeOut85, 3));

            var ok1 = op.addKey(tBadge);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey(tBadge + 0.28);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 3: Name with Shape Horizontal Slide
        var tTitle = tStart + 0.70;
        if (title) {
            title.inPoint = tTitle;
            title.outPoint = 10;
            var p = title.transform.position;
            var op = title.transform.opacity;
            var finalPos = [p.value[0], p.value[1], p.value[2] || 0];
            while (p.numKeys > 0) p.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var pk1 = p.addKey(tTitle);
            p.setValueAtKey(pk1, [finalPos[0] + slideDeltaX, finalPos[1], 0]);
            p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

            var pk2 = p.addKey(tTitle + 0.60);
            p.setValueAtKey(pk2, finalPos);
            p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

            var ok1 = op.addKey(tTitle);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey(tTitle + 0.45);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }

        // Step 4: Bottom Text (PriceTag) 3D Fold Down
        var tPrice = tStart + 1.10;
        if (price) {
            price.inPoint = tPrice;
            price.outPoint = 10;
            price.threeDLayer = true;
            var rx = price.transform.xRotation;
            var op = price.transform.opacity;
            while (rx.numKeys > 0) rx.removeKey(1);
            while (op.numKeys > 0) op.removeKey(1);

            var rk1 = rx.addKey(tPrice);
            rx.setValueAtKey(rk1, -90);
            rx.setTemporalEaseAtKey(rk1, [easeIn70], [easeIn70]);

            var rk2 = rx.addKey(tPrice + 0.32);
            rx.setValueAtKey(rk2, 16);
            rx.setTemporalEaseAtKey(rk2, [easeBounceMid], [easeBounceMid]);

            var rk3 = rx.addKey(tPrice + 0.48);
            rx.setValueAtKey(rk3, -6);
            rx.setTemporalEaseAtKey(rk3, [easeBounceMid], [easeBounceMid]);

            var rk4 = rx.addKey(tPrice + 0.65);
            rx.setValueAtKey(rk4, 0);
            rx.setTemporalEaseAtKey(rk4, [easeOut85], [easeOut85]);

            var ok1 = op.addKey(tPrice);
            op.setValueAtKey(ok1, 0);
            op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

            var ok2 = op.addKey(tPrice + 0.22);
            op.setValueAtKey(ok2, 100);
            op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
        }
    }

    animateProduct("Offer1", 1.35, -80);
    animateProduct("Offer2", 3.00, 80);
    animateProduct("Offer3", 4.65, 80);

    // 5. Offer 4 / Bottom Callout Box (6.30s - 9.00s)
    var o4Base = getLayer("Offer4_Base");
    var o4Text = getLayer("Offer4_Text");
    var o4Price = getLayer("Offer4_PriceTag");

    if (o4Base) {
        o4Base.inPoint = 6.30;
        o4Base.outPoint = 10;
        var p = o4Base.transform.position;
        var op = o4Base.transform.opacity;
        var finalPos = [p.value[0], p.value[1], p.value[2] || 0];
        while (p.numKeys > 0) p.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var pk1 = p.addKey(6.30);
        p.setValueAtKey(pk1, [finalPos[0] - 80, finalPos[1] + 40, 0]);
        p.setTemporalEaseAtKey(pk1, [easeIn60], [easeIn60]);

        var pk2 = p.addKey(6.90);
        p.setValueAtKey(pk2, finalPos);
        p.setTemporalEaseAtKey(pk2, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(6.30);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey(6.65);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    if (o4Text) {
        o4Text.inPoint = 6.65;
        o4Text.outPoint = 10;
        var op = o4Text.transform.opacity;
        while (op.numKeys > 0) op.removeKey(1);
        var ok1 = op.addKey(6.65);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);
        var ok2 = op.addKey(7.00);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);
    }

    if (o4Price) {
        o4Price.inPoint = 6.95;
        o4Price.outPoint = 10;
        o4Price.threeDLayer = true;
        var rx = o4Price.transform.xRotation;
        var sc = o4Price.transform.scale;
        var op = o4Price.transform.opacity;
        while (rx.numKeys > 0) rx.removeKey(1);
        while (sc.numKeys > 0) sc.removeKey(1);
        while (op.numKeys > 0) op.removeKey(1);

        var rk1 = rx.addKey(6.95);
        rx.setValueAtKey(rk1, -90);
        rx.setTemporalEaseAtKey(rk1, [easeIn70], [easeIn70]);

        var rk2 = rx.addKey(7.27);
        rx.setValueAtKey(rk2, 16);
        rx.setTemporalEaseAtKey(rk2, [easeBounceMid], [easeBounceMid]);

        var rk3 = rx.addKey(7.43);
        rx.setValueAtKey(rk3, -6);
        rx.setTemporalEaseAtKey(rk3, [easeBounceMid], [easeBounceMid]);

        var rk4 = rx.addKey(7.60);
        rx.setValueAtKey(rk4, 0);
        rx.setTemporalEaseAtKey(rk4, [easeOut85], [easeOut85]);

        var ok1 = op.addKey(6.95);
        op.setValueAtKey(ok1, 0);
        op.setTemporalEaseAtKey(ok1, [easeOut75], [easeOut75]);

        var ok2 = op.addKey(7.17);
        op.setValueAtKey(ok2, 100);
        op.setTemporalEaseAtKey(ok2, [easeOut75], [easeOut75]);

        // Attention pulse settling right at 9.00s
        var sk1 = sc.addKey(7.60);
        sc.setValueAtKey(sk1, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk1, makeArray(easeOut75, 3), makeArray(easeOut75, 3));

        var sk2 = sc.addKey(8.20);
        sc.setValueAtKey(sk2, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk2, makeArray(easeOut75, 3), makeArray(easeOut75, 3));

        var sk3 = sc.addKey(8.60);
        sc.setValueAtKey(sk3, [108, 108, 100]);
        sc.setTemporalEaseAtKey(sk3, makeArray(easeBounceMid, 3), makeArray(easeBounceMid, 3));

        var sk4 = sc.addKey(9.00);
        sc.setValueAtKey(sk4, [100, 100, 100]);
        sc.setTemporalEaseAtKey(sk4, makeArray(easeOut85, 3), makeArray(easeOut85, 3));
    }

    // 6. Save Project
    var saveFile = aepOutputPath ? new File(aepOutputPath) : new File(aiFile.path + "/" + aiFile.name.replace(/\.ai$/i, ".aep"));
    app.project.save(saveFile);
    return "SUCCESS: Project saved to " + saveFile.fsName;
}
