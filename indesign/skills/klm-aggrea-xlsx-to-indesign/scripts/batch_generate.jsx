// batch_generate.jsx: Chunked InDesign batch generator and synchronous PDF exporter
// Reads batch_company_data.json and chunk list, updates dots, and exports PDFs.

var configPath = "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/generator_config.json";
var cfgFile = new File(configPath);
if (!cfgFile.exists) {
    throw new Error("Missing generator_config.json at: " + configPath);
}

cfgFile.encoding = "UTF-8";
cfgFile.open("r");
var cfg = eval("(" + cfgFile.read() + ")");
cfgFile.close();

var tplPath = cfg.templatePath;
var inddDir = cfg.inddDir;
var pdfDir = cfg.pdfDir;
var chunkList = cfg.chunkList; // Array of company names
var allData = cfg.allData;     // Object mapping company name -> compData
var statusPath = cfg.statusPath || "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/batch_status.json";

var results = [];

for (var i = 0; i < chunkList.length; i++) {
    var compName = chunkList[i];
    var compData = allData[compName];
    if (!compData) {
        results.push({ company: compName, status: "ERROR: company data not found" });
        continue;
    }

    var doc = null;
    try {
        doc = app.open(new File(tplPath), false);
        var targetIndd = new File(inddDir + compData.filename + ".indd");
        doc.save(targetIndd);

        // 1. Text replacement: replace [aggregator] with company name
        app.findTextPreferences = NothingEnum.nothing;
        app.changeTextPreferences = NothingEnum.nothing;
        app.findChangeTextOptions.caseSensitive = false;
        app.findTextPreferences.findWhat = "[aggregator]";
        app.changeTextPreferences.changeTo = compData.company;
        doc.changeText();

        // 2. Table 0 rating dots only
        var tables = doc.stories.everyItem().tables.everyItem().getElements();
        var tbl = tables.length > 0 ? tables[0] : null;
        var dotsChanged = 0;

        if (tbl != null) {
            // Update table header in cell (0, 2)
            try {
                tbl.rows[0].cells[2].contents = compData.company;
            } catch(e) {}

            // Update rating dot fills
            for (var rowStr in compData.row_colors) {
                var r = parseInt(rowStr, 10);
                var colorName = compData.row_colors[rowStr];
                if (r < tbl.rows.length && tbl.rows[r].cells.length > 2) {
                    var cell = tbl.rows[r].cells[2];
                    if (cell.allPageItems.length > 0) {
                        try {
                            var sw = doc.swatches.itemByName(colorName);
                            if (sw.isValid) {
                                cell.allPageItems[0].fillColor = sw;
                                dotsChanged++;
                            }
                        } catch(e) {}
                    }
                }
            }
        }

        // 3. Optional custom layout adjustments from config
        if (cfg.customRowHeights) {
            for (var tIdx = 0; tIdx < cfg.customRowHeights.length; tIdx++) {
                var crh = cfg.customRowHeights[tIdx];
                if (crh.tableIndex < tables.length && crh.rowIndex < tables[crh.tableIndex].rows.length) {
                    tables[crh.tableIndex].rows[crh.rowIndex].height = crh.height;
                }
            }
        }

        doc.save();

        // 4. Export PDF synchronously
        var pdfFile = new File(pdfDir + compData.filename + ".pdf");
        var pdfPreset = app.pdfExportPresets.itemByName("[High Quality Print]");
        if (!pdfPreset.isValid) {
            pdfPreset = app.pdfExportPresets[0];
        }
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, pdfPreset);

        // Wait for InDesign background task completion
        while (app.backgroundTasks.length > 0) {
            $.sleep(250);
        }

        doc.close(SaveOptions.NO);

        results.push({
            company: compName,
            status: "SUCCESS",
            dotsChanged: dotsChanged,
            inddSize: targetIndd.length,
            pdfSize: pdfFile.length
        });
    } catch(err) {
        if (doc != null) {
            try { doc.close(SaveOptions.NO); } catch(e) {}
        }
        results.push({
            company: compName,
            status: "ERROR: " + err.message
        });
    }
}

function cleanString(str) {
    return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ");
}

function simpleStringify(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        out.push('{"company": "' + cleanString(x.company) + '", "status": "' + cleanString(x.status) + '", "dotsChanged": ' + (x.dotsChanged || 0) + ', "inddSize": ' + (x.inddSize || 0) + ', "pdfSize": ' + (x.pdfSize || 0) + '}');
    }
    return '[' + out.join(', ') + ']';
}

var sFile = new File(statusPath);
sFile.encoding = "UTF-8";
sFile.open("w");
sFile.write(simpleStringify(results));
sFile.close();
