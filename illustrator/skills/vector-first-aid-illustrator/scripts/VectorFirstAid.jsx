#target illustrator
// =============================================================================
// VectorFirstAid.jsx
// Complete Standalone Vector Diagnostic & Cleanup Engine for Adobe Illustrator
// Dual Mode: Normal Mode (1-Click Safe Clean) & Advanced Mode (Deep Audit)
// Compatible with Illustrator CS6 through CC 2027+ (macOS & Windows)
// =============================================================================

(function (headlessOpts) {
    "use strict";

    if (app.documents.length === 0) {
        if (!headlessOpts) {
            alert("Please open an Adobe Illustrator document before running VectorFirstAid.", "VectorFirstAid");
        }
        return '{"error":"No open document in Adobe Illustrator."}';
    }

    var doc = app.activeDocument;

    // =========================================================================
    // 1. Core Geometry & Analysis Engine
    // =========================================================================
    var CONFIG = {
        barelyOpenThresholdPt: 2.5
    };

    function distance(p1, p2) {
        var dx = p1[0] - p2[0];
        var dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
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

    function collectItems(container, scopeType) {
        var out = { paths: [], textFrames: [], groups: [], compoundPaths: [] };
        if (scopeType === "selection") {
            var items = container.selection || [];
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
        } else {
            // Direct collection access for whole document is instantaneous & deduplicated
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
    // 2. High-Performance Audit & Fix Engine
    // =========================================================================
    function runScan(scope, rules, threshold) {
        threshold = (typeof threshold === "number") ? threshold : CONFIG.barelyOpenThresholdPt;
        rules = rules || {
            stray: true,
            unpainted: true,
            barelyOpen: true,
            unclosedFilled: true,
            emptyText: true,
            clipMasks: true,
            groups: true
        };

        var collected = collectItems(doc, scope);
        var issues = {
            strayPoints: [],
            unpaintedPaths: [],
            barelyOpenPaths: [],
            unclosedFilledPaths: [],
            emptyTextFrames: [],
            redundantClippingMasks: [],
            redundantGroups: []
        };

        // Paths
        for (var i = 0; i < collected.paths.length; i++) {
            var p = collected.paths[i];
            if (rules.stray && isStrayPoint(p)) {
                issues.strayPoints.push(p);
            } else if (rules.unpainted && isUnpainted(p)) {
                issues.unpaintedPaths.push(p);
            } else if (rules.barelyOpen && isBarelyOpen(p, threshold)) {
                issues.barelyOpenPaths.push(p);
            } else if (rules.unclosedFilled && isUnclosedFilled(p)) {
                issues.unclosedFilledPaths.push(p);
            }
        }

        // Text
        if (rules.emptyText) {
            for (var t = 0; t < collected.textFrames.length; t++) {
                var tf = collected.textFrames[t];
                if (isEmptyText(tf)) {
                    issues.emptyTextFrames.push(tf);
                }
            }
        }

        // Groups & masks
        for (var g = 0; g < collected.groups.length; g++) {
            var grp = collected.groups[g];
            if (rules.clipMasks && isRedundantClippingMask(grp)) {
                issues.redundantClippingMasks.push(grp);
            } else if (rules.groups && isRedundantGroup(grp)) {
                issues.redundantGroups.push(grp);
            }
        }

        return issues;
    }

    function fixIssueCategory(key, items) {
        items = items || [];
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
        return count;
    }

    function fixAllIssues(issues) {
        var total = 0;
        for (var k in issues) {
            if (issues.hasOwnProperty(k) && issues[k] && issues[k].length > 0) {
                total += fixIssueCategory(k, issues[k]);
                issues[k] = [];
            }
        }
        return total;
    }

    function purgeUnusedResources() {
        try {
            app.executeMenuCommand("Delete Unused Swatches");
            return true;
        } catch (e) {
            return false;
        }
    }

    function mergeSelectedOrDocText() {
        var frames = [];
        var src = (doc.selection.length > 0) ? doc.selection : doc.textFrames;
        for (var i = 0; i < src.length; i++) {
            if (src[i].typename === "TextFrame" && src[i].kind === TextType.POINTTEXT) {
                frames.push(src[i]);
            }
        }

        if (frames.length < 2) {
            return { count: 0, error: "Please select 2 or more point text lines to merge." };
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
        return { count: frames.length, error: null };
    }

    // =========================================================================
    // 3. Headless CLI Handler (if invoked via command-line or external runner)
    // =========================================================================
    if (headlessOpts) {
        var hScope = headlessOpts.scope || "document";
        var hMode = headlessOpts.mode || "scan"; // "scan" | "fix-all"
        var hThreshold = headlessOpts.threshold || CONFIG.barelyOpenThresholdPt;
        var hIssues = runScan(hScope, null, hThreshold);

        var report = {
            docName: doc.name,
            scope: hScope,
            strayPoints: hIssues.strayPoints.length,
            unpaintedPaths: hIssues.unpaintedPaths.length,
            barelyOpenPaths: hIssues.barelyOpenPaths.length,
            unclosedFilledPaths: hIssues.unclosedFilledPaths.length,
            emptyTextFrames: hIssues.emptyTextFrames.length,
            redundantClippingMasks: hIssues.redundantClippingMasks.length,
            redundantGroups: hIssues.redundantGroups.length,
            totalFound: (hIssues.strayPoints.length + hIssues.unpaintedPaths.length +
                        hIssues.barelyOpenPaths.length + hIssues.unclosedFilledPaths.length +
                        hIssues.emptyTextFrames.length + hIssues.redundantClippingMasks.length +
                        hIssues.redundantGroups.length),
            fixed: 0
        };

        if (hMode === "fix-all") {
            report.fixed = fixAllIssues(hIssues);
            if (headlessOpts.purgeSwatches) {
                purgeUnusedResources();
            }
            app.redraw();
        }
        return "RESULT_JSON:" + stringify(report);
    }

    // =========================================================================
    // 4. Interactive ScriptUI Window (Clean ASCII, Zero Empty Space)
    // =========================================================================
    // Close any previous instance cleanly
    if ($.vfaWindow && $.vfaWindow.close) {
        try { $.vfaWindow.close(); } catch (e) {}
    }

    var win = new Window("dialog", "VectorFirstAid");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 8;

    // --- Header Row: Title & Scope ---
    var topRow = win.add("group");
    topRow.orientation = "row";
    topRow.alignChildren = ["fill", "center"];
    topRow.spacing = 8;

    var headerTitle = topRow.add("statictext", undefined, "VectorFirstAid");
    headerTitle.graphics.font = ScriptUI.newFont("dialog", "bold", 12);

    var scopeGrp = topRow.add("group");
    scopeGrp.orientation = "row";
    scopeGrp.spacing = 6;
    var radDoc = scopeGrp.add("radiobutton", undefined, "Document");
    var radSel = scopeGrp.add("radiobutton", undefined, "Selection");
    radDoc.value = (doc.selection.length === 0);
    radSel.value = (doc.selection.length > 0);

    // --- Mode Switcher (Normal vs Advanced) ---
    var modeBar = win.add("panel", undefined, undefined);
    modeBar.orientation = "row";
    modeBar.alignChildren = ["center", "center"];
    modeBar.spacing = 16;
    modeBar.margins = 4;

    var radModeNormal = modeBar.add("radiobutton", undefined, "Normal Mode");
    var radModeAdvance = modeBar.add("radiobutton", undefined, "Advanced Mode");
    radModeNormal.value = true;

    // -------------------------------------------------------------------------
    // CONTAINER: Normal Mode Panel
    // -------------------------------------------------------------------------
    var pnlNormal = win.add("group");
    pnlNormal.orientation = "column";
    pnlNormal.alignChildren = ["fill", "top"];
    pnlNormal.spacing = 6;

    var btnNormalClean = pnlNormal.add("button", undefined, "Clean Document");
    btnNormalClean.preferredSize.height = 30;
    btnNormalClean.graphics.font = ScriptUI.newFont("dialog", "bold", 11);

    var quickPnl = pnlNormal.add("panel", undefined, "Quick Tools");
    quickPnl.orientation = "row";
    quickPnl.alignChildren = ["fill", "center"];
    quickPnl.spacing = 4;
    quickPnl.margins = 6;

    var btnRejoin = quickPnl.add("button", undefined, "Rejoin Paths");
    btnRejoin.preferredSize.height = 22;

    var btnMergeText = quickPnl.add("button", undefined, "Merge Text");
    btnMergeText.preferredSize.height = 22;

    var btnPurge = quickPnl.add("button", undefined, "Purge Swatches");
    btnPurge.preferredSize.height = 22;

    // -------------------------------------------------------------------------
    // CONTAINER: Advanced Mode Panel
    // -------------------------------------------------------------------------
    var pnlAdvance = win.add("group");
    pnlAdvance.orientation = "column";
    pnlAdvance.alignChildren = ["fill", "top"];
    pnlAdvance.spacing = 5;
    pnlAdvance.visible = false;

    // Profile & Threshold Row
    var profRow = pnlAdvance.add("group");
    profRow.orientation = "row";
    profRow.alignChildren = ["left", "center"];
    profRow.spacing = 6;

    profRow.add("statictext", undefined, "Profile:");
    var profDrop = profRow.add("dropdownlist", undefined, [
        "All Rules",
        "Paths Only",
        "PDF Import",
        "Typography"
    ]);
    profDrop.selection = 0;
    profDrop.preferredSize.width = 110;

    profRow.add("statictext", undefined, "Gap:");
    var txtThreshold = profRow.add("edittext", undefined, "2.5");
    txtThreshold.preferredSize.width = 30;
    profRow.add("statictext", undefined, "pt");

    // Rules 2-Column Panel
    var chkBoxPnl = pnlAdvance.add("panel", undefined, "Rules");
    chkBoxPnl.orientation = "row";
    chkBoxPnl.alignChildren = ["fill", "top"];
    chkBoxPnl.spacing = 10;
    chkBoxPnl.margins = 6;

    var chkCol1 = chkBoxPnl.add("group");
    chkCol1.orientation = "column";
    chkCol1.alignChildren = ["left", "top"];
    chkCol1.spacing = 2;

    var chkStray = chkCol1.add("checkbox", undefined, "Stray Points");
    var chkBarelyOpen = chkCol1.add("checkbox", undefined, "Barely-Open Paths");
    var chkEmptyText = chkCol1.add("checkbox", undefined, "Empty Text Frames");
    var chkGroups = chkCol1.add("checkbox", undefined, "Single Groups");

    var chkCol2 = chkBoxPnl.add("group");
    chkCol2.orientation = "column";
    chkCol2.alignChildren = ["left", "top"];
    chkCol2.spacing = 2;

    var chkUnpainted = chkCol2.add("checkbox", undefined, "Unpainted Paths");
    var chkUnclosedFill = chkCol2.add("checkbox", undefined, "Unclosed Filled");
    var chkClipMasks = chkCol2.add("checkbox", undefined, "Redundant Masks");

    function setRules(st, un, bo, uf, et, cm, gr) {
        chkStray.value = st;
        chkUnpainted.value = un;
        chkBarelyOpen.value = bo;
        chkUnclosedFill.value = uf;
        chkEmptyText.value = et;
        chkClipMasks.value = cm;
        chkGroups.value = gr;
    }
    setRules(true, true, true, true, true, true, true);

    profDrop.onChange = function () {
        var idx = profDrop.selection.index;
        if (idx === 0) setRules(true, true, true, true, true, true, true);
        else if (idx === 1) setRules(true, true, true, true, false, false, false);
        else if (idx === 2) setRules(true, true, false, true, true, true, true);
        else if (idx === 3) setRules(false, false, false, false, true, false, false);
    };

    // Scan Button
    var btnAdvanceCheck = pnlAdvance.add("button", undefined, "Check Document");
    btnAdvanceCheck.preferredSize.height = 24;
    btnAdvanceCheck.graphics.font = ScriptUI.newFont("dialog", "bold", 10);

    // Results Listbox
    var resList = pnlAdvance.add("listbox", undefined, [], {
        numberOfColumns: 3,
        showHeaders: true,
        columnTitles: ["Issue", "Count", "Status"]
    });
    resList.preferredSize.height = 70;

    // Action Buttons
    var actRow = pnlAdvance.add("group");
    actRow.orientation = "row";
    actRow.alignChildren = ["fill", "center"];
    actRow.spacing = 4;

    var btnShow = actRow.add("button", undefined, "Show");
    btnShow.preferredSize.height = 24;
    var btnFixSelected = actRow.add("button", undefined, "Fix Selected");
    btnFixSelected.preferredSize.height = 24;
    var btnFixAll = actRow.add("button", undefined, "Fix All");
    btnFixAll.preferredSize.height = 24;

    btnShow.enabled = false;
    btnFixSelected.enabled = false;
    btnFixAll.enabled = false;

    // --- Status & Close Footer ---
    var statusRow = win.add("group");
    statusRow.orientation = "row";
    statusRow.alignChildren = ["fill", "center"];
    statusRow.spacing = 6;

    var statusTxt = statusRow.add("statictext", undefined, "Ready.");
    statusTxt.graphics.foregroundColor = statusTxt.graphics.newPen(statusTxt.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4, 1], 1);
    statusTxt.preferredSize.width = 240;

    var btnClose = statusRow.add("button", undefined, "Close");
    btnClose.preferredSize.width = 65;
    btnClose.preferredSize.height = 22;
    btnClose.onClick = function () {
        win.close();
    };
    win.cancelElement = btnClose;

    // =========================================================================
    // 5. Dynamic Window Resizing & Mode Switching (Zero Empty Space)
    // =========================================================================
    function updateScopeLabels() {
        var isSel = radSel.value;
        btnNormalClean.text = isSel ? "Clean Selection" : "Clean Document";
        btnAdvanceCheck.text = isSel ? "Check Selection" : "Check Document";
    }
    radDoc.onClick = updateScopeLabels;
    radSel.onClick = updateScopeLabels;
    updateScopeLabels();

    function setUIMode(isNormal) {
        if (isNormal) {
            pnlNormal.visible = true;
            pnlNormal.maximumSize.height = 1000;
            pnlNormal.preferredSize.height = -1;
            pnlAdvance.visible = false;
            pnlAdvance.maximumSize.height = 0;
            pnlAdvance.preferredSize.height = 0;
        } else {
            pnlNormal.visible = false;
            pnlNormal.maximumSize.height = 0;
            pnlNormal.preferredSize.height = 0;
            pnlAdvance.visible = true;
            pnlAdvance.maximumSize.height = 1000;
            pnlAdvance.preferredSize.height = -1;
        }
        win.layout.layout(true);
        win.size = win.preferredSize;
    }

    radModeNormal.onClick = function () {
        setUIMode(true);
    };
    radModeAdvance.onClick = function () {
        setUIMode(false);
    };

    // =========================================================================
    // 6. Interactive Actions & Execution Handlers
    // =========================================================================
    var advanceIssues = null;

    // Normal Mode: 1-Click Clean
    btnNormalClean.onClick = function () {
        statusTxt.text = "Cleaning artwork...";
        win.update();

        var scope = radSel.value ? "selection" : "document";
        var issues = runScan(scope, null, CONFIG.barelyOpenThresholdPt);
        var totalFixed = fixAllIssues(issues);

        app.redraw();
        statusTxt.text = "Clean complete: " + totalFixed + " item(s) fixed.";
        alert("VectorFirstAid\n\nCleanup finished!\nSuccessfully resolved " + totalFixed + " issue(s).", "Clean Complete");
    };

    // Quick Tools
    btnRejoin.onClick = function () {
        var paths = doc.selection && doc.selection.length > 0 ? doc.selection : doc.pathItems;
        var joined = 0;
        for (var i = 0; i < paths.length; i++) {
            if (paths[i].typename === "PathItem" && isBarelyOpen(paths[i], 3.0)) {
                paths[i].closed = true;
                joined++;
            }
        }
        statusTxt.text = "Rejoined " + joined + " path(s).";
        app.redraw();
    };

    btnMergeText.onClick = function () {
        var res = mergeSelectedOrDocText();
        if (res.error) {
            alert(res.error, "Merge Text");
        } else {
            statusTxt.text = "Merged " + res.count + " text lines.";
            app.redraw();
        }
    };

    btnPurge.onClick = function () {
        if (purgeUnusedResources()) {
            statusTxt.text = "Unused swatches purged.";
        } else {
            alert("Could not purge swatches.", "Purge");
        }
    };

    // Advanced Mode: Scan
    btnAdvanceCheck.onClick = function () {
        statusTxt.text = "Auditing artwork...";
        win.update();

        var scope = radSel.value ? "selection" : "document";
        var th = parseFloat(txtThreshold.text) || CONFIG.barelyOpenThresholdPt;
        var rules = {
            stray: chkStray.value,
            unpainted: chkUnpainted.value,
            barelyOpen: chkBarelyOpen.value,
            unclosedFilled: chkUnclosedFill.value,
            emptyText: chkEmptyText.value,
            clipMasks: chkClipMasks.value,
            groups: chkGroups.value
        };

        advanceIssues = runScan(scope, rules, th);

        resList.removeAll();
        var total = 0;

        function addRow(cat, items, key) {
            var c = items.length;
            total += c;
            var it = resList.add("item", cat);
            it.subItems[0].text = c.toString();
            it.subItems[1].text = (c > 0) ? "Found" : "Clean";
            it.issueKey = key;
        }

        if (chkStray.value) addRow("Stray Points", advanceIssues.strayPoints, "strayPoints");
        if (chkUnpainted.value) addRow("Unpainted Paths", advanceIssues.unpaintedPaths, "unpaintedPaths");
        if (chkBarelyOpen.value) addRow("Barely-Open Paths", advanceIssues.barelyOpenPaths, "barelyOpenPaths");
        if (chkUnclosedFill.value) addRow("Unclosed Filled", advanceIssues.unclosedFilledPaths, "unclosedFilledPaths");
        if (chkEmptyText.value) addRow("Empty Text", advanceIssues.emptyTextFrames, "emptyTextFrames");
        if (chkClipMasks.value) addRow("Redundant Masks", advanceIssues.redundantClippingMasks, "redundantClippingMasks");
        if (chkGroups.value) addRow("Single Groups", advanceIssues.redundantGroups, "redundantGroups");

        btnFixAll.enabled = (total > 0);
        statusTxt.text = "Audit complete: " + total + " issue(s).";
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

    // Advanced Mode: Show on Canvas
    btnShow.onClick = function () {
        var sel = resList.selection;
        if (!sel || !sel.issueKey || !advanceIssues) return;
        var list = advanceIssues[sel.issueKey];
        if (!list || list.length === 0) return;

        var target = list[0];
        try {
            doc.selection = null;
            target.selected = true;
            var b = target.visibleBounds;
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            doc.views[0].centerPoint = [cx, cy];
            statusTxt.text = "Zoomed to " + sel.text + ".";
        } catch (e) {
            alert("Could not select object: " + e.message, "Show");
        }
    };

    // Advanced Mode: Fix Selected
    btnFixSelected.onClick = function () {
        var sel = resList.selection;
        if (!sel || !sel.issueKey || !advanceIssues) return;
        var fixed = fixIssueCategory(sel.issueKey, advanceIssues[sel.issueKey]);
        advanceIssues[sel.issueKey] = [];
        sel.subItems[0].text = "0";
        sel.subItems[1].text = "Fixed";
        btnFixSelected.enabled = false;
        btnShow.enabled = false;
        statusTxt.text = "Fixed " + fixed + " " + sel.text + ".";
        app.redraw();
    };

    // Advanced Mode: Fix All
    btnFixAll.onClick = function () {
        if (!advanceIssues) return;
        var totalFixed = fixAllIssues(advanceIssues);
        for (var i = 0; i < resList.items.length; i++) {
            resList.items[i].subItems[0].text = "0";
            resList.items[i].subItems[1].text = "Fixed";
        }
        btnFixAll.enabled = false;
        btnFixSelected.enabled = false;
        btnShow.enabled = false;
        statusTxt.text = "Clean complete: " + totalFixed + " fixed.";
        app.redraw();
        alert("VectorFirstAid\n\nRepaired " + totalFixed + " issue(s).", "Clean Complete");
    };

    // Store reference & show
    $.vfaWindow = win;
    setUIMode(true);
    win.center();
    win.show();

})(typeof $.vfaHeadless !== "undefined" ? $.vfaHeadless : null);
