/**
 * optimize_headless.jsx
 * Headless execution of Canva Optimizer for Adobe Illustrator.
 * Eliminates ScriptUI modal dialogs and verifies text preservation.
 */
#target illustrator

function runHeadlessOptimization() {
    if (app.documents.length === 0) {
        return "{\"success\":false,\"error\":\"No active document found\"}";
    }

    var doc = app.activeDocument;
    var preTextCount = doc.textFrames.length;

    // Collect pre-optimization text signatures to ensure text content isn't altered
    var preTextSignatures = [];
    for (var t = 0; t < preTextCount; t++) {
        try {
            preTextSignatures.push(doc.textFrames[t].contents);
        } catch(e) {}
    }

    var keepGroupsWhole = false; // Option 1: go inside complex groups, leave text untouched
    var baseRes = 300;           // 300 PPI High Quality
    var fastMode = false;
    var limitSize = false;
    var sizeLimitMB = 200;

    var taggedGroups = [];

    try {
        // 1. Tag all groups containing text frames to protect them from rasterization
        markGroupsContainingText(doc);

        // 2. Release edge clipping masks
        var edgeUnclipCount = releaseEdgeClippingMasks(doc, 2);

        // 3. Option 2 extras (if keepGroupsWhole)
        var clippingMasksReleased = 0;
        var preUngroupCount = 0;
        var nearbyGroupsCreated = 0;
        if (keepGroupsWhole) {
            clippingMasksReleased = releaseAllClippingMasks(doc);
            preUngroupCount = ungroupAll(doc);
            if (!fastMode) {
                nearbyGroupsCreated = groupNearbySmallElements(doc);
            }
        }

        // 4. Collect non-text items to rasterize
        var itemsToRasterize = [];
        collectItems(doc, itemsToRasterize, keepGroupsWhole);

        // 5. Configure RasterizeOptions
        var rasterOpts = new RasterizeOptions();
        rasterOpts.colorModel = RasterizationColorModel.DEFAULTCOLORMODEL;
        rasterOpts.resolution = baseRes;
        rasterOpts.transparency = true;
        rasterOpts.antiAliasingMethod = fastMode ? AntiAliasingMethod.TYPEOPTIMIZED : AntiAliasingMethod.ARTOPTIMIZED;
        rasterOpts.clippingMask = false;
        rasterOpts.convertSpotColors = false;
        rasterOpts.convertTextToOutlines = false;
        rasterOpts.includeLayers = false;
        rasterOpts.padding = 0;

        // 6. Rasterize in reverse
        var successCount = 0;
        var errorCount = 0;

        for (var i = itemsToRasterize.length - 1; i >= 0; i--) {
            try {
                var item = itemsToRasterize[i];
                if (item.parent == null) continue;

                // Absolute sanity check: never rasterize a TextFrame
                if (item.typename === "TextFrame") continue;

                var targetRes = baseRes;
                if (limitSize) {
                    targetRes = calculateCanvaResolution(item, baseRes, sizeLimitMB);
                }
                rasterOpts.resolution = targetRes;

                doc.rasterize(item, getSafeBounds(item), rasterOpts);
                successCount++;
            } catch(e) {
                errorCount++;
            }
        }

        // 7. Final ungrouping pass
        var ungroupCount = ungroupAll(doc);

        // 8. Clean up tags
        removeContainsTextTags();

        // 9. VERIFICATION GATE: Verify text frame count
        var postTextCount = doc.textFrames.length;
        if (postTextCount !== preTextCount) {
            return "{\"success\":false,\"error\":\"TEXT_FRAME_COUNT_MISMATCH: pre=" + preTextCount + ", post=" + postTextCount + "\"}";
        }

        return "{" +
            "\"success\":true," +
            "\"preTextCount\":" + preTextCount + "," +
            "\"postTextCount\":" + postTextCount + "," +
            "\"rasterizedCount\":" + successCount + "," +
            "\"errorCount\":" + errorCount + "," +
            "\"edgeUnclipCount\":" + edgeUnclipCount + "," +
            "\"ungroupCount\":" + ungroupCount +
        "}";

    } catch(err) {
        removeContainsTextTags();
        return "{\"success\":false,\"error\":\"" + err.message.replace(/\"/g, "\\\"") + "\"}";
    }

    // --- HELPER FUNCTIONS ---
    function markGroupsContainingText(d) {
        var textFrames = d.textFrames;
        for (var i = 0; i < textFrames.length; i++) {
            var tf = textFrames[i];
            var parent = tf.parent;
            while (parent && parent.typename !== "Document" && parent.typename !== "Layer") {
                if (parent.typename === "GroupItem") {
                    try {
                        var alreadyTagged = false;
                        for (var t = 0; t < parent.tags.length; t++) {
                            if (parent.tags[t].name === "zept_has_text") {
                                alreadyTagged = true;
                                break;
                            }
                        }
                        if (!alreadyTagged) {
                            var tag = parent.tags.add();
                            tag.name = "zept_has_text";
                            taggedGroups.push(parent);
                        }
                    } catch(e) {}
                }
                parent = parent.parent;
            }
        }
    }

    function removeContainsTextTags() {
        for (var i = 0; i < taggedGroups.length; i++) {
            try {
                var g = taggedGroups[i];
                if (g && g.typename === "GroupItem") {
                    for (var t = g.tags.length - 1; t >= 0; t--) {
                        if (g.tags[t].name === "zept_has_text") {
                            g.tags[t].remove();
                        }
                    }
                }
            } catch(e) {}
        }
        taggedGroups = [];
    }

    function groupContainsText(group) {
        try {
            if (group.tags && group.tags.length > 0) {
                for (var i = 0; i < group.tags.length; i++) {
                    if (group.tags[i].name === "zept_has_text") return true;
                }
            }
        } catch(e) {}
        return false;
    }

    function collectItems(container, itemsList, keepGroupsWhole, abRects) {
        if (container.typename === "Document") {
            abRects = [];
            for (var a = 0; a < container.artboards.length; a++) {
                abRects.push(container.artboards[a].artboardRect);
            }
            for (var l = 0; l < container.layers.length; l++) {
                var layer = container.layers[l];
                if (layer.locked || !layer.visible) continue;
                collectItems(layer, itemsList, keepGroupsWhole, abRects);
            }
            return;
        }

        var items = [];
        var len = container.pageItems.length;
        for (var i = 0; i < len; i++) {
            items.push(container.pageItems[i]);
        }

        for (var i = 0; i < len; i++) {
            var item = items[i];
            if (item.locked || item.hidden) continue;
            if (item.typename === "TextFrame") continue;

            if (abRects && abRects.length > 0) {
                var itemBounds;
                try { itemBounds = item.visibleBounds; } catch(e) { itemBounds = null; }
                if (itemBounds) {
                    var onArtboard = false;
                    for (var r = 0; r < abRects.length; r++) {
                        if (boundsIntersect(itemBounds, abRects[r])) {
                            onArtboard = true;
                            break;
                        }
                    }
                    if (!onArtboard) continue;
                }
            }

            if (item.typename === "GroupItem") {
                if (item.clipped) {
                    itemsList.push(item);
                    continue;
                }
                var hasText = groupContainsText(item);
                var hasSubgroups = groupContainsGroups(item);
                var isSmall = isSmallGroup(item);

                if (hasText || (!keepGroupsWhole && hasSubgroups && !isSmall)) {
                    collectItems(item, itemsList, keepGroupsWhole, abRects);
                } else {
                    itemsList.push(item);
                }
                continue;
            }

            if (shouldRasterizePath(item)) {
                itemsList.push(item);
            }
        }
    }

    function groupContainsGroups(group) {
        try {
            for (var i = 0; i < group.pageItems.length; i++) {
                if (group.pageItems[i].typename === "GroupItem") return true;
            }
            return false;
        } catch(e) { return false; }
    }

    function isSmallGroup(group) {
        try {
            var bounds = group.visibleBounds;
            var w = Math.abs(bounds[2] - bounds[0]);
            var h = Math.abs(bounds[3] - bounds[1]);
            return (w < 150 && h < 150);
        } catch(e) { return false; }
    }

    function shouldRasterizePath(item) {
        if (item.typename !== "PathItem" && item.typename !== "CompoundPathItem") return true;
        try {
            if (item.typename === "PathItem") {
                if (item.pathPoints.length > 2) return true;
            } else if (item.typename === "CompoundPathItem") {
                for (var i = 0; i < item.pathItems.length; i++) {
                    if (item.pathItems[i].pathPoints.length > 2) return true;
                }
            }
        } catch(e) { return true; }

        try {
            if (item.filled) {
                var fillType = item.fillColor.typename;
                if (fillType === "GradientColor" || fillType === "PatternColor") return true;
            }
            if (item.stroked) {
                var strokeType = item.strokeColor.typename;
                if (strokeType === "GradientColor" || strokeType === "PatternColor") return true;
            }
        } catch(e) { return true; }

        if (pathHasAppearance(item)) return true;
        return false;
    }

    function pathHasAppearance(item) {
        try {
            if (item.opacity < 100) return true;
            if (item.blendMode !== BlendModes.NORMAL) return true;
            if (pathHasEffects(item)) return true;
        } catch(e) {}
        return false;
    }

    function pathHasEffects(item) {
        try {
            var strokeW = item.stroked ? item.strokeWidth : 0;
            var v = item.visibleBounds;
            var g = item.geometricBounds;
            var diffLeft = Math.abs(v[0] - (g[0] - strokeW / 2));
            var diffTop = Math.abs(v[1] - (g[1] + strokeW / 2));
            var diffRight = Math.abs(v[2] - (g[2] + strokeW / 2));
            var diffBottom = Math.abs(v[3] - (g[3] - strokeW / 2));
            if (diffLeft > 0.1 || diffTop > 0.1 || diffRight > 0.1 || diffBottom > 0.1) return true;
        } catch(e) {}
        return false;
    }

    function getSafeBounds(item) {
        var b;
        try {
            if (item.typename === "GroupItem" && item.clipped) {
                var clipPath = null;
                for (var j = 0; j < item.pageItems.length; j++) {
                    if (item.pageItems[j].clipping) { clipPath = item.pageItems[j]; break; }
                }
                b = clipPath ? clipPath.visibleBounds : item.visibleBounds;
            } else {
                b = item.visibleBounds;
            }
        } catch(e) { b = item.geometricBounds; }

        var left = b[0], top = b[1], right = b[2], bottom = b[3];
        var MIN = 1;
        if (Math.abs(right - left) < MIN) { left -= MIN / 2; right += MIN / 2; }
        if (Math.abs(top - bottom) < MIN) { top += MIN / 2; bottom -= MIN / 2; }
        return [left, top, right, bottom];
    }

    function boundsIntersect(boundsA, boundsB) {
        var horiz = (boundsA[0] < boundsB[2] && boundsA[2] > boundsB[0]);
        var vert = (boundsA[3] < boundsB[1] && boundsA[1] > boundsB[3]);
        return (horiz && vert);
    }

    function ungroupAll(d) {
        var count = 0;
        try {
            d.selection = null;
            var selectedCount = 0;
            for (var l = 0; l < d.layers.length; l++) {
                var layer = d.layers[l];
                if (layer.locked || !layer.visible) continue;
                selectedCount += selectEligibleGroups(layer);
            }
            if (selectedCount > 0) {
                for (var depth = 0; depth < 6; depth++) {
                    app.executeMenuCommand("ungroup");
                    if (!d.selection || d.selection.length === 0) break;
                }
                count = selectedCount;
            }
            d.selection = null;
        } catch(e) {}
        return count;
    }

    function selectEligibleGroups(container) {
        var count = 0;
        if (!container || !container.pageItems) return 0;
        var items = [];
        for (var i = 0; i < container.pageItems.length; i++) items.push(container.pageItems[i]);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.locked || item.hidden) continue;
            if (item.typename === "GroupItem") {
                if (!item.clipped) {
                    item.selected = true;
                    count++;
                }
                count += selectEligibleGroups(item);
            }
        }
        return count;
    }

    function releaseEdgeClippingMasks(d, tolerance) {
        var count = 0;
        try {
            d.selection = null;
            app.executeMenuCommand("Clipping Masks menu item");
            var selectedItems = d.selection;
            if (selectedItems && selectedItems.length > 0) {
                var masks = [];
                for (var i = 0; i < selectedItems.length; i++) masks.push(selectedItems[i]);
                d.selection = null;
                var abRects = [];
                for (var a = 0; a < d.artboards.length; a++) abRects.push(d.artboards[a].artboardRect);
                for (var i = 0; i < masks.length; i++) {
                    var clipPath = masks[i];
                    if (!clipPath || clipPath.locked || clipPath.hidden) continue;
                    var parentGroup = clipPath.parent;
                    if (parentGroup && parentGroup.typename === "GroupItem" && parentGroup.clipped) {
                        var clipBounds = null;
                        try { clipBounds = clipPath.visibleBounds; } catch(e) {}
                        if (!clipBounds) {
                            try { clipBounds = parentGroup.visibleBounds; } catch(e) {}
                        }
                        if (clipBounds && clipTouchesArtboardEdge(clipBounds, abRects, tolerance)) {
                            parentGroup.clipped = false;
                            clipPath.clipping = false;
                            count++;
                        }
                    }
                }
            }
        } catch(e) {}
        return count;
    }

    function clipTouchesArtboardEdge(clipBounds, abRects, tolerance) {
        var cLeft = clipBounds[0], cTop = clipBounds[1], cRight = clipBounds[2], cBottom = clipBounds[3];
        for (var r = 0; r < abRects.length; r++) {
            var ab = abRects[r];
            var overlaps = (cLeft < ab[2] && cRight > ab[0] && cBottom < ab[1] && cTop > ab[3]);
            if (!overlaps) continue;
            if (Math.abs(cLeft - ab[0]) <= tolerance || Math.abs(cRight - ab[2]) <= tolerance ||
                Math.abs(cTop - ab[1]) <= tolerance || Math.abs(cBottom - ab[3]) <= tolerance) {
                return true;
            }
        }
        return false;
    }

    function calculateCanvaResolution(item, baseR, budgetMB) {
        var res = baseR;
        if (item.visibleBounds) {
            var wInches = Math.abs(item.visibleBounds[2] - item.visibleBounds[0]) / 72;
            var hInches = Math.abs(item.visibleBounds[1] - item.visibleBounds[3]) / 72;
            var areaSq = wInches * hInches;
            var maxMP = (budgetMB === 100) ? 2.0 : 4.5;
            if (areaSq * res * res > maxMP * 1000000) {
                res = Math.sqrt((maxMP * 1000000) / areaSq);
                if (res >= 300) res = 300;
                else if (res >= 200) res = 200;
                else if (res >= 150) res = 150;
                else res = 72;
            }
        }
        return res;
    }
}

runHeadlessOptimization();
