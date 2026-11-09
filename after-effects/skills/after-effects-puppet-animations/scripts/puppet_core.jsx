// ES3-compatible shared runtime. Load vendor/json2.js before this file.
var Puppet = (function () {
    var P = {};
    P.names = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Orientation",
        "ADBE Rotate X", "ADBE Rotate Y", "ADBE Rotate Z", "ADBE Opacity"];
    P.fail = function (s) { throw new Error(s); };
    P.assert = function (ok, s) { if (!ok) P.fail(s); };
    P.finite = function (n) { return typeof n === "number" && isFinite(n); };
    P.copy = function (v) { return v instanceof Array ? v.slice(0) : v; };
    P.name = function (s) { return "$" + s.replace(/^\s+|\s+$/g, "").toLowerCase(); };
    P.allowed = function (name) {
        for (var i = 0; i < P.names.length; i++) if (P.names[i] === name) return true;
        return false;
    };
    P.prop = function (l, n) { return l.property("ADBE Transform Group").property(n); };
    P.read = function (path) {
        var f = new File(path), s;
        f.encoding = "UTF-8";
        P.assert(f.exists && f.open("r"), "Cannot read: " + path);
        try { s = f.read(); } finally { f.close(); }
        return JSON.parse(s);
    };
    P.write = function (path, value) {
        var f = new File(path);
        f.encoding = "UTF-8";
        P.assert(f.open("w"), "Cannot write: " + path);
        try { P.assert(f.write(JSON.stringify(value, null, 2)), "Write failed: " + path); }
        finally { f.close(); }
    };
    P.clear = function (p) {
        P.assert(!p.expressionEnabled, "Expression unsupported: " + p.matchName);
        for (var k = p.numKeys; k > 0; k--) p.removeKey(k);
    };
    P.spatial = function (p) {
        return p.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
            p.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
    };
    P.easeCount = function (p) {
        if (p.propertyValueType === PropertyValueType.TwoD) return 2;
        if (p.propertyValueType === PropertyValueType.ThreeD) return 3;
        return 1; // Spatial position has ONE temporal speed, independent of vector size.
    };
    P.validateValue = function (p, value) {
        var base = p.value, a = base instanceof Array, i;
        P.assert(a === (value instanceof Array), "Scalar/vector mismatch: " + p.matchName);
        if (a) {
            P.assert(value.length === base.length, "Dimension mismatch: " + p.matchName);
            for (i = 0; i < value.length; i++) P.assert(P.finite(value[i]), "Non-finite vector");
        } else P.assert(P.finite(value), "Non-finite scalar");
    };
    P.interpName = function (x) {
        if (x === KeyframeInterpolationType.LINEAR) return "LINEAR";
        if (x === KeyframeInterpolationType.HOLD) return "HOLD";
        if (x === KeyframeInterpolationType.BEZIER) return "BEZIER";
        P.fail("Unknown interpolation");
    };
    P.interp = function (s) {
        P.assert(s === "LINEAR" || s === "HOLD" || s === "BEZIER", "Invalid interpolation: " + s);
        return KeyframeInterpolationType[s];
    };
    P.easeData = function (a) {
        var out = [];
        for (var i = 0; i < a.length; i++) out.push({speed: a[i].speed, influence: a[i].influence});
        return out;
    };
    P.easeObjects = function (p, a, timeScale, factors) {
        P.assert(a && a.length === P.easeCount(p), "Ease dimension mismatch: " + p.matchName);
        var out = [], speed, f;
        for (var i = 0; i < a.length; i++) {
            f = factors instanceof Array ? factors[i] : factors;
            speed = a[i].speed * f / timeScale;
            P.assert(P.finite(speed) && P.finite(a[i].influence) && a[i].influence >= 0.1 && a[i].influence <= 100,
                "Invalid ease: " + p.matchName);
            out.push(new KeyframeEase(speed, a[i].influence));
        }
        return out;
    };
    P.setKeys = function (p, keys, timeScale, mapValue, speedFactors) {
        var times = [], values = [], i, k, prev = -1, d;
        P.assert(P.finite(timeScale) && timeScale > 0, "Invalid time scale");
        for (i = 0; i < keys.length; i++) {
            var t = keys[i].time * timeScale;
            P.assert(P.finite(t) && t >= 0 && t > prev, "Unsorted/colliding key times: " + p.matchName);
            prev = t;
            var v = mapValue ? mapValue(keys[i].value) : keys[i].value;
            P.validateValue(p, v);
            times.push(t); values.push(v);
        }
        P.clear(p);
        if (!times.length) return;
        p.setValuesAtTimes(times, values); // One host call per property for all values.
        for (i = 0; i < keys.length; i++) {
            k = i + 1; d = keys[i];
            p.setInterpolationTypeAtKey(k, P.interp(d.inType), P.interp(d.outType));
            if (d.inType === "BEZIER" || d.outType === "BEZIER") {
                p.setTemporalAutoBezierAtKey(k, false);
                p.setTemporalContinuousAtKey(k, false);
                p.setTemporalEaseAtKey(k, P.easeObjects(p, d.easeIn, timeScale, speedFactors),
                    P.easeObjects(p, d.easeOut, timeScale, speedFactors));
                p.setTemporalContinuousAtKey(k, !!d.temporalContinuous);
                p.setTemporalAutoBezierAtKey(k, !!d.temporalAuto);
            }
            if (P.spatial(p)) {
                p.setSpatialAutoBezierAtKey(k, false);
                p.setSpatialContinuousAtKey(k, false);
                if (d.spatialIn) p.setSpatialTangentsAtKey(k, d.spatialIn, d.spatialOut);
                else { // Generated entrance: straight spatial path, temporal easing only.
                    var zeros = [], z;
                    for (z = 0; z < p.value.length; z++) zeros.push(0);
                    p.setSpatialTangentsAtKey(k, zeros, zeros);
                }
                p.setSpatialContinuousAtKey(k, !!d.spatialContinuous);
                p.setSpatialAutoBezierAtKey(k, !!d.spatialAuto);
            }
        }
        // Roving changes intermediate times: restore only after all geometry is present.
        if (P.spatial(p)) for (i = 1; i < keys.length - 1; i++) p.setRovingAtKey(i + 1, !!keys[i].roving);
    };
    P.track = function (p, times, values) {
        var keys = [], ease = [], i, j;
        for (i = 0; i < P.easeCount(p); i++) ease.push({speed: 0, influence: 85});
        for (j = 0; j < times.length; j++) keys.push({time: times[j], value: values[j],
            inType: "BEZIER", outType: "BEZIER", easeIn: ease, easeOut: ease});
        P.setKeys(p, keys, 1, null, 1);
    };
    P.walk = function (group, fn) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p.propertyType === PropertyType.PROPERTY) fn(p);
            else P.walk(p, fn);
        }
    };
    P.simpleLayer = function (l) {
        P.assert(l instanceof AVLayer && l.source instanceof FootageItem && l.source.mainSource.isStill,
            "Only still-footage artwork supported: " + l.name);
        P.assert(!l.parent && !l.timeRemapEnabled && l.stretch === 100, "Parent/time mapping unsupported: " + l.name);
        P.assert(l.autoOrient === AutoOrientType.NO_AUTO_ORIENT, "Auto-orient unsupported: " + l.name);
        P.assert(l.blendingMode === BlendingMode.NORMAL, "Non-normal blending unsupported: " + l.name);
        P.assert(l.trackMatteType === TrackMatteType.NO_TRACK_MATTE && !l.isTrackMatte,
            "Track mattes unsupported: " + l.name);
        P.assert(!l.adjustmentLayer && !l.guideLayer && !l.solo, "Adjustment/guide/solo layer unsupported: " + l.name);
        P.assert(!l.property("ADBE Effect Parade").numProperties && !l.property("ADBE Mask Parade").numProperties,
            "Effects/masks require explicit recipe adapters: " + l.name);
        var pos = P.prop(l, "ADBE Position");
        P.assert(!pos.dimensionsSeparated, "Separated Position requires an adapter: " + l.name);
        P.walk(l, function (p) {
            P.assert(!p.expressionEnabled, "Expression unsupported: " + l.name + "/" + p.matchName);
            if (p.numKeys) P.assert(p.parentProperty.matchName === "ADBE Transform Group" &&
                P.allowed(p.matchName), "Unsupported animated property: " + l.name + "/" + p.matchName);
        });
    };
    P.index = function (comp) {
        var out = {}, i, l, key;
        for (i = 1; i <= comp.numLayers; i++) {
            l = comp.layer(i); key = P.name(l.name);
            P.assert(!out[key], "Duplicate normalized layer name: " + l.name);
            out[key] = l;
        }
        return out;
    };
    P.match = function (layers, records) {
        var result = [], used = {}, i, j, r, matches, l, key;
        for (i = 0; i < records.length; i++) {
            r = records[i]; matches = [];
            if (r.selector && r.selector.pattern) {
                var re = new RegExp(r.selector.pattern, "i");
                for (key in layers) if (layers.hasOwnProperty(key) && re.test(layers[key].name)) matches.push(layers[key]);
            } else {
                l = layers[P.name(r.name)]; if (l) matches.push(l);
            }
            P.assert(matches.length || r.optional === true, "Recipe has no match: " + r.name);
            for (j = 0; j < matches.length; j++) {
                key = P.name(matches[j].name);
                P.assert(!used[key], "Overlapping recipe selectors: " + matches[j].name);
                used[key] = true; result.push({layer: matches[j], recipe: r});
            }
        }
        for (key in layers) if (layers.hasOwnProperty(key)) P.assert(used[key], "Target layer lacks recipe: " + layers[key].name);
        return result;
    };
    P.role = function (name) {
        // Explicit role prefix wins. Token boundaries avoid matching 'art' in 'party'.
        var n = name.toLowerCase(), m = /^\s*(bg|hero|flap|hook|footer|detail)[:_\- ]/.exec(n);
        if (m) return m[1];
        var t = " " + n.replace(/[^a-z0-9]+/g, " ") + " ";
        if (/ (footer|bottom|deposit|booking|copyright|cta) /.test(t)) return "footer";
        if (/ (card|flap|price|pricetag|tag|rate) /.test(t)) return "flap";
        if (/ (stocking|candy|ornament|hook) /.test(t)) return "hook";
        if (/ (bg|background|wallpaper) /.test(t)) return "bg";
        if (/ (hero|title|logo|header) /.test(t)) return "hero";
        return "detail";
    };
    P.offset = function (v, x, y) { var a = v.slice(0); a[0] += x; a[1] += y; return a; };
    P.multiply = function (v, f) { var a = v.slice(0); a[0] *= f; a[1] *= f; return a; };
    P.pivot = function (l, u, v) {
        // Imported AI only; compensate position for scaled and Z-rotated 2D artwork.
        P.assert(!l.threeDLayer && !l.parent, "Set pivot before enabling 3D: " + l.name);
        var ap = P.prop(l, "ADBE Anchor Point"), pos = P.prop(l, "ADBE Position"),
            s = P.prop(l, "ADBE Scale").value, a = ap.value, p = pos.value,
            r = l.sourceRectAtTime(0, false), angle = P.prop(l, "ADBE Rotate Z").value * Math.PI / 180;
        P.assert(r.width > 0 && r.height > 0, "Empty layer bounds: " + l.name);
        var b = [r.left + u * r.width, r.top + v * r.height],
            dx = (b[0] - a[0]) * s[0] / 100, dy = (b[1] - a[1]) * s[1] / 100;
        ap.setValue(b);
        pos.setValue([p[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
            p[1] + dx * Math.sin(angle) + dy * Math.cos(angle)]);
    };
    P.shutterMargin = function (comp) {
        return comp.motionBlur ? Math.max(1, Math.ceil(Math.max(Math.abs(comp.shutterPhase),
            Math.abs(comp.shutterPhase + comp.shutterAngle)) / 360)) : 1;
    };
    P.audit = function (comp, holdStart) {
        var report = {compName: comp.name, duration: comp.duration, frameRate: comp.frameRate,
            totalLayers: comp.numLayers, holdStart: holdStart, staticHoldDuration: comp.duration - holdStart,
            violations: [], latestKeyTime: 0};
        var epsilon = 0.000001, safeEnd = holdStart - P.shutterMargin(comp) * comp.frameDuration;
        P.assert(holdStart >= 0 && holdStart <= comp.duration - comp.frameDuration, "Invalid static hold");
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i), label = l.name;
            try { P.simpleLayer(l); } catch (e) { report.violations.push(String(e)); }
            if (Math.abs(l.outPoint - comp.duration) > epsilon) report.violations.push(label + ": outPoint");
            if (l.inPoint > safeEnd + epsilon) report.violations.push(label + ": late visibility change");
            if (l.source instanceof CompItem || (l.source instanceof FootageItem && !l.source.mainSource.isStill))
                report.violations.push(label + ": time-varying source cannot certify static hold");
            P.walk(l, function (p) {
                if (p.expressionEnabled) report.violations.push(label + ": expression " + p.matchName);
                for (var k = 1; k <= p.numKeys; k++) {
                    var t = p.keyTime(k);
                    report.latestKeyTime = Math.max(report.latestKeyTime, t);
                    if (t < -epsilon || t > safeEnd + epsilon) report.violations.push(label + ": key outside active window " + p.matchName);
                }
            });
        }
        return report;
    };
    return P;
}());
