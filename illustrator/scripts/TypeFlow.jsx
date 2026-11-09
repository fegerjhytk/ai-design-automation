#target illustrator
#targetengine "TypeFlowSession"
// =============================================================================
// TypeFlow.jsx - Universal Typography & Size Manager for Adobe Illustrator
//
// Persistent floating palette that stays open while editing canvas live.
// Solves messy/runaway font sizes, provides 1-click size rounding & scaling,
// tracks overset text with live alerts, and provides snug paragraph auto-height.
// =============================================================================

(function () {
    "use strict";

    // ES3 Array polyfills
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (item) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === item) return i;
            }
            return -1;
        };
    }

    // Close any previous instance so only one panel runs at a time
    if ($.global.typeFlowWindow && $.global.typeFlowWindow instanceof Window) {
        try { $.global.typeFlowWindow.close(); } catch (ePrev) {}
    }

    function getDoc() {
        return (app.documents.length > 0) ? app.activeDocument : null;
    }

    try { app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS; } catch (eUI) {}

    var ACTION_SET_NAME = "JournalAutoSize";
    var ACTION_NAME = "SetAreaTypeOptions";

    var COMMON_FONTS = ["Arial", "Helvetica", "Times New Roman", "Georgia", "Myriad Pro", "Minion Pro", "Courier New"];

    // =========================================================================
    // 1. FONT RESOLVER ENGINE
    // =========================================================================

    function resolveFont(query) {
        if (!query) return null;
        query = query.replace(/^\s+|\s+$/g, "");
        if (query.length === 0) return null;

        try {
            var direct = app.textFonts.getByName(query);
            if (direct) return direct;
        } catch (eDirect) {}

        var qClean = query.toLowerCase().replace(/[^a-z0-9]/g, "");

        for (var i = 0; i < app.textFonts.length; i++) {
            var f = app.textFonts[i];
            var cName = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            var cFamStyle = (f.family + f.style).toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cName === qClean || cFamStyle === qClean) return f;
        }

        for (var j = 0; j < app.textFonts.length; j++) {
            var fj = app.textFonts[j];
            var cFam = fj.family.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cFam === qClean) {
                var st = fj.style.toLowerCase();
                if (st === "regular" || st === "roman" || st === "normal" || st === "book") return fj;
            }
        }

        for (var k = 0; k < app.textFonts.length; k++) {
            var fk = app.textFonts[k];
            if (fk.family.toLowerCase().indexOf(query.toLowerCase()) !== -1 || fk.name.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                return fk;
            }
        }

        return null;
    }

    // =========================================================================
    // 2. SCANNING & OVERSET ENGINE
    // =========================================================================

    function isItemOnArtboard(doc, item, abRect) {
        try {
            var gb = item.geometricBounds;
            return !(gb[0] > abRect[2] || gb[2] < abRect[0] || gb[1] < abRect[3] || gb[3] > abRect[1]);
        } catch (e) {
            return false;
        }
    }

    function collectTextFrames(doc, scopeType) {
        var textFrames = [];
        if (!doc) return textFrames;

        var activeIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = (scopeType === "artboard" && doc.artboards.length > activeIdx) ? doc.artboards[activeIdx].artboardRect : null;

        if (scopeType === "selection") {
            var sel = doc.selection;
            if (!sel || sel.length === 0) return textFrames;

            function walkItem(item) {
                if (!item) return;
                if (item.typename === "TextFrame") {
                    textFrames.push(item);
                } else if (item.typename === "GroupItem") {
                    for (var g = 0; g < item.pageItems.length; g++) walkItem(item.pageItems[g]);
                }
            }
            for (var s = 0; s < sel.length; s++) walkItem(sel[s]);
        } else {
            var all = doc.textFrames;
            for (var i = 0; i < all.length; i++) {
                var tf = all[i];
                if (scopeType === "artboard" && abRect) {
                    if (isItemOnArtboard(doc, tf, abRect)) textFrames.push(tf);
                } else {
                    textFrames.push(tf);
                }
            }
        }
        return textFrames;
    }

    function isFrameOverset(tf) {
        if (!tf || tf.kind !== TextType.AREATEXT) return false;
        try {
            var story = tf.story;
            if (!story) return false;
            if (story.textFrames && story.textFrames.length > 1) {
                if (tf !== story.textFrames[story.textFrames.length - 1]) return false;
            }
            var totalChars = story.characters ? story.characters.length : 0;
            var visibleChars = 0;
            if (tf.lines) {
                for (var l = 0; l < tf.lines.length; l++) visibleChars += tf.lines[l].characters.length;
            }
            if (totalChars > visibleChars) return true;
            if (story.lines && tf.lines && tf.lines.length < story.lines.length) return true;
        } catch (e) {}
        return false;
    }

    function inspectTextFrame(tf, frameIndex) {
        var records = [];
        if (!tf || !tf.contents || tf.contents.length === 0) return records;

        try {
            var ranges = tf.textRanges;
            if (!ranges || ranges.length === 0) ranges = [tf.textRange];

            for (var r = 0; r < ranges.length; r++) {
                var tr = ranges[r];
                if (!tr || !tr.contents || tr.contents.length === 0) continue;

                var ca = tr.characterAttributes;
                if (!ca) continue;

                var fontObj = ca.textFont;
                var fontName = fontObj ? fontObj.name : "UnknownFont";
                var fontFamily = fontObj ? (fontObj.family || fontName) : fontName;
                var fontStyle = fontObj ? (fontObj.style || "Regular") : "Regular";
                var size = ca.size || 12;

                records.push({
                    fontName: fontName,
                    fontFamily: fontFamily,
                    fontStyle: fontStyle,
                    size: Math.round(size * 100) / 100,
                    frameIndex: frameIndex,
                    textFrame: tf
                });
            }
        } catch (eInspect) {}
        return records;
    }

    function scan(doc, scopeType) {
        var frames = collectTextFrames(doc, scopeType);
        var fontMap = {};
        var sizeMap = {};
        var oversetFrames = [];
        var docFontsMap = {};

        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            var overset = isFrameOverset(tf);
            if (overset) {
                oversetFrames.push({
                    frameIndex: i,
                    textFrame: tf,
                    preview: tf.contents ? tf.contents.substring(0, 30).replace(/[\r\n]+/g, " ") : "(empty)"
                });
            }

            var recs = inspectTextFrame(tf, i);
            for (var r = 0; r < recs.length; r++) {
                var rec = recs[r];
                var fKey = rec.fontFamily + "|||" + rec.fontStyle + "|||" + rec.fontName;
                var sKey = rec.size.toString();
                docFontsMap[rec.fontFamily + " (" + rec.fontStyle + ")"] = rec.fontName;

                // Group by font
                if (!fontMap[fKey]) {
                    fontMap[fKey] = {
                        fontFamily: rec.fontFamily,
                        fontStyle: rec.fontStyle,
                        fontName: rec.fontName,
                        sizes: {},
                        frameCount: 0,
                        frames: [],
                        hasOverset: false
                    };
                }
                fontMap[fKey].sizes[rec.size] = true;
                if (fontMap[fKey].frames.indexOf(tf) === -1) {
                    fontMap[fKey].frames.push(tf);
                    fontMap[fKey].frameCount++;
                }
                if (overset) fontMap[fKey].hasOverset = true;

                // Group by size
                if (!sizeMap[sKey]) {
                    sizeMap[sKey] = {
                        size: rec.size,
                        fonts: {},
                        frameCount: 0,
                        frames: [],
                        hasOverset: false
                    };
                }
                sizeMap[sKey].fonts[rec.fontFamily] = true;
                if (sizeMap[sKey].frames.indexOf(tf) === -1) {
                    sizeMap[sKey].frames.push(tf);
                    sizeMap[sKey].frameCount++;
                }
                if (overset) sizeMap[sKey].hasOverset = true;
            }
        }

        // List by font
        var fontList = [];
        for (var fk in fontMap) {
            if (fontMap.hasOwnProperty(fk)) {
                var fItem = fontMap[fk];
                var sizesArr = [];
                for (var sz in fItem.sizes) {
                    if (fItem.sizes.hasOwnProperty(sz)) sizesArr.push(parseFloat(sz));
                }
                sizesArr.sort(function (a, b) { return a - b; });
                fItem.sizes = sizesArr;
                fontList.push(fItem);
            }
        }
        fontList.sort(function (a, b) { return b.frameCount - a.frameCount; });

        // List by size
        var sizeList = [];
        for (var sk in sizeMap) {
            if (sizeMap.hasOwnProperty(sk)) {
                var sItem = sizeMap[sk];
                var fFamArr = [];
                for (var ff in sItem.fonts) {
                    if (sItem.fonts.hasOwnProperty(ff)) fFamArr.push(ff);
                }
                sItem.fontSummary = fFamArr.join(", ");
                sizeList.push(sItem);
            }
        }
        sizeList.sort(function (a, b) { return b.frameCount - a.frameCount; });

        // Document fonts dropdown list
        var docFontsList = [];
        for (var df in docFontsMap) {
            if (docFontsMap.hasOwnProperty(df)) {
                docFontsList.push({ label: df, postscriptName: docFontsMap[df] });
            }
        }

        return {
            totalFrames: frames.length,
            totalFonts: fontList.length,
            totalSizes: sizeList.length,
            oversetCount: oversetFrames.length,
            oversetFrames: oversetFrames,
            fonts: fontList,
            sizes: sizeList,
            docFonts: docFontsList,
            allFrames: frames
        };
    }

    function selectTargetFrames(doc, targetFrames) {
        if (!doc) return 0;
        doc.selection = null;
        var count = 0;
        for (var i = 0; i < targetFrames.length; i++) {
            try {
                targetFrames[i].selected = true;
                count++;
            } catch (e) {}
        }
        return count;
    }

    function getSelectedFrames(doc) {
        var frames = [];
        if (!doc) return frames;
        var sel = doc.selection;
        if (!sel || sel.length === 0) return frames;

        function walk(item) {
            if (!item) return;
            if (item.typename === "TextFrame") frames.push(item);
            else if (item.typename === "GroupItem") {
                for (var g = 0; g < item.pageItems.length; g++) walk(item.pageItems[g]);
            }
        }
        for (var s = 0; s < sel.length; s++) walk(sel[s]);
        return frames;
    }

    // =========================================================================
    // 3. FONT & SIZE APPLICATION TOOLS
    // =========================================================================

    function applyFontToFrames(frames, fontObj) {
        if (!frames || frames.length === 0 || !fontObj) return 0;
        var count = 0;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            if (!tf) continue;
            try {
                tf.textRange.characterAttributes.textFont = fontObj;
                count++;
            } catch (e) {
                try {
                    if (tf.textRanges && tf.textRanges.length > 0) {
                        for (var r = 0; r < tf.textRanges.length; r++) {
                            tf.textRanges[r].characterAttributes.textFont = fontObj;
                        }
                        count++;
                    }
                } catch (e2) {}
            }
        }
        return count;
    }

    function applySizeToFrames(frames, newSize) {
        if (!frames || frames.length === 0 || isNaN(newSize) || newSize <= 0) return 0;
        var count = 0;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            if (!tf) continue;
            try {
                tf.textRange.characterAttributes.size = newSize;
                count++;
            } catch (e) {
                try {
                    if (tf.textRanges && tf.textRanges.length > 0) {
                        for (var r = 0; r < tf.textRanges.length; r++) {
                            tf.textRanges[r].characterAttributes.size = newSize;
                        }
                        count++;
                    }
                } catch (e2) {}
            }
        }
        return count;
    }

    function adjustSizeOnFrames(frames, delta) {
        if (!frames || frames.length === 0 || isNaN(delta)) return 0;
        var count = 0;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            if (!tf) continue;
            try {
                var cur = tf.textRange.characterAttributes.size || 12;
                var target = Math.max(1, Math.round((cur + delta) * 10) / 10);
                tf.textRange.characterAttributes.size = target;
                count++;
            } catch (e) {}
        }
        return count;
    }

    function roundFractionalSizes(frames) {
        if (!frames || frames.length === 0) return 0;
        var count = 0;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            if (!tf) continue;
            try {
                var cur = tf.textRange.characterAttributes.size || 12;
                var rounded = Math.round(cur);
                if (Math.abs(cur - rounded) > 0.05) {
                    tf.textRange.characterAttributes.size = rounded;
                    count++;
                }
            } catch (e) {}
        }
        return count;
    }

    function scaleSizesPercent(frames, percentFactor) {
        if (!frames || frames.length === 0 || isNaN(percentFactor)) return 0;
        var count = 0;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            if (!tf) continue;
            try {
                var cur = tf.textRange.characterAttributes.size || 12;
                var target = Math.max(1, Math.round(cur * (1 + percentFactor / 100) * 10) / 10);
                tf.textRange.characterAttributes.size = target;
                count++;
            } catch (e) {}
        }
        return count;
    }

    // =========================================================================
    // 4. AUTO-FIT HEIGHT & HYPHENATION
    // =========================================================================

    function applyNativeAutoSize(doc, framesToProcess) {
        if (!doc || !framesToProcess || framesToProcess.length === 0) return 0;
        var actionFile = new File(Folder.temp.fsName + "/TypeFlowNativeAutoHeight.aia");
        var actionLoaded = false;
        var success = 0;

        try {
            var aiaContent = [
                "/version 3",
                "/name [" + ACTION_SET_NAME.length + " " + ACTION_SET_NAME + "]",
                "/isOpen 1",
                "/actionCount 1",
                "/action-1 {",
                "  /name [" + ACTION_NAME.length + " " + ACTION_NAME + "]",
                "  /keyIndex 0",
                "  /colorIndex 0",
                "  /isOpen 1",
                "  /eventCount 1",
                "  /event-1 {",
                "    /useActionPalette 0",
                "    /name [ 17 61 72 65 61 54 79 70 65 4f 70 74 69 6f 6e 73 53 65 74 ]",
                "    /hasDialog 0",
                "    /parameterCount 1",
                "    /parameter-1 {",
                "      /key 1635087219",
                "      /showInPalette -1",
                "      /type (boolean)",
                "      /value 1",
                "    }",
                "  }",
                "}"
            ].join("\n");

            actionFile.open("w");
            actionFile.write(aiaContent);
            actionFile.close();

            try { app.unloadAction(ACTION_SET_NAME, ""); } catch (eU) {}
            app.loadAction(actionFile);
            actionLoaded = true;
        } catch (eAIA) {}

        if (actionLoaded) {
            for (var i = 0; i < framesToProcess.length; i++) {
                var tf = framesToProcess[i];
                if (tf && tf.kind === TextType.AREATEXT) {
                    try {
                        doc.selection = null;
                        tf.selected = true;
                        app.doScript(ACTION_NAME, ACTION_SET_NAME);
                        success++;
                    } catch (eR) {}
                }
            }
            try {
                app.unloadAction(ACTION_SET_NAME, "");
                actionFile.remove();
            } catch (eC) {}
        }
        try { doc.selection = null; } catch (eS) {}
        return success;
    }

    function autoFitHeight(doc, targetFrames, isHyphenOn, doResize) {
        if (doResize === undefined) doResize = true;
        var processed = 0;
        var oversetFixed = 0;
        var eligibleForNative = [];

        for (var i = 0; i < targetFrames.length; i++) {
            var tf = targetFrames[i];
            if (!tf || tf.kind !== TextType.AREATEXT) continue;

            try {
                if (tf.contents) {
                    var trimmed = tf.contents.replace(/[\r\n\s]+$/, "");
                    if (trimmed !== tf.contents && trimmed.length > 0) tf.contents = trimmed;
                }

                if (isHyphenOn !== undefined) {
                    if (tf.paragraphs && tf.paragraphs.length > 0) {
                        for (var p = 0; p < tf.paragraphs.length; p++) {
                            tf.paragraphs[p].paragraphAttributes.hyphenation = isHyphenOn;
                        }
                    } else if (tf.textRange && tf.textRange.paragraphAttributes) {
                        tf.textRange.paragraphAttributes.hyphenation = isHyphenOn;
                    }
                }

                if (!doResize) {
                    processed++;
                    continue;
                }

                var wasOverset = isFrameOverset(tf);
                var fontSize = 12;
                var leading = 14;
                try {
                    var ca = tf.textRange.characterAttributes;
                    fontSize = ca.size || 12;
                    leading = (ca.autoLeading || !ca.leading || ca.leading === 0) ? (fontSize * 1.25) : ca.leading;
                } catch (eCA) {}

                var totalLines = 1;
                try {
                    totalLines = (tf.story && tf.story.lines) ? Math.max(tf.story.lines.length, tf.lines.length) : tf.lines.length;
                } catch (eL) {}

                var origLeft = tf.left;
                var origTop = tf.top;
                var origWidth = (tf.textPath && tf.textPath.width) ? tf.textPath.width : tf.width;

                if (wasOverset) {
                    if (tf.textPath) {
                        tf.textPath.height = Math.max(tf.textPath.height * 2, totalLines * leading * 1.5 + 80);
                        tf.top = origTop;
                        tf.left = origLeft;
                    }
                    try {
                        app.redraw();
                        if (tf.story && tf.story.lines) totalLines = tf.story.lines.length;
                    } catch (eR) {}
                }

                var snugHeight = Math.ceil((totalLines * leading) + (fontSize * 0.45));
                if (snugHeight < fontSize * 1.2) snugHeight = Math.ceil(fontSize * 1.3);

                if (tf.textPath) {
                    tf.textPath.height = snugHeight;
                    tf.textPath.width = origWidth;
                } else {
                    tf.height = snugHeight;
                }

                tf.top = origTop;
                tf.left = origLeft;

                if (wasOverset) oversetFixed++;
                processed++;
                eligibleForNative.push(tf);
            } catch (eFit) {}
        }

        if (doResize && eligibleForNative.length > 0) {
            applyNativeAutoSize(doc, eligibleForNative);
        }

        return { processed: processed, oversetFixed: oversetFixed };
    }

    // =========================================================================
    // 5. FLOATING PALETTE INTERFACE
    // =========================================================================

    var currentScan = null;
    var currentScope = "document";
    var viewMode = "font"; // "font" or "size"

    var win = new Window("palette", "TypeFlow", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 10;

    // --- Header Strip: Scope + Refresh ---
    var grpHeader = win.add("group");
    grpHeader.orientation = "row";
    grpHeader.alignChildren = ["fill", "center"];
    grpHeader.spacing = 6;

    var ddScope = grpHeader.add("dropdownlist", undefined, ["Entire Document", "Active Artboard", "Selection"]);
    ddScope.selection = 0;
    ddScope.preferredSize = [190, 24];

    var btnRefresh = grpHeader.add("button", undefined, "Refresh");
    btnRefresh.preferredSize = [80, 24];

    // --- View Toggle: By Font vs By Size ---
    var grpView = win.add("group");
    grpView.orientation = "row";
    grpView.alignChildren = ["left", "center"];
    grpView.spacing = 14;

    var lblView = grpView.add("statictext", undefined, "View List:");
    var rbByFont = grpView.add("radiobutton", undefined, "By Font");
    var rbBySize = grpView.add("radiobutton", undefined, "By Size");
    rbByFont.value = true;

    // --- Filter Search Bar ---
    var editFilter = win.add("edittext", undefined, "");
    editFilter.preferredSize = [280, 22];
    editFilter.helpTip = "Filter fonts or point sizes (e.g. Poppins, 16)";

    // --- Stacked Listboxes: Font View vs Size View ---
    var grpListStack = win.add("group");
    grpListStack.orientation = "stack";
    grpListStack.alignChildren = ["fill", "fill"];

    var fontList = grpListStack.add("listbox", undefined, "", {
        numberOfColumns: 3,
        showHeaders: true,
        columnTitles: ["Font Family & Style", "Sizes (pt)", "Count"]
    });
    fontList.preferredSize = [320, 130];
    fontList.helpTip = "Click any row to select those text frames on canvas";

    var sizeList = grpListStack.add("listbox", undefined, "", {
        numberOfColumns: 3,
        showHeaders: true,
        columnTitles: ["Font Size (pt)", "Fonts Used", "Count"]
    });
    sizeList.preferredSize = [320, 130];
    sizeList.visible = false;
    sizeList.helpTip = "Click any size to select all frames using this exact point size";

    // --- ALWAYS-VISIBLE Overset Warning Button & Copy Report ---
    var grpOverset = win.add("group");
    grpOverset.orientation = "row";
    grpOverset.alignChildren = ["fill", "center"];
    grpOverset.spacing = 6;

    var btnSelectOverset = grpOverset.add("button", undefined, "[!] Select Overset (0)");
    btnSelectOverset.preferredSize = [170, 24];
    btnSelectOverset.enabled = false; // Enabled dynamically when oversets > 0

    var btnCopy = grpOverset.add("button", undefined, "Copy Report");
    btnCopy.preferredSize = [100, 24];

    // =========================================================================
    // CHANGE FONT & SIZE CONTROLS
    // =========================================================================
    var pnlChange = win.add("panel", undefined, "Change Font & Size");
    pnlChange.orientation = "column";
    pnlChange.alignChildren = ["fill", "top"];
    pnlChange.spacing = 5;
    pnlChange.margins = 8;

    // Target font row
    var grpFontRow = pnlChange.add("group");
    grpFontRow.orientation = "row";
    grpFontRow.alignChildren = ["left", "center"];
    grpFontRow.spacing = 6;

    var lblFont = grpFontRow.add("statictext", undefined, "New Font:");
    lblFont.preferredSize = [65, 20];

    var ddNewFont = grpFontRow.add("dropdownlist", undefined, ["(Choose Document Font)"]);
    ddNewFont.preferredSize = [145, 24];
    ddNewFont.selection = 0;

    var btnChangeFont = grpFontRow.add("button", undefined, "Change Font");
    btnChangeFont.preferredSize = [85, 24];
    btnChangeFont.helpTip = "Replaces font on all selected frames";

    // Custom Font Name input
    var grpCustomFont = pnlChange.add("group");
    grpCustomFont.orientation = "row";
    grpCustomFont.alignChildren = ["left", "center"];
    grpCustomFont.spacing = 6;

    var lblCustom = grpCustomFont.add("statictext", undefined, "Or Type:");
    lblCustom.preferredSize = [65, 20];

    var editCustomFont = grpCustomFont.add("edittext", undefined, "");
    editCustomFont.preferredSize = [145, 22];
    editCustomFont.helpTip = "Type any font name (e.g. Poppins Bold, Arial, Helvetica)";

    var btnApplyCustom = grpCustomFont.add("button", undefined, "Apply Typed");
    btnApplyCustom.preferredSize = [85, 24];

    // Font Size row
    var grpSizeRow = pnlChange.add("group");
    grpSizeRow.orientation = "row";
    grpSizeRow.alignChildren = ["left", "center"];
    grpSizeRow.spacing = 6;

    var lblSize = grpSizeRow.add("statictext", undefined, "New Size:");
    lblSize.preferredSize = [65, 20];

    var editSize = grpSizeRow.add("edittext", undefined, "");
    editSize.preferredSize = [50, 22];
    editSize.helpTip = "Enter font size in points (e.g. 14, 18.5)";

    var btnMinus = grpSizeRow.add("button", undefined, "-1");
    btnMinus.preferredSize = [26, 24];

    var btnPlus = grpSizeRow.add("button", undefined, "+1");
    btnPlus.preferredSize = [26, 24];

    var btnChangeSize = grpSizeRow.add("button", undefined, "Change Size");
    btnChangeSize.preferredSize = [85, 24];
    btnChangeSize.helpTip = "Sets point size on all selected frames";

    // Size Harmonizer Tools (Round fractional sizes & Scale % to solve runaway sizes)
    var grpSizeTools = pnlChange.add("group");
    grpSizeTools.orientation = "row";
    grpSizeTools.alignChildren = ["fill", "center"];
    grpSizeTools.spacing = 5;

    var btnRoundSizes = grpSizeTools.add("button", undefined, "Round All Sizes");
    btnRoundSizes.preferredSize = [120, 23];
    btnRoundSizes.helpTip = "Rounds all messy decimal sizes (e.g. 21.49 pt -> 21 pt) to whole integers";

    var btnScaleDown = grpSizeTools.add("button", undefined, "Scale -10%");
    btnScaleDown.preferredSize = [78, 23];
    btnScaleDown.helpTip = "Scales down selected frames by -10% when fonts become too large";

    var btnScaleUp = grpSizeTools.add("button", undefined, "Scale +10%");
    btnScaleUp.preferredSize = [78, 23];
    btnScaleUp.helpTip = "Scales up selected frames by +10%";

    // --- Checkboxes: Auto-Fit Height & Hyphenation ---
    var grpChecks = win.add("group");
    grpChecks.orientation = "row";
    grpChecks.alignChildren = ["left", "center"];
    grpChecks.spacing = 16;

    var chkAutoFit = grpChecks.add("checkbox", undefined, "Auto-Fit Height");
    chkAutoFit.value = true;
    chkAutoFit.helpTip = "Snaps frame height to text and enables dynamic live Auto-Size";

    var chkHyphen = grpChecks.add("checkbox", undefined, "Hyphenation");
    chkHyphen.value = true;
    chkHyphen.helpTip = "Enable or disable paragraph hyphenation";

    // --- Action Buttons ---
    var grpActions = win.add("group");
    grpActions.orientation = "row";
    grpActions.alignChildren = ["fill", "center"];
    grpActions.spacing = 6;

    var btnApply = grpActions.add("button", undefined, "Apply Auto-Fit & Hyphen");
    btnApply.preferredSize = [170, 26];

    var btnFixAll = grpActions.add("button", undefined, "Fix All in Doc");
    btnFixAll.preferredSize = [120, 26];

    // --- Bottom Status & Close Strip ---
    var grpBottom = win.add("group");
    grpBottom.orientation = "row";
    grpBottom.alignChildren = ["fill", "center"];

    var txtStatus = grpBottom.add("statictext", undefined, "Ready");
    txtStatus.preferredSize = [230, 22];
    txtStatus.graphics.foregroundColor = txtStatus.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.6, 0.6, 0.6, 1], 1);

    var btnClose = grpBottom.add("button", undefined, "Close");
    btnClose.preferredSize = [65, 24];
    btnClose.onClick = function () {
        win.close();
    };

    // =========================================================================
    // 6. EVENT HANDLERS & TWO-WAY INTERACTION
    // =========================================================================

    function populateFontDropdown() {
        ddNewFont.removeAll();
        ddNewFont.add("item", "(Choose Document Font)");

        if (currentScan && currentScan.docFonts) {
            for (var d = 0; d < currentScan.docFonts.length; d++) {
                var df = currentScan.docFonts[d];
                var itm = ddNewFont.add("item", df.label);
                itm.postscriptName = df.postscriptName;
            }
        }

        ddNewFont.add("separator");
        for (var c = 0; c < COMMON_FONTS.length; c++) {
            var cf = ddNewFont.add("item", COMMON_FONTS[c]);
            cf.postscriptName = COMMON_FONTS[c];
        }

        ddNewFont.selection = 0;
    }

    function refreshUI() {
        var d = getDoc();
        if (!d) {
            fontList.removeAll();
            sizeList.removeAll();
            ddNewFont.removeAll();
            btnSelectOverset.text = "No open document";
            btnSelectOverset.enabled = false;
            txtStatus.text = "Open a document in Illustrator to inspect";
            return;
        }

        if (ddScope.selection.index === 0) currentScope = "document";
        else if (ddScope.selection.index === 1) currentScope = "artboard";
        else currentScope = "selection";

        currentScan = scan(d, currentScope);
        populateLists(editFilter.text);
        populateFontDropdown();

        // ALWAYS keep btnSelectOverset visible!
        btnSelectOverset.visible = true;
        if (currentScan.oversetCount > 0) {
            btnSelectOverset.text = "[!] Select Overset (" + currentScan.oversetCount + ")";
            btnSelectOverset.enabled = true;
            txtStatus.text = currentScan.totalFrames + " frames | " + currentScan.totalFonts + " fonts | " + currentScan.oversetCount + " overset";
        } else {
            btnSelectOverset.text = "[OK] No Overset (0)";
            btnSelectOverset.enabled = false;
            txtStatus.text = currentScan.totalFrames + " frames | " + currentScan.totalFonts + " fonts | 0 overset";
        }
        win.layout.layout(true);
    }

    function populateLists(filterText) {
        fontList.removeAll();
        sizeList.removeAll();
        if (!currentScan) return;

        filterText = (filterText || "").toLowerCase();

        // Populate Font List
        if (currentScan.fonts) {
            for (var i = 0; i < currentScan.fonts.length; i++) {
                var f = currentScan.fonts[i];
                var fTitle = f.fontFamily + " (" + f.fontStyle + ")";
                var sizesStr = f.sizes.join(", ");

                if (filterText.length > 0) {
                    var sTarget = (fTitle + " " + f.fontName + " " + sizesStr).toLowerCase();
                    if (sTarget.indexOf(filterText) === -1) continue;
                }

                var item = fontList.add("item", fTitle);
                item.subItems[0].text = sizesStr + " pt";
                item.subItems[1].text = f.frameCount.toString() + (f.hasOverset ? " [!]" : "");
                item.fontData = f;
            }
        }

        // Populate Size List
        if (currentScan.sizes) {
            for (var j = 0; j < currentScan.sizes.length; j++) {
                var s = currentScan.sizes[j];
                var sTitle = s.size + " pt";
                var fSummary = s.fontSummary;

                if (filterText.length > 0) {
                    var sTarget2 = (sTitle + " " + fSummary).toLowerCase();
                    if (sTarget2.indexOf(filterText) === -1) continue;
                }

                var sItem = sizeList.add("item", sTitle);
                sItem.subItems[0].text = fSummary;
                sItem.subItems[1].text = s.frameCount.toString() + (s.hasOverset ? " [!]" : "");
                sItem.sizeData = s;
            }
        }
    }

    // Toggle View Mode: By Font vs By Size
    rbByFont.onClick = function () {
        viewMode = "font";
        fontList.visible = true;
        sizeList.visible = false;
        win.layout.layout(true);
    };

    rbBySize.onClick = function () {
        viewMode = "size";
        fontList.visible = false;
        sizeList.visible = true;
        win.layout.layout(true);
    };

    // Direct selection when clicking any font row
    fontList.onChange = function () {
        var d = getDoc();
        if (!d || !fontList.selection) return;
        var fData = fontList.selection.fontData;
        if (fData && fData.frames && fData.frames.length > 0) {
            var count = selectTargetFrames(d, fData.frames);
            app.redraw();
            txtStatus.text = "Selected " + count + " frame(s) using " + fData.fontFamily;

            if (fData.sizes && fData.sizes.length > 0) {
                editSize.text = fData.sizes[0].toString();
            }
        }
    };

    // Direct selection when clicking any size row
    sizeList.onChange = function () {
        var d = getDoc();
        if (!d || !sizeList.selection) return;
        var sData = sizeList.selection.sizeData;
        if (sData && sData.frames && sData.frames.length > 0) {
            var count = selectTargetFrames(d, sData.frames);
            app.redraw();
            txtStatus.text = "Selected " + count + " frame(s) with size " + sData.size + " pt";
            editSize.text = sData.size.toString();
        }
    };

    // Filter typing
    editFilter.onChanging = function () {
        populateLists(editFilter.text);
    };

    // Scope & Refresh
    ddScope.onChange = refreshUI;
    btnRefresh.onClick = refreshUI;

    win.onActivate = function () {
        refreshUI();
    };

    win.onClose = function () {
        $.global.typeFlowWindow = null;
    };

    function getActiveTargetFrames(d) {
        var targetFrames = getSelectedFrames(d);
        if (targetFrames.length === 0) {
            if (viewMode === "font" && fontList.selection && fontList.selection.fontData) {
                targetFrames = fontList.selection.fontData.frames;
            } else if (viewMode === "size" && sizeList.selection && sizeList.selection.sizeData) {
                targetFrames = sizeList.selection.sizeData.frames;
            }
        }
        if (targetFrames.length === 0 && currentScan && currentScan.allFrames) {
            targetFrames = currentScan.allFrames;
        }
        return targetFrames;
    }

    // --- EXECUTE FONT REPLACEMENT ---
    function doChangeFont(fontTarget) {
        var d = getDoc();
        if (!d) return;

        var targetFrames = getSelectedFrames(d);
        if (targetFrames.length === 0) {
            if (viewMode === "font" && fontList.selection && fontList.selection.fontData) {
                targetFrames = fontList.selection.fontData.frames;
            } else if (viewMode === "size" && sizeList.selection && sizeList.selection.sizeData) {
                targetFrames = sizeList.selection.sizeData.frames;
            }
        }

        if (!targetFrames || targetFrames.length === 0) {
            alert("Please select a font/size row or select text frames on canvas first.", "Change Font");
            return;
        }

        var resolved = resolveFont(fontTarget);
        if (!resolved) {
            alert("Could not find installed font matching:\n\"" + fontTarget + "\"\nPlease check the name.", "Font Not Found");
            return;
        }

        var changed = applyFontToFrames(targetFrames, resolved);

        if (chkAutoFit.value) {
            autoFitHeight(d, targetFrames, chkHyphen.value, true);
        }

        app.redraw();
        refreshUI();
        txtStatus.text = "Changed font to " + resolved.family + " (" + resolved.style + ") on " + changed + " frame(s)";
    }

    btnChangeFont.onClick = function () {
        if (!ddNewFont.selection || ddNewFont.selection.index === 0) {
            alert("Please choose a font from the dropdown, or type a font name below.", "TypeFlow");
            return;
        }
        var targetName = ddNewFont.selection.postscriptName || ddNewFont.selection.text;
        doChangeFont(targetName);
    };

    btnApplyCustom.onClick = function () {
        var query = editCustomFont.text;
        if (!query || query.replace(/^\s+|\s+$/g, "").length === 0) {
            alert("Please type a font name (e.g. Poppins Bold, Arial, Helvetica).", "TypeFlow");
            return;
        }
        doChangeFont(query);
    };

    // --- EXECUTE SIZE REPLACEMENT ---
    btnChangeSize.onClick = function () {
        var d = getDoc();
        if (!d) return;

        var newSize = parseFloat(editSize.text);
        if (isNaN(newSize) || newSize <= 0) {
            alert("Please enter a valid font size in points (e.g. 14).", "Invalid Size");
            return;
        }

        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) {
            alert("Please select a row or select text frames on canvas first.", "Change Size");
            return;
        }

        var changed = applySizeToFrames(targetFrames, newSize);

        if (chkAutoFit.value) {
            autoFitHeight(d, targetFrames, chkHyphen.value, true);
        }

        app.redraw();
        refreshUI();
        txtStatus.text = "Updated font size to " + newSize + " pt on " + changed + " frame(s)";
    };

    btnMinus.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) return;

        var count = adjustSizeOnFrames(targetFrames, -1);
        if (chkAutoFit.value) autoFitHeight(d, targetFrames, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Reduced font size by 1 pt on " + count + " frame(s)";
    };

    btnPlus.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) return;

        var count = adjustSizeOnFrames(targetFrames, 1);
        if (chkAutoFit.value) autoFitHeight(d, targetFrames, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Increased font size by 1 pt on " + count + " frame(s)";
    };

    // --- 1-CLICK ROUND FRACTIONAL SIZES ---
    btnRoundSizes.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) {
            alert("No text frames found to round sizes.", "Round Sizes");
            return;
        }

        var roundedCount = roundFractionalSizes(targetFrames);
        if (chkAutoFit.value) autoFitHeight(d, targetFrames, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Rounded " + roundedCount + " fractional font sizes to whole numbers.";
    };

    // --- SCALE PERCENT TOOLS ---
    btnScaleDown.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) return;

        var count = scaleSizesPercent(targetFrames, -10);
        if (chkAutoFit.value) autoFitHeight(d, targetFrames, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Scaled down " + count + " frame(s) by -10%.";
    };

    btnScaleUp.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targetFrames = getActiveTargetFrames(d);
        if (!targetFrames || targetFrames.length === 0) return;

        var count = scaleSizesPercent(targetFrames, 10);
        if (chkAutoFit.value) autoFitHeight(d, targetFrames, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Scaled up " + count + " frame(s) by +10%.";
    };

    // Select Overset Frames
    btnSelectOverset.onClick = function () {
        var d = getDoc();
        if (!d || !currentScan || currentScan.oversetCount === 0) return;
        var overFrames = [];
        for (var o = 0; o < currentScan.oversetFrames.length; o++) {
            overFrames.push(currentScan.oversetFrames[o].textFrame);
        }
        var count = selectTargetFrames(d, overFrames);
        app.redraw();
        txtStatus.text = "Selected " + count + " overset text frame(s).";
    };

    // Copy Summary Report
    btnCopy.onClick = function () {
        var d = getDoc();
        if (!d) return;
        if (!currentScan) refreshUI();
        var report = [];
        report.push("TYPEFLOW TYPOGRAPHY & SIZE SUMMARY - " + d.name);
        report.push("Frames: " + currentScan.totalFrames + " | Fonts: " + currentScan.totalFonts + " | Sizes: " + currentScan.totalSizes + " | Overset: " + currentScan.oversetCount);
        report.push("----------------------------------------");
        report.push("[BY FONT]");
        for (var i = 0; i < currentScan.fonts.length; i++) {
            var f = currentScan.fonts[i];
            report.push((i + 1) + ". " + f.fontFamily + " (" + f.fontStyle + ") - " + f.sizes.join(", ") + " pt [" + f.frameCount + " frames]");
        }
        report.push("");
        report.push("[BY SIZE]");
        for (var j = 0; j < currentScan.sizes.length; j++) {
            var s = currentScan.sizes[j];
            report.push((j + 1) + ". " + s.size + " pt [" + s.frameCount + " frames] - " + s.fontSummary);
        }

        var w = new Window("dialog", "TypeFlow Summary");
        w.alignChildren = ["fill", "top"];
        w.add("statictext", undefined, "Press Cmd+C to copy:");
        var et = w.add("edittext", undefined, report.join("\n"), { multiline: true, scrolling: true });
        et.preferredSize = [420, 240];
        var b = w.add("button", undefined, "Done");
        b.onClick = function () { w.close(); };
        w.show();
    };

    // Apply Settings (Auto-Fit & Hyphenation)
    btnApply.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var targets = getActiveTargetFrames(d);

        if (targets.length === 0) {
            alert("No text frames found to apply settings.", "TypeFlow");
            return;
        }

        var res = autoFitHeight(d, targets, chkHyphen.value, chkAutoFit.value);
        app.redraw();
        refreshUI();
        txtStatus.text = "Applied to " + res.processed + " frame(s) | Overset fixed: " + res.oversetFixed;
    };

    // 1-Click Fix All in Document
    btnFixAll.onClick = function () {
        var d = getDoc();
        if (!d) return;
        var all = d.textFrames;
        var targets = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].kind === TextType.AREATEXT) targets.push(all[i]);
        }
        if (targets.length === 0) {
            alert("No paragraph frames found in document.", "Fix All");
            return;
        }
        var res = autoFitHeight(d, targets, chkHyphen.value, true);
        app.redraw();
        refreshUI();
        txtStatus.text = "Fixed " + res.processed + " paragraphs | " + res.oversetFixed + " oversets resolved";
    };

    // Store in global memory and show modeless palette
    $.global.typeFlowWindow = win;
    refreshUI();
    win.show();

})();