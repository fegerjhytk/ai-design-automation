// Adobe After Effects ExtendScript: Export Comp to Smooth Video
// Automates comp duration, framerate harmonic, subcomp synchronization, and rendering.

(function() {
    var result = {
        success: false,
        compName: "",
        duration: 0,
        frameRate: 0,
        outputPath: "",
        projectFolder: "",
        error: ""
    };

    function logError(msg) {
        result.error = msg;
        writeResult(result);
    }

    function writeResult(res) {
        try {
            var f = new File("/tmp/ae_export_result.json");
            f.open("w");
            var json = "{\n" +
                '  "success": ' + res.success + ",\n" +
                '  "compName": "' + (res.compName || "").replace(/"/g, '\\"') + '",\n' +
                '  "duration": ' + (res.duration || 0) + ",\n" +
                '  "frameRate": ' + (res.frameRate || 0) + ",\n" +
                '  "outputPath": "' + (res.outputPath || "").replace(/"/g, '\\"') + '",\n' +
                '  "projectFolder": "' + (res.projectFolder || "").replace(/"/g, '\\"') + '",\n' +
                '  "error": "' + (res.error || "").replace(/"/g, '\\"') + '"\n' +
                "}";
            f.write(json);
            f.close();
        } catch(e) {}
    }

    try {
        // Read configuration file if present
        var configFile = new File("/tmp/ae_export_config.json");
        var compName = "";
        var targetFps = 50.0;
        var targetDuration = 0.0; // 0 means keep current
        var outputPath = "/private/tmp/ae_export_temp.mp4";
        var projectPath = "";

        if (configFile.exists) {
            configFile.open("r");
            var configContent = configFile.read();
            configFile.close();
            try {
                var matchComp = configContent.match(/"compName"\s*:\s*"([^"]+)"/);
                if (matchComp) compName = matchComp[1];
                var matchFps = configContent.match(/"targetFps"\s*:\s*([0-9.]+)/);
                if (matchFps) targetFps = parseFloat(matchFps[1]);
                var matchDur = configContent.match(/"targetDuration"\s*:\s*([0-9.]+)/);
                if (matchDur) targetDuration = parseFloat(matchDur[1]);
                var matchOut = configContent.match(/"outputPath"\s*:\s*"([^"]+)"/);
                if (matchOut) outputPath = matchOut[1];
                var matchProj = configContent.match(/"projectPath"\s*:\s*"([^"]+)"/);
                if (matchProj) projectPath = matchProj[1];
            } catch(eParse) {}
        }

        // If project path provided or app.project has no items, attempt to open
        if (projectPath && projectPath !== "") {
            var pf = new File(projectPath);
            if (pf.exists) {
                if (!app.project || !app.project.file || app.project.file.fsName !== pf.fsName) {
                    app.open(pf);
                }
            }
        }

        if (!app.project) {
            logError("No active project open in After Effects.");
            return;
        }

        // Clean helper to trim strings
        function clean(s) {
            return (s || "").replace(/^\s+|\s+$/g, "").toLowerCase();
        }

        // Find composition
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
        if (app.project && app.project.file) {
            result.projectFolder = app.project.file.parent.fsName;
        }

        // Apply duration if requested
        if (targetDuration > 0) {
            comp.duration = targetDuration;
        }
        var finalDuration = comp.duration;
        result.duration = finalDuration;

        // Apply frame rate
        comp.frameRate = targetFps;
        result.frameRate = targetFps;

        // Helper to safely set inPoint and outPoint even if layer is locked
        function setLayerSpan(ly, dur) {
            try {
                var wasLocked = ly.locked;
                if (wasLocked) ly.locked = false;
                ly.inPoint = 0;
                ly.outPoint = dur;
                if (wasLocked) ly.locked = true;
            } catch(e) {}
        }

        // Recursively extend and sync all sub-compositions and layers
        function syncSubComps(parentComp, dur, fps) {
            for (var j = 1; j <= parentComp.numLayers; j++) {
                var layer = parentComp.layer(j);
                if (layer.source && layer.source instanceof CompItem) {
                    var sub = layer.source;
                    if (sub.duration < dur) {
                        sub.duration = dur;
                    }
                    sub.frameRate = fps;
                    for (var k = 1; k <= sub.numLayers; k++) {
                        var subLayer = sub.layer(k);
                        setLayerSpan(subLayer, dur);
                    }
                    syncSubComps(sub, dur, fps);
                }
                setLayerSpan(layer, dur);
            }
        }
        syncSubComps(comp, finalDuration, targetFps);

        // Check if there is a linear looping null/controller with 2 keyframes
        for (var lIdx = 1; lIdx <= comp.numLayers; lIdx++) {
            var curLayer = comp.layer(lIdx);
            try {
                var posProp = curLayer.property("Transform").property("Position");
                if (posProp && posProp.numKeys === 2) {
                    var t2 = posProp.keyTime(2);
                    if (Math.abs(t2 - finalDuration) < 1.0 || t2 > finalDuration - 0.5) {
                        var val1 = posProp.keyValue(1);
                        var val2 = posProp.keyValue(2);
                        posProp.removeKey(2);
                        posProp.removeKey(1);
                        posProp.setValueAtTime(0.0, val1);
                        posProp.setValueAtTime(finalDuration, val2);
                        posProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
                        posProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
                    }
                }
            } catch(eKey) {}
        }

        // Configure Render Queue
        var rq = app.project.renderQueue;
        while (rq.numItems > 0) {
            rq.item(1).remove();
        }

        var rqItem = rq.items.add(comp);
        var om = rqItem.outputModule(1);
        try {
            om.applyTemplate("H.264 - Match Render Settings - 15 Mbps");
        } catch(eTpl) {
            try {
                om.applyTemplate("High Quality");
            } catch(eTpl2) {}
        }
        om.file = new File(outputPath);
        result.outputPath = om.file.fsName;

        // Save project state
        app.project.save();

        // Render synchronously
        try { app.beginSuppressDialogs(); } catch(eSD) {}
        rq.render();
        try { app.endSuppressDialogs(false); } catch(eED) {}

        result.success = true;
        writeResult(result);
    } catch(eGlobal) {
        logError("ExtendScript Exception: " + eGlobal.toString());
    }
})();
