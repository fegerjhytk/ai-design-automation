#target illustrator
// =============================================================================
// VectorFirstAidCore.jsx
// Core Diagnostic and Vector Cleanup Engine for Adobe Illustrator
// Compatible with Illustrator CS6, CC 2018 - 2025+ (ExtendScript ES3)
// =============================================================================

var VectorFirstAidCore = (function () {
    "use strict";

    var CONFIG = {
        barelyOpenThresholdPt: 2.5,   // max distance between start & end anchors to consider barely open
        collinearAngleTolerance: 0.8, // degrees deviation from 180 to consider collinear
        minTextLength: 0,
        enableRedrawSuspension: true
    };

    /**
     * Helper: calculate Euclidean distance between two 2D points [x, y]
     */
    function distance(p1, p2) {
        var dx = p1[0] - p2[0];
        var dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Recursively collect all target items from a collection or selection
     */
    function collectItems(container, scopeType, out) {
        if (!out) {
            out = {
                paths: [],
                textFrames: [],
                groups: [],
                compoundPaths: []
            };
        }

        if (scopeType === "selection") {
            var items = container.selection || [];
            for (var i = 0; i < items.length; i++) {
                processItem(items[i], out);
            }
        } else {
            // Document scope - direct collections avoid nested recursion and O(N^2) duplicates
            try {
                var p = container.pathItems;
                for (var pi = 0; pi < p.length; pi++) out.paths.push(p[pi]);
            } catch (e1) {}
            try {
                var tf = container.textFrames;
                for (var ti = 0; ti < tf.length; ti++) out.textFrames.push(tf[ti]);
            } catch (e2) {}
            try {
                var gi = container.groupItems;
                for (var gi_idx = 0; gi_idx < gi.length; gi_idx++) out.groups.push(gi[gi_idx]);
            } catch (e3) {}
            try {
                var cp = container.compoundPathItems;
                for (var cpi = 0; cpi < cp.length; cpi++) out.compoundPaths.push(cp[cpi]);
            } catch (e4) {}
        }

        return out;
    }

    function processItem(item, out) {
        if (!item) return;

        var type = item.typename;
        if (type === "PathItem") {
            out.paths.push(item);
        } else if (type === "TextFrame") {
            out.textFrames.push(item);
        } else if (type === "GroupItem") {
            out.groups.push(item);
            // Traverse group children if we are evaluating selection items
            for (var g = 0; g < item.pageItems.length; g++) {
                processItem(item.pageItems[g], out);
            }
        } else if (type === "CompoundPathItem") {
            out.compoundPaths.push(item);
            for (var c = 0; c < item.pathItems.length; c++) {
                out.paths.push(item.pathItems[c]);
            }
        }
    }

    /**
     * Check if a path is inside a CompoundPathItem
     */
    function isInsideCompoundPath(pathItem) {
        try {
            return (pathItem.parent && pathItem.parent.typename === "CompoundPathItem");
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if path is genuinely unpainted (no stroke, no fill, not clipping, not guide)
     */
    function isUnpainted(pathItem) {
        try {
            if (pathItem.guides || pathItem.clipping) return false;

            // If inside compound path, inspect parent compound path fill/stroke
            if (isInsideCompoundPath(pathItem)) {
                var cp = pathItem.parent;
                var hasCpFill = false;
                var hasCpStroke = false;
                try {
                    hasCpFill = cp.pathItems.length > 0 && cp.pathItems[0].filled;
                    hasCpStroke = cp.pathItems.length > 0 && cp.pathItems[0].stroked;
                } catch (eCp) {}
                if (hasCpFill || hasCpStroke) return false;
            }

            var hasFill = false;
            var hasStroke = false;
            try { hasFill = pathItem.filled; } catch (ef) {}
            try { hasStroke = pathItem.stroked; } catch (es) {}

            return (!hasFill && !hasStroke);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if path is a stray point
     */
    function isStrayPoint(pathItem) {
        try {
            if (pathItem.guides || pathItem.clipping) return false;
            var ptCount = pathItem.pathPoints ? pathItem.pathPoints.length : 0;
            if (ptCount === 0 || ptCount === 1) return true;
            // Zero-length path (2 overlapping points with no area, stroke, or fill)
            if (ptCount === 2 && !pathItem.filled && !pathItem.stroked) {
                var p0 = pathItem.pathPoints[0].anchor;
                var p1 = pathItem.pathPoints[1].anchor;
                if (Math.abs(p0[0] - p1[0]) < 0.001 && Math.abs(p0[1] - p1[1]) < 0.001) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if path is barely open
     */
    function isBarelyOpen(pathItem, threshold) {
        try {
            if (pathItem.closed || pathItem.guides || pathItem.clipping) return false;
            var pts = pathItem.pathPoints;
            if (!pts || pts.length < 2) return false;

            var startPt = pts[0].anchor;
            var endPt = pts[pts.length - 1].anchor;
            var d = distance(startPt, endPt);
            return (d > 0.0001 && d <= threshold);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if path is filled but left open
     */
    function isUnclosedFilled(pathItem) {
        try {
            if (pathItem.closed || pathItem.guides || pathItem.clipping) return false;
            return (pathItem.filled === true && pathItem.pathPoints && pathItem.pathPoints.length >= 3);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if text frame is empty or contains pure whitespace
     */
    function isEmptyText(textFrame) {
        try {
            var raw = textFrame.contents;
            if (!raw) return true;
            var clean = raw.replace(/[\s\r\n\t\u200B-\u200D\uFEFF]/g, "");
            return (clean.length === 0);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if group is redundant (single child or empty, non-clipping)
     */
    function isRedundantGroup(groupItem) {
        try {
            if (groupItem.clipped) return false;
            var count = groupItem.pageItems ? groupItem.pageItems.length : 0;
            return (count === 0 || count === 1);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if clipping mask is redundant / empty
     */
    function isRedundantClippingMask(groupItem) {
        try {
            if (!groupItem.clipped) return false;
            var count = groupItem.pageItems ? groupItem.pageItems.length : 0;
            // A clip group needs a mask path + at least 1 clipped content item (total >= 2)
            return (count <= 1);
        } catch (e) {
            return false;
        }
    }

    // =========================================================================
    // Core Scan Function
    // =========================================================================
    function scan(doc, scope) {
        if (!doc) throw new Error("No active document open.");
        scope = scope || "document";

        var collected = collectItems(doc, scope);
        var issues = {
            strayPoints: [],
            unpaintedPaths: [],
            barelyOpenPaths: [],
            unclosedFilledPaths: [],
            emptyTextFrames: [],
            redundantGroups: [],
            redundantClippingMasks: [],
            totalCount: 0
        };

        // 1. Path scans
        for (var i = 0; i < collected.paths.length; i++) {
            var p = collected.paths[i];
            if (isStrayPoint(p)) {
                issues.strayPoints.push(p);
            } else if (isUnpainted(p)) {
                issues.unpaintedPaths.push(p);
            } else if (isBarelyOpen(p, CONFIG.barelyOpenThresholdPt)) {
                issues.barelyOpenPaths.push(p);
            } else if (isUnclosedFilled(p)) {
                issues.unclosedFilledPaths.push(p);
            }
        }

        // 2. Text scans
        for (var t = 0; t < collected.textFrames.length; t++) {
            var tf = collected.textFrames[t];
            if (isEmptyText(tf)) {
                issues.emptyTextFrames.push(tf);
            }
        }

        // 3. Group and clipping mask scans
        for (var g = 0; g < collected.groups.length; g++) {
            var grp = collected.groups[g];
            if (isRedundantClippingMask(grp)) {
                issues.redundantClippingMasks.push(grp);
            } else if (isRedundantGroup(grp)) {
                issues.redundantGroups.push(grp);
            }
        }

        issues.totalCount = issues.strayPoints.length +
                            issues.unpaintedPaths.length +
                            issues.barelyOpenPaths.length +
                            issues.unclosedFilledPaths.length +
                            issues.emptyTextFrames.length +
                            issues.redundantGroups.length +
                            issues.redundantClippingMasks.length;

        return issues;
    }

    // =========================================================================
    // Fix Algorithms
    // =========================================================================

    function fixStrayPoints(items) {
        var count = 0;
        for (var i = items.length - 1; i >= 0; i--) {
            try {
                if (items[i] && items[i].isValid !== false) {
                    items[i].remove();
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixUnpaintedPaths(items) {
        var count = 0;
        for (var i = items.length - 1; i >= 0; i--) {
            try {
                if (items[i] && items[i].isValid !== false) {
                    items[i].remove();
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixBarelyOpenPaths(items) {
        var count = 0;
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i] && items[i].isValid !== false) {
                    items[i].closed = true;
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixUnclosedFilledPaths(items) {
        var count = 0;
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i] && items[i].isValid !== false) {
                    items[i].closed = true;
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixEmptyTextFrames(items) {
        var count = 0;
        for (var i = items.length - 1; i >= 0; i--) {
            try {
                if (items[i] && items[i].isValid !== false) {
                    items[i].remove();
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixRedundantGroups(items) {
        var count = 0;
        for (var i = items.length - 1; i >= 0; i--) {
            try {
                var grp = items[i];
                if (!grp || grp.isValid === false) continue;
                if (grp.pageItems.length === 0) {
                    grp.remove();
                    count++;
                } else if (grp.pageItems.length === 1) {
                    var child = grp.pageItems[0];
                    child.move(grp, ElementPlacement.PLACEBEFORE);
                    grp.remove();
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function fixRedundantClippingMasks(items) {
        var count = 0;
        for (var i = items.length - 1; i >= 0; i--) {
            try {
                var grp = items[i];
                if (!grp || grp.isValid === false) continue;
                grp.clipped = false;
                // If now empty, remove
                if (grp.pageItems.length === 0) {
                    grp.remove();
                }
                count++;
            } catch (e) {}
        }
        return count;
    }

    /**
     * Combine broken text lines (Point text fragmentation repair)
     */
    function combineTextLines(doc, selectionOnly) {
        var frames = [];
        var src = (selectionOnly && doc.selection && doc.selection.length > 0) ? doc.selection : doc.textFrames;

        for (var i = 0; i < src.length; i++) {
            if (src[i].typename === "TextFrame" && src[i].kind === TextType.POINTTEXT) {
                frames.push(src[i]);
            }
        }

        if (frames.length < 2) return 0;

        // Sort top-to-bottom (Y descending), then left-to-right (X ascending)
        frames.sort(function (a, b) {
            var diffY = b.top - a.top;
            if (Math.abs(diffY) > 5) return diffY; // different line
            return a.left - b.left;                // same line
        });

        var lines = [];
        for (var k = 0; k < frames.length; k++) {
            var t = frames[k].contents.replace(/[\r\n]+$/, "");
            if (t.length > 0) lines.push(t);
        }

        var master = frames[0];
        master.contents = lines.join("\n");

        // Remove rest
        var mergedCount = 0;
        for (var j = 1; j < frames.length; j++) {
            try {
                frames[j].remove();
                mergedCount++;
            } catch (e) {}
        }

        return mergedCount + 1;
    }

    /**
     * Purge unused swatches, symbols, and graphic styles
     */
    function purgeUnusedResources() {
        var cleaned = { swatches: 0, symbols: 0 };
        try {
            app.executeMenuCommand("Delete Unused Swatches");
            cleaned.swatches = 1;
        } catch (e) {}
        return cleaned;
    }

    /**
     * Zoom & Center viewport on a specific item
     */
    function showItem(doc, item) {
        if (!doc || !item) return false;
        try {
            doc.selection = null;
            item.selected = true;
            var bounds = item.visibleBounds; // [left, top, right, bottom]
            var cx = (bounds[0] + bounds[2]) / 2;
            var cy = (bounds[1] + bounds[3]) / 2;
            doc.views[0].centerPoint = [cx, cy];
            return true;
        } catch (e) {
            return false;
        }
    }

    function stringify(obj) {
        if (obj === null || obj === undefined) return "null";
        var t = typeof obj;
        if (t === "number" || t === "boolean") return String(obj);
        if (t === "string") {
            return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
        }
        if (obj instanceof Array) {
            var arrParts = [];
            for (var a = 0; a < obj.length; a++) {
                arrParts.push(stringify(obj[a]));
            }
            return "[" + arrParts.join(",") + "]";
        }
        var parts = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                parts.push('"' + k + '":' + stringify(obj[k]));
            }
        }
        return "{" + parts.join(",") + "}";
    }

    return {
        CONFIG: CONFIG,
        scan: scan,
        fixStrayPoints: fixStrayPoints,
        fixUnpaintedPaths: fixUnpaintedPaths,
        fixBarelyOpenPaths: fixBarelyOpenPaths,
        fixUnclosedFilledPaths: fixUnclosedFilledPaths,
        fixEmptyTextFrames: fixEmptyTextFrames,
        fixRedundantGroups: fixRedundantGroups,
        fixRedundantClippingMasks: fixRedundantClippingMasks,
        combineTextLines: combineTextLines,
        purgeUnusedResources: purgeUnusedResources,
        showItem: showItem,
        stringify: stringify
    };
})();
