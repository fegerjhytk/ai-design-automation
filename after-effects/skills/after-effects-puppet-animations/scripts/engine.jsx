/* ExtendScript / ES3. Include with #include "engine.jsx".
 * Recipe v1: fresh, unlocked, unparented 2D layers; straight spatial paths.
 * Records animation intent (the recipe itself), not arbitrary existing AE keys.
 * Does not change imported anchors or the Position separation setting.
 */
var AIAnimation = (function () {
    function fail(s) { throw new Error(s); }
    function number(x) { return typeof x === "number" && isFinite(x); }
    function copy(x) { return x instanceof Array ? x.slice(0) : x; }
    function transform(layer, name) {
        return layer.property("ADBE Transform Group").property(name);
    }
    function channels(p) {
        if (!(p.isSeparationLeader && p.dimensionsSeparated)) return [p];
        var n = p.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? 3 : 2;
        var a = [], i;
        for (i = 0; i < n; i++) a.push(p.getSeparationFollower(i));
        return a;
    }
    function read(p) {
        var a = channels(p), v = [], i;
        if (a.length === 1) return copy(p.value);
        for (i = 0; i < a.length; i++) v.push(a[i].value);
        return v;
    }
    function requireStatic(p) {
        var a = channels(p), i;
        if (p.expressionEnabled) fail("Expression on " + p.name);
        for (i = 0; i < a.length; i++) {
            if (a[i].numKeys || a[i].expressionEnabled)
                fail("Expected unanimated property: " + a[i].name);
        }
    }
    function setStatic(p, v) {
        var a = channels(p), i;
        if (a.length === 1) p.setValue(v);
        else for (i = 0; i < a.length; i++) a[i].setValue(v[i]);
    }

    // A_new and A_old are layer-space points. Position is in parent space.
    // P_new = P_old + R * S * (A_new - A_old).
    // Call BEFORE animation. Supports static 2D scale, rotation, and parents.
    function reanchor2D(layer, newAnchor) {
        if (layer.threeDLayer || layer.locked ||
            layer.autoOrient !== AutoOrientType.NO_AUTO_ORIENT)
            fail("Reanchor requires an unlocked 2D layer without auto-orientation");
        if (!(newAnchor instanceof Array) || newAnchor.length !== 2 ||
            !number(newAnchor[0]) || !number(newAnchor[1])) fail("Invalid 2D anchor");
        var a = transform(layer, "ADBE Anchor Point");
        var p = transform(layer, "ADBE Position");
        var s = transform(layer, "ADBE Scale");
        var r = transform(layer, "ADBE Rotate Z");
        requireStatic(a); requireStatic(p); requireStatic(s); requireStatic(r);
        var av = a.value, pv = read(p), sv = s.value;
        var angle = r.value * Math.PI / 180;
        var dx = (newAnchor[0] - av[0]) * sv[0] / 100;
        var dy = (newAnchor[1] - av[1]) * sv[1] / 100;
        var next = [pv[0] + Math.cos(angle) * dx - Math.sin(angle) * dy,
                    pv[1] + Math.sin(angle) * dx + Math.cos(angle) * dy];
        a.setValue(newAnchor);
        setStatic(p, next);
    }

    // Call on a REAL property with an existing key, never a separated leader.
    function easeKey(p, k, inInfluence, outInfluence) {
        if (p.isSeparationLeader && p.dimensionsSeparated)
            fail("Ease the separation followers instead of Position");
        if (!number(inInfluence) || !number(outInfluence) ||
            inInfluence < 0.1 || inInfluence > 100 ||
            outInfluence < 0.1 || outInfluence > 100) fail("Influence must be 0.1..100");
        p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER,
                                       KeyframeInterpolationType.BEZIER);
        p.setTemporalAutoBezierAtKey(k, false);
        p.setTemporalContinuousAtKey(k, false);
        var n = p.keyInTemporalEase(k).length, incoming = [], outgoing = [], i;
        for (i = 0; i < n; i++) {
            incoming.push(new KeyframeEase(0, inInfluence));
            outgoing.push(new KeyframeEase(0, outInfluence));
        }
        p.setTemporalEaseAtKey(k, incoming, outgoing);
    }

    // Position leader -> scalar followers when separated; scalar properties
    // remain scalars. Explicit spatial tangents prevent curved overshoot paths.
    function key(p, time, value, curve) {
        var a = channels(p), i, q, k, zero, j;
        if (a.length > 1 && (!(value instanceof Array) || value.length !== a.length))
            fail("Wrong separated Position value dimensions");
        for (i = 0; i < a.length; i++) {
            q = a[i];
            q.setValueAtTime(time, a.length === 1 ? value : value[i]);
            k = q.nearestKeyIndex(time);
            if (q.isSpatial) {
                q.setRovingAtKey(k, false);
                q.setSpatialAutoBezierAtKey(k, false);
                q.setSpatialContinuousAtKey(k, false);
                zero = [];
                for (j = 0; j < q.keyValue(k).length; j++) zero.push(0);
                q.setSpatialTangentsAtKey(k, zero, zero);
            }
            if (curve === "linear" || curve === "hold") {
                var type = curve === "hold" ? KeyframeInterpolationType.HOLD :
                                              KeyframeInterpolationType.LINEAR;
                q.setInterpolationTypeAtKey(k, type, type);
            } else {
                easeKey(q, k, curve[0], curve[1]);
            }
        }
    }

    function uniqueLayer(comp, name) {
        var found = null, i;
        for (i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name === name) {
            if (found) fail("Duplicate layer name: " + name);
            found = comp.layer(i);
        }
        if (!found) fail("Missing layer: " + name);
        return found;
    }
    function validateCurve(c) {
        if (c === "linear" || c === "hold") return;
        if (!(c instanceof Array) || c.length !== 2 ||
            !number(c[0]) || !number(c[1]) || c[0] < 0.1 || c[0] > 100 ||
            c[1] < 0.1 || c[1] > 100) fail("Invalid curve");
    }
    function checkValue(v, base) {
        var i;
        if (base instanceof Array) {
            if (!(v instanceof Array) || v.length !== base.length) fail("Value dimension mismatch");
            for (i = 0; i < v.length; i++) if (!number(v[i])) fail("Non-numeric value");
        } else if (!number(v)) fail("Expected scalar value");
    }
    function mapValue(mode, v, base, comp) {
        if (mode === "compOffset") return [base[0] + v[0] * comp.width,
                                          base[1] + v[1] * comp.height];
        if (mode === "factor") return [base[0] * v[0], base[1] * v[1]];
        if (mode === "delta") return base + v;
        return copy(v);
    }

    // All validation/baseline capture happens before writing any keys.
    // t = startSeconds + key.u * durationSeconds. Fractions are not frame-rounded.
    function replay(comp, recipe, startSeconds, durationSeconds) {
        if (!(comp instanceof CompItem) || recipe.version !== 1 ||
            recipe.anchorPolicy !== "preserveImported" ||
            !(recipe.tracks instanceof Array) ||
            !number(startSeconds) || !number(durationSeconds) || durationSeconds <= 0)
            fail("Invalid comp, recipe, start, or duration");
        var jobs = [], used = {}, i, j, tr, layer, p, base, keys, entry, id;
        for (i = 0; i < recipe.tracks.length; i++) {
            tr = recipe.tracks[i];
            if (typeof tr.layer !== "string") fail("Expected layer name");
            layer = uniqueLayer(comp, tr.layer);
            if (!(layer instanceof AVLayer) || layer.locked || layer.threeDLayer || layer.parent ||
                layer.autoOrient !== AutoOrientType.NO_AUTO_ORIENT)
                fail("Recipe v1 requires unlocked, unparented 2D AV layers");
            if (!((tr.property === "ADBE Position" && tr.mode === "compOffset") ||
                  (tr.property === "ADBE Scale" && tr.mode === "factor") ||
                  (tr.property === "ADBE Rotate Z" && tr.mode === "delta") ||
                  (tr.property === "ADBE Opacity" && tr.mode === "absolute")))
                fail("Unsupported property/mode");
            id = "$" + layer.index + ":" + tr.property;
            if (used[id]) fail("Merge duplicate tracks before replay");
            used[id] = true;
            p = transform(layer, tr.property);
            requireStatic(p);
            base = read(p);
            if (!(tr.keys instanceof Array) || !tr.keys.length) fail("Empty track");
            keys = [];
            for (j = 0; j < tr.keys.length; j++) {
                entry = tr.keys[j];
                if (!number(entry.u) || entry.u < 0 || entry.u > 1 ||
                    (j && entry.u <= tr.keys[j - 1].u)) fail("Keys must increase within 0..1");
                checkValue(entry.v, base);
                validateCurve(entry.curve);
                if (tr.property === "ADBE Opacity" && (entry.v < 0 || entry.v > 100))
                    fail("Opacity must be 0..100");
                keys.push({t: startSeconds + entry.u * durationSeconds,
                           v: mapValue(tr.mode, entry.v, base, comp), curve: entry.curve});
            }
            jobs.push({p: p, keys: keys});
        }
        app.beginUndoGroup("Replay Illustrator animation recipe");
        try {
            for (i = 0; i < jobs.length; i++) for (j = 0; j < jobs[i].keys.length; j++) {
                entry = jobs[i].keys[j];
                key(jobs[i].p, entry.t, entry.v, entry.curve);
            }
        } finally { app.endUndoGroup(); }
        // Undo groups permit one-step manual Undo; they are not transactions.
    }
    return {reanchor2D: reanchor2D, easeKey: easeKey, key: key, replay: replay};
}());
