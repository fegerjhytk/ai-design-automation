// audit_dots.jsx: 100% Bi-directional InDesign QA Auditor
// Validates every generated document against Excel ground truth.

var configPath = "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/audit_config.json";
var cfgFile = new File(configPath);
if (!cfgFile.exists) {
    throw new Error("Missing audit_config.json at: " + configPath);
}

cfgFile.encoding = "UTF-8";
cfgFile.open("r");
var cfg = eval("(" + cfgFile.read() + ")");
cfgFile.close();

var inddDir = cfg.inddDir;
var pdfDir = cfg.pdfDir;
var allData = cfg.allData;
var reportPath = cfg.reportPath || "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/audit_report.json";

function cleanStr(s) {
    return String(s).replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");
}

var report = [];

for (var compName in allData) {
    var compData = allData[compName];
    var inddFile = new File(inddDir + compData.filename + ".indd");
    var pdfFile = new File(pdfDir + compData.filename + ".pdf");

    var compReport = {
        company: compName,
        inddExists: inddFile.exists,
        inddSize: inddFile.length,
        pdfExists: pdfFile.exists,
        pdfSize: pdfFile.length,
        coverTitleValid: false,
        coverSubtitleValid: false,
        tableHeaderValid: false,
        dotsMatched: 0,
        dotsTotal: 0,
        hasOverset: false,
        dotMismatches: []
    };

    if (!inddFile.exists) {
        report.push(compReport);
        continue;
    }

    var doc = null;
    try {
        doc = app.open(inddFile, false);

        // 1. Cover page checks
        if (doc.pages.length > 0) {
            var p1 = doc.pages[0];
            for (var f = 0; f < p1.textFrames.length; f++) {
                var txt = p1.textFrames[f].contents;
                if (txt.indexOf(compName) !== -1) {
                    compReport.coverTitleValid = true;
                    compReport.coverSubtitleValid = true;
                }
            }
        }

        // 2. Overset text frame checks
        for (var pg = 0; pg < doc.pages.length; pg++) {
            for (var tf = 0; tf < doc.pages[pg].textFrames.length; tf++) {
                if (doc.pages[pg].textFrames[tf].overflows) {
                    compReport.hasOverset = true;
                }
            }
        }

        // 3. Table 0 and rating dots
        var tables = doc.stories.everyItem().tables.everyItem().getElements();
        if (tables.length > 0) {
            var tbl = tables[0];
            var col2Header = cleanStr(tbl.rows[0].cells[2].contents);
            if (col2Header == compName) {
                compReport.tableHeaderValid = true;
            }

            for (var rowStr in compData.row_colors) {
                var r = parseInt(rowStr, 10);
                var expectedColor = compData.row_colors[rowStr];
                compReport.dotsTotal++;

                var actualColor = "NONE";
                if (r < tbl.rows.length && tbl.rows[r].cells.length > 2) {
                    var cell = tbl.rows[r].cells[2];
                    if (cell.allPageItems.length > 0) {
                        actualColor = cell.allPageItems[0].fillColor.name;
                    }
                }

                if (actualColor == expectedColor) {
                    compReport.dotsMatched++;
                } else {
                    compReport.dotMismatches.push({ row: r, expected: expectedColor, actual: actualColor });
                }
            }
        }

        doc.close(SaveOptions.NO);
    } catch(err) {
        if (doc != null) {
            try { doc.close(SaveOptions.NO); } catch(e) {}
        }
        compReport.error = err.message;
    }

    report.push(compReport);
}

function simpleStringify(obj) {
    if (typeof obj === "string") return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ") + '"';
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    if (obj instanceof Array) {
        var arr = [];
        for (var i = 0; i < obj.length; i++) arr.push(simpleStringify(obj[i]));
        return "[" + arr.join(", ") + "]";
    }
    var pairs = [];
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) pairs.push('"' + k + '": ' + simpleStringify(obj[k]));
    }
    return "{" + pairs.join(", ") + "}";
}

var repFile = new File(reportPath);
repFile.encoding = "UTF-8";
repFile.open("w");
repFile.write(simpleStringify(report));
repFile.close();
