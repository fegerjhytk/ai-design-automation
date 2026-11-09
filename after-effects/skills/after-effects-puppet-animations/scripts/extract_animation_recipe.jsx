#include "vendor/json2.js"
#include "puppet_core.jsx"

function extractAnimationRecipe(compNameOrIndex, jsonOutputPath) {
    var P = Puppet, comp = null, i, j, l, p, k, matches = [];
    if (typeof compNameOrIndex === "number") comp = app.project.item(compNameOrIndex);
    else if (compNameOrIndex) {
        for (i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compNameOrIndex) matches.push(item);
        }
        P.assert(matches.length === 1, "Comp name must identify exactly one comp: " + compNameOrIndex);
        comp = matches[0];
    } else comp = app.project.activeItem;
    P.assert(comp instanceof CompItem && comp.numLayers > 0, "Select a nonempty composition explicitly");
    P.index(comp);
    var recipe = {schemaVersion: 2, recipeName: comp.name, duration: comp.duration, frameRate: comp.frameRate,
        width: comp.width, height: comp.height, coordinateMode: "absolute", holdFraction: 0,
        compSettings: {motionBlur: comp.motionBlur, shutterAngle: comp.shutterAngle, shutterPhase: comp.shutterPhase,
            motionBlurSamplesPerFrame: comp.motionBlurSamplesPerFrame, motionBlurAdaptiveSampleLimit: comp.motionBlurAdaptiveSampleLimit,
            renderer: comp.renderer}, layers: []}, latest = 0;
    for (i = 1; i <= comp.numLayers; i++) {
        l = comp.layer(i); P.simpleLayer(l);
        P.assert(l.inPoint >= 0 && Math.abs(l.outPoint - comp.duration) < 0.000001, "Layer must span final hold: " + l.name);
        var record = {name: l.name, threeD: l.threeDLayer, enabled: l.enabled, motionBlur: l.motionBlur,
            continuousRaster: l.collapseTransformation, inPoint: l.inPoint,
            bounds: null, tracks: []};
        var rect = l.sourceRectAtTime(comp.duration - comp.frameDuration, false);
        record.bounds = {left: rect.left, top: rect.top, width: rect.width, height: rect.height};
        latest = Math.max(latest, l.inPoint);
        for (j = 0; j < P.names.length; j++) {
            p = P.prop(l, P.names[j]); if (!p) continue;
            var track = {path: ["ADBE Transform Group", p.matchName],
                base: P.copy(p.valueAtTime(comp.duration - comp.frameDuration, true)), keys: []};
            for (k = 1; k <= p.numKeys; k++) {
                var t = p.keyTime(k);
                P.assert(t >= 0 && t < comp.duration, "Key outside source timeline: " + l.name);
                var key = {time: t, value: P.copy(p.keyValue(k)), inType: P.interpName(p.keyInInterpolationType(k)),
                    outType: P.interpName(p.keyOutInterpolationType(k)), easeIn: P.easeData(p.keyInTemporalEase(k)),
                    easeOut: P.easeData(p.keyOutTemporalEase(k)), temporalContinuous: p.keyTemporalContinuous(k),
                    temporalAuto: p.keyTemporalAutoBezier(k)};
                if (P.spatial(p)) {
                    key.spatialIn = p.keyInSpatialTangent(k); key.spatialOut = p.keyOutSpatialTangent(k);
                    key.spatialContinuous = p.keySpatialContinuous(k); key.spatialAuto = p.keySpatialAutoBezier(k);
                    key.roving = p.keyRoving(k);
                }
                track.keys.push(key); latest = Math.max(latest, t);
            }
            record.tracks.push(track);
        }
        recipe.layers.push(record);
    }
    // Include a shutter margin, then round the hold boundary UP to a source frame.
    var holdStart = Math.ceil((latest + P.shutterMargin(comp) * comp.frameDuration) * comp.frameRate - 0.000001) / comp.frameRate;
    P.assert(holdStart <= comp.duration - comp.frameDuration, "Source has no certifiable static hold");
    recipe.holdFraction = (comp.duration - holdStart) / comp.duration;
    // Preserve a configured hold from our own comps when it is stricter than the inferred hold.
    if (comp.comment.indexOf("PUPPET_V2 ") === 0) {
        var metadata = JSON.parse(comp.comment.substring(10));
        P.assert(metadata.holdStart >= holdStart && metadata.holdStart < comp.duration, "Invalid Puppet hold metadata");
        recipe.holdFraction = (comp.duration - metadata.holdStart) / comp.duration;
    }
    var report = P.audit(comp, comp.duration * (1 - recipe.holdFraction));
    P.assert(!report.violations.length, "Source verification failed: " + report.violations.join("; "));
    P.write(jsonOutputPath, recipe);
    return {output: jsonOutputPath, layers: recipe.layers.length, schemaVersion: 2};
}
