#target illustrator
// =============================================================================
// VectorFirstAid.jsx
// Complete Standalone Vector Diagnostic & Cleanup Panel for Adobe Illustrator
// Replicates Astute Graphics VectorFirstAid functionality in 100% native ExtendScript
// Compatible with Illustrator CS6, CC 2018 - CC 2025+ (macOS & Windows)
// =============================================================================

(function () {
    "use strict";

    if (app.documents.length === 0) {
        alert("Please open an Adobe Illustrator document before running VectorFirstAid.", "VectorFirstAid");
        return;
    }

    var doc = app.activeDocument;

    // =========================================================================
    // Core Engine Logic
    // =========================================================================
    var CONFIG = {
        barelyOpenThresholdPt: 2.5
    };

    function distance(p1, p2) {
        var dx = p1[0] - p2[0];
        var dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function collectItems(container, scopeType) {
        var out = { paths: [], textFrames: [], groups: [], compoundPaths: [] };
        var items = (scopeType === "selection") ? (container.selection || []) : (container.pageItems || []);

        function walk(item) {
            if (!item) return;
            var type = item.typename;
            if (type === "PathItem") {
                out.paths.push(item);
            } else if (type === "TextFrame") {
                out.textFrames.push(item);
            } else if (type === "GroupItem") {
                out.groups.push(item);
                for (var g = 0; g < item.pageItems.length; g++) {
                    walk(item.pageItems[g]);
                }
            } else if (type === "CompoundPathItem") {
                out.compoundPaths.push(item);
                for (var c = 0; c < item.pathItems.length; c++) {
                    out.paths.push(item.pathItems[c]);
                }
            }
        }

        for (var i = 0; i < items.length; i++) {
            walk(items[i]);
        }
        return out;
    }

    function isInsideCompoundPath(p) {
        try { return (p.parent && p.parent.typename === "CompoundPathItem"); } catch (e) { return false; }
    }

    function isUnpainted(p) {
        try {
            if (p.guides || p.clipping) return false;
            if (isInsideCompoundPath(p)) {
                var cp = p.parent;
                if ((cp.pathItems.length > 0 && cp.pathItems[0].filled) ||
                    (cp.pathItems.length > 0 && cp.pathItems[0].stroked)) {
                    return false;
                }
            }
            var hasFill = false;
            var hasStroke = false;
            try { hasFill = p.filled; } catch (ef) {}
            try { hasStroke = p.stroked; } catch (es) {}
            return (!hasFill && !hasStroke);
        } catch (e) { return false; }
    }

    function isStrayPoint(p) {
        try {
            if (p.guides || p.clipping) return false;
            var ptCount = p.pathPoints ? p.pathPoints.length : 0;
            if (ptCount === 0 || ptCount === 1) return true;
            if (ptCount === 2 && !p.filled && !p.stroked) {
                var p0 = p.pathPoints[0].anchor;
                var p1 = p.pathPoints[1].anchor;
                if (Math.abs(p0[0] - p1[0]) < 0.001 && Math.abs(p0[1] - p1[1]) < 0.001) return true;
            }
            return false;
        } catch (e) { return false; }
    }

    function isBarelyOpen(p, threshold) {
        try {
            if (p.closed || p.guides || p.clipping) return false;
            var pts = p.pathPoints;
            if (!pts || pts.length < 2) return false;
            var d = distance(pts[0].anchor, pts[pts.length - 1].anchor);
            return (d > 0.0001 && d <= threshold);
        } catch (e) { return false; }
    }

    function isUnclosedFilled(p) {
        try {
            if (p.closed || p.guides || p.clipping) return false;
            return (p.filled === true && p.pathPoints && p.pathPoints.length >= 3);
        } catch (e) { return false; }
    }

    function isEmptyText(tf) {
        try {
            var raw = tf.contents;
            if (!raw) return true;
            return (raw.replace(/[\s\r\n\t\u200B-\u200D\uFEFF]/g, "").length === 0);
        } catch (e) { return false; }
    }

    function isRedundantGroup(grp) {
        try {
            if (grp.clipped) return false;
            var count = grp.pageItems ? grp.pageItems.length : 0;
            return (count === 0 || count === 1);
        } catch (e) { return false; }
    }

    function isRedundantClippingMask(grp) {
        try {
            if (!grp.clipped) return false;
            var count = grp.pageItems ? grp.pageItems.length : 0;
            return (count <= 1);
        } catch (e) { return false; }
    }

    // =========================================================================
    // ScriptUI Interface Construction
    // =========================================================================
    var win = new Window("palette", "VectorFirstAid", undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 10;

    // --- 1. Top Banner & Quick Operations Toolbar ---
    var bannerPnl = win.add("panel", undefined, undefined);
    bannerPnl.orientation = "row";
    bannerPnl.alignChildren = ["left", "center"];
    bannerPnl.spacing = 8;
    bannerPnl.margins = 6;

    var titleTxt = bannerPnl.add("statictext", undefined, "⚡ VectorFirstAid JSX");
    titleTxt.graphics.font = ScriptUI.newFont("dialog", "bold", 12);

    var helpBtn = bannerPnl.add("button", undefined, "?");
    helpBtn.preferredSize.width = 24;
    helpBtn.preferredSize.height = 20;

    // Quick Actions Toolbar Row
    var quickPnl = win.add("panel", undefined, "Quick Actions");
    quickPnl.orientation = "row";
    quickPnl.alignChildren = ["fill", "center"];
    quickPnl.spacing = 4;
    quickPnl.margins = 6;

    var btnRejoin = quickPnl.add("button", undefined, "Rejoin Paths");
    btnRejoin.helpTip = "Closes open paths whose endpoints are close together";

    var btnMergeText = quickPnl.add("button", undefined, "Merge Text");
    btnMergeText.helpTip = "Combines disconnected point text lines into a single text frame";

    var btnPurge = quickPnl.add("button", undefined, "Purge Swatches");
    btnPurge.helpTip = "Deletes unused swatches from the document";

    // --- 2. Audit Scope & Profile Controls ---
    var scopeGrp = win.add("group");
    scopeGrp.orientation = "row";
    scopeGrp.alignChildren = ["left", "center"];
    scopeGrp.spacing = 10;

    var radDoc = scopeGrp.add("radiobutton", undefined, "Entire Document");
    var radSel = scopeGrp.add("radiobutton", undefined, "Selected Art Only");
    radDoc.value = (doc.selection.length === 0);
    radSel.value = (doc.selection.length > 0);

    // Profile Dropdown
    var profGrp = win.add("group");
    profGrp.orientation = "row";
    profGrp.alignChildren = ["left", "center"];
    profGrp.add("statictext", undefined, "Manual Checkups:");

    var profDrop = profGrp.add("dropdownlist", undefined, [
        "[Check All Issues]",
        "Path & Vector Cleanup",
        "PDF Import Cleanup",
        "Typography Only"
    ]);
    profDrop.selection = 0;
    profDrop.preferredSize.width = 180;

    // Diagnostic Checkboxes
    var chkPnl = win.add("panel", undefined, "Rules to Check");
    chkPnl.orientation = "column";
    chkPnl.alignChildren = ["left", "top"];
    chkPnl.spacing = 3;
    chkPnl.margins = 6;

    var chkStray = chkPnl.add("checkbox", undefined, "Remove Stray Points (isolated anchors)");
    var chkUnpainted = chkPnl.add("checkbox", undefined, "Remove Unpainted Paths (no stroke, no fill)");
    var chkBarelyOpen = chkPnl.add("checkbox", undefined, "Close Barely-Open Paths (≤ 2.5 pt gap)");
    var chkUnclosedFill = chkPnl.add("checkbox", undefined, "Close Unclosed Filled Paths");
    var chkEmptyText = chkPnl.add("checkbox", undefined, "Remove Empty Text Frames (whitespace only)");
    var chkClipMasks = chkPnl.add("checkbox", undefined, "Remove Redundant Clipping Masks");
    var chkGroups = chkPnl.add("checkbox", undefined, "Collapse Single-Child / Empty Groups");

    function setRulesAll(state) {
        chkStray.value = state;
        chkUnpainted.value = state;
        chkBarelyOpen.value = state;
        chkUnclosedFill.value = state;
        chkEmptyText.value = state;
        chkClipMasks.value = state;
        chkGroups.value = state;
    }
    setRulesAll(true);

    profDrop.onChange = function () {
        var idx = profDrop.selection.index;
        if (idx === 0) { // All
            setRulesAll(true);
        } else if (idx === 1) { // Paths
            setRulesAll(false);
            chkStray.value = true;
            chkUnpainted.value = true;
            chkBarelyOpen.value = true;
            chkUnclosedFill.value = true;
        } else if (idx === 2) { // PDF Import
            setRulesAll(true);
            chkBarelyOpen.value = false;
        } else if (idx === 3) { // Typography
            setRulesAll(false);
            chkEmptyText.value = true;
        }
    };

    // --- 3. Scan Button ---
    var btnCheck = win.add("button", undefined, "Check Document");
    btnCheck.preferredSize.height = 28;
    btnCheck.graphics.font = ScriptUI.newFont("dialog", "bold", 11);

    function updateCheckBtnLabel() {
        btnCheck.text = radSel.value ? "Check Selection" : "Check Document";
    }
    radDoc.onClick = updateCheckBtnLabel;
    radSel.onClick = updateCheckBtnLabel;
    updateCheckBtnLabel();

    // --- 4. Results List Window ---
    var listPnl = win.add("panel", undefined, "Audit Results");
    listPnl.orientation = "column";
    listPnl.alignChildren = ["fill", "fill"];
    listPnl.margins = 6;

    var resList = listPnl.add("listbox", undefined, [], {
        numberOfColumns: 3,
        showHeaders: true,
        columnTitles: ["Issue Category", "Count", "Status"]
    });
    resList.preferredSize.height = 130;

    // Cache of scanned items
    var currentIssues = {
        strayPoints: [],
        unpaintedPaths: [],
        barelyOpenPaths: [],
        unclosedFilledPaths: [],
        emptyTextFrames: [],
        redundantClippingMasks: [],
        redundantGroups: []
    };

    // --- 5. Bottom Action Controls ---
    var actGrp = win.add("group");
    actGrp.orientation = "row";
    actGrp.alignChildren = ["fill", "center"];
    actGrp.spacing = 6;

    var btnShow = actGrp.add("button", undefined, "Show");
    var btnFixSelected = actGrp.add("button", undefined, "Fix Selected");
    var btnFixAll = actGrp.add("button", undefined, "Fix All");

    btnShow.enabled = false;
    btnFixSelected.enabled = false;
    btnFixAll.enabled = false;

    var statusTxt = win.add("statictext", undefined, "Ready. Click 'Check Document' to begin diagnostic scan.");
    statusTxt.graphics.foregroundColor = statusTxt.graphics.newPen(statusTxt.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5, 1], 1);

    // =========================================================================
    // Event Handlers & Execution
    // =========================================================================

    btnCheck.onClick = function () {
        statusTxt.text = "Scanning artwork, please wait...";
        win.update();

        var scope = radSel.value ? "selection" : "document";
        var collected = collectItems(doc, scope);

        currentIssues = {
            strayPoints: [],
            unpaintedPaths: [],
            barelyOpenPaths: [],
            unclosedFilledPaths: [],
            emptyTextFrames: [],
            redundantClippingMasks: [],
            redundantGroups: []
        };

        // Scan paths
        for (var i = 0; i < collected.paths.length; i++) {
            var p = collected.paths[i];
            if (chkStray.value && isStrayPoint(p)) {
                currentIssues.strayPoints.push(p);
            } else if (chkUnpainted.value && isUnpainted(p)) {
                currentIssues.unpaintedPaths.push(p);
            } else if (chkBarelyOpen.value && isBarelyOpen(p, CONFIG.barelyOpenThresholdPt)) {
                currentIssues.barelyOpenPaths.push(p);
            } else if (chkUnclosedFill.value && isUnclosedFilled(p)) {
                currentIssues.unclosedFilledPaths.push(p);
            }
        }

        // Scan text
        if (chkEmptyText.value) {
            for (var t = 0; t < collected.textFrames.length; t++) {
                var tf = collected.textFrames[t];
                if (isEmptyText(tf)) {
                    currentIssues.emptyTextFrames.push(tf);
                }
            }
        }

        // Scan groups & masks
        for (var g = 0; g < collected.groups.length; g++) {
            var grp = collected.groups[g];
            if (chkClipMasks.value && isRedundantClippingMask(grp)) {
                currentIssues.redundantClippingMasks.push(grp);
            } else if (chkGroups.value && isRedundantGroup(grp)) {
                currentIssues.redundantGroups.push(grp);
            }
        }

        // Populate listbox
        resList.removeAll();
        var total = 0;

        function addRow(cat, items, key) {
            var c = items.length;
            total += c;
            var item = resList.add("item", cat);
            item.subItems[0].text = c.toString();
            item.subItems[1].text = (c > 0) ? "Issues Found" : "Clean";
            item.issueKey = key;
        }

        if (chkStray.value) addRow("Stray Points", currentIssues.strayPoints, "strayPoints");
        if (chkUnpainted.value) addRow("Unpainted Paths", currentIssues.unpaintedPaths, "unpaintedPaths");
        if (chkBarelyOpen.value) addRow("Barely-Open Paths", currentIssues.barelyOpenPaths, "barelyOpenPaths");
        if (chkUnclosedFill.value) addRow("Unclosed Filled Paths", currentIssues.unclosedFilledPaths, "unclosedFilledPaths");
        if (chkEmptyText.value) addRow("Empty Text Frames", currentIssues.emptyTextFrames, "emptyTextFrames");
        if (chkClipMasks.value) addRow("Redundant Clip Masks", currentIssues.redundantClippingMasks, "redundantClippingMasks");
        if (chkGroups.value) addRow("Single-Child Groups", currentIssues.redundantGroups, "redundantGroups");

        btnFixAll.enabled = (total > 0);
        statusTxt.text = "Audit complete: " + total + " issue(s) detected.";
    };

    resList.onChange = function () {
        var sel = resList.selection;
        if (!sel) {
            btnShow.enabled = false;
            btnFixSelected.enabled = false;
            return;
        }
        var count = parseInt(sel.subItems[0].text, 10);
        btnShow.enabled = (count > 0);
        btnFixSelected.enabled = (count > 0);
    };

    // Show / Zoom to Issue
    btnShow.onClick = function () {
        var sel = resList.selection;
        if (!sel || !sel.issueKey) return;
        var list = currentIssues[sel.issueKey];
        if (!list || list.length === 0) return;

        var target = list[0];
        try {
            doc.selection = null;
            target.selected = true;
            var b = target.visibleBounds; // [left, top, right, bottom]
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            doc.views[0].centerPoint = [cx, cy];
            statusTxt.text = "Zoomed to " + sel.text + " on canvas.";
        } catch (e) {
            alert("Could not select object (it may have been modified or locked).", "Show");
        }
    };

    // Fix Handlers
    function fixCategory(key) {
        var items = currentIssues[key] || [];
        var count = 0;

        if (key === "strayPoints" || key === "unpaintedPaths" || key === "emptyTextFrames") {
            for (var i = items.length - 1; i >= 0; i--) {
                try { items[i].remove(); count++; } catch (e) {}
            }
        } else if (key === "barelyOpenPaths" || key === "unclosedFilledPaths") {
            for (var b = 0; b < items.length; b++) {
                try { items[b].closed = true; count++; } catch (e) {}
            }
        } else if (key === "redundantClippingMasks") {
            for (var m = items.length - 1; m >= 0; m--) {
                try {
                    items[m].clipped = false;
                    if (items[m].pageItems.length === 0) items[m].remove();
                    count++;
                } catch (e) {}
            }
        } else if (key === "redundantGroups") {
            for (var g = items.length - 1; g >= 0; g--) {
                try {
                    var grp = items[g];
                    if (grp.pageItems.length === 1) {
                        grp.pageItems[0].move(grp, ElementPlacement.PLACEBEFORE);
                    }
                    grp.remove();
                    count++;
                } catch (e) {}
            }
        }

        currentIssues[key] = [];
        return count;
    }

    btnFixSelected.onClick = function () {
        var sel = resList.selection;
        if (!sel || !sel.issueKey) return;
        var fixed = fixCategory(sel.issueKey);
        sel.subItems[0].text = "0";
        sel.subItems[1].text = "Fixed";
        btnFixSelected.enabled = false;
        btnShow.enabled = false;
        statusTxt.text = "Fixed " + fixed + " " + sel.text + ".";
        app.redraw();
    };

    btnFixAll.onClick = function () {
        var totalFixed = 0;
        for (var k in currentIssues) {
            if (currentIssues.hasOwnProperty(k) && currentIssues[k].length > 0) {
                totalFixed += fixCategory(k);
            }
        }

        for (var i = 0; i < resList.items.length; i++) {
            resList.items[i].subItems[0].text = "0";
            resList.items[i].subItems[1].text = "Fixed";
        }

        btnFixAll.enabled = false;
        btnFixSelected.enabled = false;
        btnShow.enabled = false;
        statusTxt.text = "Success! Repaired " + totalFixed + " total issue(s).";
        app.redraw();
        alert("VectorFirstAid Cleanup Complete!\n\nSuccessfully resolved " + totalFixed + " issues across the document.", "VectorFirstAid");
    };

    // Quick Action: Rejoin Paths
    btnRejoin.onClick = function () {
        var paths = doc.selection && doc.selection.length > 0 ? doc.selection : doc.pathItems;
        var joined = 0;
        for (var i = 0; i < paths.length; i++) {
            if (paths[i].typename === "PathItem" && isBarelyOpen(paths[i], 3.0)) {
                paths[i].closed = true;
                joined++;
            }
        }
        statusTxt.text = "Rejoined/Closed " + joined + " path(s).";
        app.redraw();
    };

    // Quick Action: Merge Text
    btnMergeText.onClick = function () {
        var frames = [];
        var src = (doc.selection.length > 0) ? doc.selection : doc.textFrames;
        for (var i = 0; i < src.length; i++) {
            if (src[i].typename === "TextFrame" && src[i].kind === TextType.POINTTEXT) {
                frames.push(src[i]);
            }
        }

        if (frames.length < 2) {
            alert("Please select 2 or more point text lines to merge.", "Merge Text");
            return;
        }

        frames.sort(function (a, b) {
            var dy = b.top - a.top;
            if (Math.abs(dy) > 5) return dy;
            return a.left - b.left;
        });

        var lines = [];
        for (var k = 0; k < frames.length; k++) {
            var txt = frames[k].contents.replace(/[\r\n]+$/, "");
            if (txt.length > 0) lines.push(txt);
        }

        frames[0].contents = lines.join("\n");
        for (var j = 1; j < frames.length; j++) {
            try { frames[j].remove(); } catch (e) {}
        }

        statusTxt.text = "Merged " + frames.length + " text lines into 1 frame.";
        app.redraw();
    };

    // Quick Action: Purge Swatches
    btnPurge.onClick = function () {
        try {
            app.executeMenuCommand("Delete Unused Swatches");
            statusTxt.text = "Unused swatches purged.";
        } catch (e) {
            alert("Could not purge swatches: " + e.message, "Purge Swatches");
        }
    };

    // Help Dialog
    helpBtn.onClick = function () {
        alert(
            "VectorFirstAid JSX for Adobe Illustrator\n\n" +
            "• Check Document / Selection: Audits vector objects for errors.\n" +
            "• Stray Points: Cleans isolated anchor points.\n" +
            "• Unpainted Paths: Deletes invisible empty paths.\n" +
            "• Barely-Open Paths: Auto-closes paths with nearly touching endpoints.\n" +
            "• Empty Text: Purges 0-character or whitespace-only text frames.\n" +
            "• Redundant Masks & Groups: Collapses single-child groups and empty clip masks.\n" +
            "• Merge Text: Combines fragmented PDF text lines into 1 continuous frame.",
            "About VectorFirstAid JSX"
        );
    };

    win.center();
    win.show();
})();
