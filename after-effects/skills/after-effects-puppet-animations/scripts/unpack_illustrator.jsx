// ES3. The historical function name is retained for CLI compatibility.
// NO ungrouping, child extraction, opacity/effect edits, outlining or layer reordering.
function unpackIllustratorDoc(sourceAiPath, outputAiPath, allowMissingLinks) {
    var source = new File(sourceAiPath), target = new File(outputAiPath || sourceAiPath);
    if (!source.exists) throw new Error('Missing Illustrator source');
    var doc = null, previous = app.userInteractionLevel;
    for (var i = 0; i < app.documents.length; i++) {
        try { if (app.documents[i].fullName.fsName === source.fsName) doc = app.documents[i]; } catch (e) {}
    }
    try {
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        if (!doc) doc = app.open(source);
        if (doc.artboards.length !== 1) throw new Error('Choose a single artboard document explicitly');
        var ab = doc.artboards[0].artboardRect, w = ab[2]-ab[0], h = ab[1]-ab[3];
        var names = {}, units = [], hidden = [], leafCount = 0;
        function scan(parent) {
            var result = {leaves:0, hidden:0, bounds:null, protectedAppearance:false};
            function include(bounds) {
                if (!result.bounds) result.bounds = bounds.slice(0);
                else {
                    result.bounds[0] = Math.min(result.bounds[0],bounds[0]);
                    result.bounds[1] = Math.max(result.bounds[1],bounds[1]);
                    result.bounds[2] = Math.max(result.bounds[2],bounds[2]);
                    result.bounds[3] = Math.min(result.bounds[3],bounds[3]);
                }
            }
            for (var j = 0; j < parent.pageItems.length; j++) {
                var item = parent.pageItems[j];
                if (item.parent !== parent) continue; // Illustrator collections can include descendants.
                if (item.hidden) { result.hidden++; continue; }
                // All groups are atomic because the DOM cannot reliably expose every live appearance.
                if (item.typename === 'GroupItem') {
                    var child = scan(item);
                    result.leaves += child.leaves; result.hidden += child.hidden; result.protectedAppearance = true;
                } else result.leaves++;
                if (item.opacity !== 100 || item.typename === 'NonNativeItem') result.protectedAppearance = true;
                include(item.visibleBounds);
            }
            if (parent.layers) for (var j = 0; j < parent.layers.length; j++) {
                var sub = parent.layers[j];
                if (!sub.visible) { result.hidden++; continue; }
                var child = scan(sub); result.leaves += child.leaves; result.hidden += child.hidden;
                result.protectedAppearance = true;
                if (child.bounds) include(child.bounds);
            }
            return result;
        }
        for (var i = 0; i < doc.layers.length; i++) {
            var layer = doc.layers[i];
            if (!layer.visible || layer.template) { hidden.push(layer.name); continue; }
            var name = layer.name, key = '$' + name;
            if (names[key]) throw new Error('Duplicate top-level layer names require explicit preparation: ' + name);
            names[key] = true;
            var info = scan(layer);
            if (!info.bounds || !info.leaves) continue;
            var b = info.bounds, bw = b[2]-b[0], bh = b[1]-b[3];
            var cx = ((b[0]+b[2])/2-ab[0])/w, cy = (ab[1]-(b[1]+b[3])/2)/h;
            var bg = /^(bg|background|ambient)(_|\b)/i.test(name);
            // A named background is not guessed from being the last AE layer.
            units.push({name:name, cx:cx, cy:cy, width:bw/w, height:bh/h, leaves:info.leaves,
                protectedAppearance:info.protectedAppearance || layer.opacity !== 100, background:bg, hiddenChildren:info.hidden});
            leafCount += info.leaves;
        }
        if (!units.length) throw new Error('No visible artwork');
        var opts = new IllustratorSaveOptions();
        opts.pdfCompatible = true; opts.compressed = true; opts.embedLinkedFiles = !allowMissingLinks;
        // Preserve native appearances; do not force a legacy compatibility version.
        doc.saveAs(target, opts);
        return {output:target.fsName, layers:units.length, units:units, coveredLeaves:leafCount,
            hiddenLayers:hidden, artboard:{width:w,height:h}};
    } finally { app.userInteractionLevel = previous; }
}
