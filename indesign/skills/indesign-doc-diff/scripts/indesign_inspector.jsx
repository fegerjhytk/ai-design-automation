// indesign_inspector.jsx
// Headless InDesign Deep Document Inspector Engine for indesign-doc-diff skill
#target indesign

(function() {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;

    var targetDocPath = "%%TARGET_DOC_PATH%%";
    var outputJsonPath = "%%OUTPUT_JSON_PATH%%";

    // Find or open target document
    var doc = null;
    var openedByScript = false;

    if (targetDocPath && targetDocPath !== "%%TARGET_DOC_PATH%%") {
        var targetFile = new File(targetDocPath);
        for (var i = 0; i < app.documents.length; i++) {
            try {
                if (app.documents[i].fullName.fsName === targetFile.fsName) {
                    doc = app.documents[i];
                    break;
                }
            } catch(e) {}
        }
        if (!doc && targetFile.exists) {
            try {
                doc = app.open(targetFile, false); // Open without window if supported, or open normally
                openedByScript = true;
            } catch(e) {
                doc = app.open(targetFile);
                openedByScript = true;
            }
        }
    } else if (app.documents.length > 0) {
        doc = app.activeDocument;
    }

    if (!doc) {
        var errFile = new File(outputJsonPath);
        errFile.encoding = "UTF-8";
        errFile.open("w");
        errFile.write('{"error": "Document could not be opened or found."}');
        errFile.close();
        return;
    }

    function cleanString(str) {
        if (!str) return "";
        return String(str)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    }

    function roundVal(n) {
        return Math.round(Number(n) * 100) / 100;
    }

    function roundArr(arr) {
        var res = [];
        for (var i = 0; i < arr.length; i++) {
            res.push(roundVal(arr[i]));
        }
        return res;
    }

    var docData = {
        name: doc.name,
        filePath: "",
        pagesCount: doc.pages.length,
        documentPreferences: {
            pageWidth: roundVal(doc.documentPreferences.pageWidth),
            pageHeight: roundVal(doc.documentPreferences.pageHeight),
            facingPages: Boolean(doc.documentPreferences.facingPages),
            bleedTop: roundVal(doc.documentPreferences.documentBleedTopOffset),
            bleedBottom: roundVal(doc.documentPreferences.documentBleedBottomOffset),
            bleedInside: roundVal(doc.documentPreferences.documentBleedInsideOrLeftOffset),
            bleedOutside: roundVal(doc.documentPreferences.documentBleedOutsideOrRightOffset)
        },
        layers: [],
        masters: [],
        appliedMasters: [],
        margins: [],
        links: [],
        fonts: [],
        swatches: [],
        storiesCount: doc.stories.length,
        threadedStoriesCount: 0,
        pages: []
    };

    try {
        docData.filePath = doc.fullName.fsName;
    } catch(e) {
        docData.filePath = "Unsaved / Unknown";
    }

    // Layers
    for (var l = 0; l < doc.layers.length; l++) {
        var lyr = doc.layers[l];
        docData.layers.push({
            name: lyr.name,
            visible: lyr.visible,
            locked: lyr.locked
        });
    }

    // Masters
    for (var m = 0; m < doc.masterSpreads.length; m++) {
        var ms = doc.masterSpreads[m];
        docData.masters.push({
            name: ms.name,
            prefix: ms.namePrefix,
            pagesCount: ms.pages.length
        });
    }

    // Applied masters & Margins per page
    for (var p = 0; p < doc.pages.length; p++) {
        var pg = doc.pages[p];
        docData.appliedMasters.push(pg.appliedMaster ? pg.appliedMaster.name : "None");
        var mp = pg.marginPreferences;
        docData.margins.push({
            top: roundVal(mp.top),
            bottom: roundVal(mp.bottom),
            left: roundVal(mp.left),
            right: roundVal(mp.right),
            columnCount: mp.columnCount,
            columnGutter: roundVal(mp.columnGutter)
        });
    }

    // Links
    for (var lk = 0; lk < doc.links.length; lk++) {
        var l = doc.links[lk];
        docData.links.push({
            name: l.name,
            filePath: l.filePath,
            status: String(l.status),
            linkType: l.linkType
        });
    }

    // Fonts
    for (var fn = 0; fn < doc.fonts.length; fn++) {
        var f = doc.fonts[fn];
        docData.fonts.push({
            name: f.name,
            fontStyleName: f.fontStyleName,
            status: String(f.status)
        });
    }

    // Swatches
    for (var sw = 0; sw < doc.swatches.length; sw++) {
        var s = doc.swatches[sw];
        var sVal = [];
        try {
            if (s.hasOwnProperty("colorValue")) {
                sVal = roundArr(s.colorValue);
            }
        } catch(e) {}
        var sModel = "None";
        try { sModel = String(s.model); } catch(e) {}
        docData.swatches.push({
            name: s.name,
            model: sModel,
            colorValue: sVal
        });
    }

    // Threaded stories check
    for (var st = 0; st < doc.stories.length; st++) {
        if (doc.stories[st].textContainers.length > 1) {
            docData.threadedStoriesCount++;
        }
    }

    // Detailed Page Inspection
    for (var p = 0; p < doc.pages.length; p++) {
        var page = doc.pages[p];
        var pageObj = {
            pageIndex: p + 1,
            appliedMaster: page.appliedMaster ? page.appliedMaster.name : "None",
            itemsCount: page.pageItems.length,
            textFramesCount: page.textFrames.length,
            rectanglesCount: page.rectangles.length,
            ovalsCount: page.ovals.length,
            polygonsCount: page.polygons.length,
            groupsCount: page.groups.length,
            linesCount: page.graphicLines.length,
            oversetFramesCount: 0,
            textFrames: [],
            groups: [],
            tables: []
        };

        // Text Frames
        for (var tf = 0; tf < page.textFrames.length; tf++) {
            var frame = page.textFrames[tf];
            var overflows = Boolean(frame.overflows);
            if (overflows) pageObj.oversetFramesCount++;

            var tfObj = {
                index: tf + 1,
                bounds: roundArr(frame.geometricBounds),
                overflows: overflows,
                insetSpacing: roundArr(frame.textFramePreferences.insetSpacing),
                paragraphs: []
            };

            for (var pr = 0; pr < Math.min(frame.paragraphs.length, 6); pr++) {
                var para = frame.paragraphs[pr];
                var pText = para.contents.substring(0, 80).replace(/[\r\n\t]+/g, " ");
                if (pText.replace(/\s+/g, "").length === 0) continue;

                var fName = "Unknown", fStyle = "Unknown", ptSize = 0, lead = "Auto", track = 0, align = "LEFT";
                try { fName = para.appliedFont.name; } catch(e) {}
                try { fStyle = para.fontStyle; } catch(e) {}
                try { ptSize = roundVal(para.pointSize); } catch(e) {}
                try {
                    lead = (para.leading === 1635019116 ? "Auto" : String(roundVal(para.leading)));
                } catch(e) {}
                try { track = roundVal(para.tracking); } catch(e) {}
                try { align = String(para.justification); } catch(e) {}

                tfObj.paragraphs.push({
                    snippet: pText,
                    font: fName,
                    style: fStyle,
                    size: ptSize,
                    leading: lead,
                    tracking: track,
                    align: align
                });
            }
            pageObj.textFrames.push(tfObj);

            // Tables inside text frame
            for (var tb = 0; tb < frame.tables.length; tb++) {
                var table = frame.tables[tb];
                var colWidths = [];
                for (var cw = 0; cw < table.columns.length; cw++) {
                    colWidths.push(roundVal(table.columns[cw].width));
                }

                var sampleRowHeights = [];
                for (var rh = 0; rh < Math.min(table.rows.length, 3); rh++) {
                    sampleRowHeights.push(roundVal(table.rows[rh].height));
                }

                var cellInsets = [4, 4, 4, 4];
                if (table.rows.length > 0 && table.rows[0].cells.length > 0) {
                    var c0 = table.rows[0].cells[0];
                    cellInsets = [roundVal(c0.topInset), roundVal(c0.bottomInset), roundVal(c0.leftInset), roundVal(c0.rightInset)];
                }

                // Banner divider rows
                var bannerRows = [];
                for (var br = 0; br < table.rows.length; br++) {
                    var bCell = table.rows[br].cells[0];
                    var fillCol = "None";
                    try { fillCol = bCell.fillColor.name; } catch(e) {}
                    if (fillCol !== "None" && fillCol !== "Paper") {
                        var bText = bCell.contents.substring(0, 50).replace(/[\r\n\t]+/g, " ");
                        bannerRows.push({
                            row: br + 1,
                            title: bText,
                            fill: fillCol
                        });
                    }
                }

                pageObj.tables.push({
                    tableIndex: tb + 1,
                    rowsCount: table.rows.length,
                    columnsCount: table.columns.length,
                    headerRowCount: table.headerRowCount,
                    columnWidths: colWidths,
                    sampleRowHeights: sampleRowHeights,
                    cellInsets: cellInsets,
                    bannerRowsCount: bannerRows.length,
                    bannerRows: bannerRows
                });
            }
        }

        // Groups
        for (var gp = 0; gp < page.groups.length; gp++) {
            var grp = page.groups[gp];
            var childTypes = [];
            for (var ci = 0; ci < grp.pageItems.length; ci++) {
                var child = grp.pageItems[ci];
                var cFill = "None";
                try { cFill = child.fillColor.name; } catch(e) {}
                childTypes.push({
                    type: child.constructor.name,
                    fill: cFill
                });
            }
            pageObj.groups.push({
                groupIndex: gp + 1,
                bounds: roundArr(grp.geometricBounds),
                itemsCount: grp.pageItems.length,
                children: childTypes
            });
        }

        docData.pages.push(pageObj);
    }

    // JSON serialization helper for ExtendScript (no native JSON object in older engines)
    function serialize(obj) {
        if (obj === null) return "null";
        if (typeof obj === "boolean") return obj ? "true" : "false";
        if (typeof obj === "number") return isFinite(obj) ? String(obj) : "null";
        if (typeof obj === "string") return '"' + cleanString(obj) + '"';
        if (obj instanceof Array) {
            var a = [];
            for (var i = 0; i < obj.length; i++) {
                a.push(serialize(obj[i]));
            }
            return "[" + a.join(",") + "]";
        }
        if (typeof obj === "object") {
            var pairs = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    pairs.push('"' + cleanString(key) + '":' + serialize(obj[key]));
                }
            }
            return "{" + pairs.join(",") + "}";
        }
        return '""';
    }

    var jsonStr = serialize(docData);
    var outFile = new File(outputJsonPath);
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(jsonStr);
    outFile.close();

    if (openedByScript && doc) {
        doc.close(SaveOptions.NO);
    }
})();
