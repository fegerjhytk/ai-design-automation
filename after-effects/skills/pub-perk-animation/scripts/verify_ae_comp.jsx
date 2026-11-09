// ExtendScript for Adobe After Effects
// Validates motion timing, 10s duration, 0-9s active timeline, 1s static hold, and keyframes

function verifyComp(reportPath) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        for (var i = 1; i <= app.project.items.length; i++) {
            if (app.project.items[i] instanceof CompItem) {
                comp = app.project.items[i];
                break;
            }
        }
    }
    if (!comp) throw new Error("No composition found in active project");

    var report = {
        compName: comp.name,
        width: comp.width,
        height: comp.height,
        duration: comp.duration,
        fps: comp.frameRate,
        motionBlur: comp.motionBlur,
        totalLayers: comp.numLayers,
        violations: [],
        layers: []
    };

    if (comp.duration !== 10.0) {
        report.violations.push("Comp duration is " + comp.duration + "s (expected 10.0s)");
    }

    for (var i = 1; i <= comp.numLayers; i++) {
        var l = comp.layer(i);
        var lyrInfo = {
            index: i,
            name: l.name,
            inPoint: l.inPoint,
            outPoint: l.outPoint,
            threeD: l.threeDLayer,
            motionBlur: l.motionBlur,
            collapsed: l.collapseTransformation,
            keyTimes: []
        };

        function checkPropKeys(prop, propName) {
            if (!prop || prop.numKeys === 0) return;
            for (var k = 1; k <= prop.numKeys; k++) {
                var t = prop.keyTime(k);
                lyrInfo.keyTimes.push({ prop: propName, time: t });
                if (t > 9.001 && l.name.indexOf("BG_Star") === -1) {
                    report.violations.push("Layer '" + l.name + "' has keyframe at " + t.toFixed(2) + "s (violates 9.0s static hold rule)");
                }
            }
        }

        checkPropKeys(l.transform.position, "Position");
        checkPropKeys(l.transform.scale, "Scale");
        checkPropKeys(l.transform.opacity, "Opacity");
        checkPropKeys(l.transform.rotation, "Rotation");
        if (l.threeDLayer) {
            checkPropKeys(l.transform.xRotation, "X Rotation");
        }

        report.layers.push(lyrInfo);
    }

    if (reportPath) {
        var f = new File(reportPath);
        f.open("w");
        f.write(JSON.stringify(report, null, 2));
        f.close();
    }

    return "Verification completed. Violations: " + report.violations.length;
}
