// Apply Organic Wave & Buoyancy Motion to Badges, Text, and CTA
// Compatibility: Adobe After Effects 2026+
// Usage: File > Scripts > Run Script File... or invoke via osascript/ExtendScript

app.beginUndoGroup("Apply Organic Wave & Buoyancy Motion");

(function() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        // Fallback: search for active commercial comp
        for (var i = 1; i <= app.project.items.length; i++) {
            if (app.project.items[i] instanceof CompItem && app.project.items[i].name.indexOf("Promo_9-16") !== -1) {
                comp = app.project.items[i];
                break;
            }
        }
    }

    if (!comp) {
        alert("Please select or open the commercial composition first.");
        return;
    }

    // 1. Badge Float (Child Layer)
    var bubblePosExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var seed = index * 1.37;",
        "var xW = Math.sin(t * 2.1 + seed) * 4.0 * blend;",
        "var yW = Math.cos(t * 1.6 + seed) * 6.0 * blend;",
        "value + [xW, yW, 0];"
    ].join("\n");

    // 2. Badge Tilt (Child Layer)
    var bubbleRotExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var seed = index * 0.95;",
        "value + Math.sin(t * 1.8 + seed) * 2.5 * blend;"
    ].join("\n");

    // 3. Badge 2D Scale Breathing (Child Layer)
    var bubbleScaleExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var seed = index * 1.1;",
        "var s = Math.sin(t * 2.3 + seed) * 0.02 * blend;",
        "[value[0] * (1 + s), value[1] * (1 + s)];"
    ].join("\n");

    // 4. Text Callout Float (Parent Layer)
    var textPosExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.4);",
        "var seed = index * 1.45;",
        "var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;",
        "var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;",
        "value + [xW, yW, 0];"
    ].join("\n");

    // 5. CTA Button Pulse (ORDER NOW / Shape)
    var ctaPulseExpr = [
        "var t = Math.max(0, time - inPoint);",
        "var blend = Math.min(1.0, t / 0.5);",
        "var s = Math.sin(t * 3.2) * 1.8 * blend;",
        "[value[0] + s, value[1] + s];"
    ].join("\n");

    var modifiedCount = 0;
    var errors = [];

    for (var j = 1; j <= comp.numLayers; j++) {
        var l = comp.layer(j);
        var nameLower = l.name.toLowerCase();

        // Detect Badge Container (has parent text or contains keyword bubble/pill/sticker/shape)
        var isBadge = (l.parent !== null && l.property("Source Text") === null && (nameLower.indexOf("bubble") !== -1 || nameLower.indexOf("sticker") !== -1 || nameLower.indexOf("pill") !== -1 || nameLower.indexOf("badge") !== -1 || nameLower.indexOf("holographic") !== -1));

        if (isBadge) {
            if (l.property("Position")) {
                l.property("Position").expression = bubblePosExpr;
                if (l.property("Position").expressionError !== "") errors.push(l.name + " Pos: " + l.property("Position").expressionError);
            }
            if (l.property("Rotation")) {
                l.property("Rotation").expression = bubbleRotExpr;
                if (l.property("Rotation").expressionError !== "") errors.push(l.name + " Rot: " + l.property("Rotation").expressionError);
            }
            if (l.property("Scale")) {
                l.property("Scale").expression = bubbleScaleExpr;
                if (l.property("Scale").expressionError !== "") errors.push(l.name + " Scl: " + l.property("Scale").expressionError);
            }
            modifiedCount++;
        }

        // Detect Text Callout (Parent of a badge)
        var isTextCallout = (l.property("Source Text") !== null && (nameLower.indexOf("heat on demand") !== -1 || nameLower.indexOf("rust") !== -1 || nameLower.indexOf("seconds") !== -1 || nameLower.indexOf("shock") !== -1 || nameLower.indexOf("luxury") !== -1 || nameLower.indexOf("warmth") !== -1 || nameLower.indexOf("stops here") !== -1));

        if (isTextCallout && l.property("Position")) {
            l.property("Position").expression = textPosExpr;
            if (l.property("Position").expressionError !== "") errors.push(l.name + " Pos: " + l.property("Position").expressionError);
            modifiedCount++;
        }

        // Detect CTA Elements
        if (nameLower.indexOf("order now") !== -1 || nameLower.indexOf("cta_button") !== -1) {
            if (l.property("Scale")) {
                l.property("Scale").expression = ctaPulseExpr;
                if (l.property("Scale").expressionError !== "") errors.push(l.name + " Scale: " + l.property("Scale").expressionError);
                modifiedCount++;
            }
        }
    }

    if (errors.length > 0) {
        alert("Completed with errors:\n" + errors.join("\n"));
    } else {
        alert("Successfully applied buoyancy wave & wiggle expressions to " + modifiedCount + " layer properties!");
    }
})();

app.endUndoGroup();
