// inspect_template.jsx: Headless inspection of InDesign master template
// Extracts table geometry, cell structures, swatches, and placeholders.

var configPath = "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/inspect_config.json";
var outPath = "/Users/admin/.gemini/config/skills/xlsx-indesign-batch-publisher/scripts/template_inspection.json";

var cfgFile = new File(configPath);
var templatePath = "";
if (cfgFile.exists) {
    cfgFile.encoding = "UTF-8";
    cfgFile.open("r");
    var cfg = eval("(" + cfgFile.read() + ")");
    cfgFile.close();
    templatePath = cfg.templatePath || "";
}

var doc;
var openedLocally = false;

if (templatePath != "" && new File(templatePath).exists) {
    doc = app.open(new File(templatePath), false);
    openedLocally = true;
} else if (app.documents.length > 0) {
    doc = app.activeDocument;
} else {
    throw new Error("No InDesign document open and no valid templatePath specified.");
}

var result = {
    documentName: doc.name,
    pageCount: doc.pages.length,
    swatches: [],
    tables: [],
    placeholders: []
};

// 1. Swatches
for (var s = 0; s < doc.swatches.length; s++) {
    result.swatches.push(doc.swatches[s].name);
}

// 2. Tables
var allTables = doc.stories.everyItem().tables.everyItem().getElements();
for (var t = 0; t < allTables.length; t++) {
    var tbl = allTables[t];
    var tblInfo = {
        index: t,
        rows: tbl.rows.length,
        columns: tbl.columns.length,
        headerRow: []
    };
    if (tbl.rows.length > 0) {
        for (var c = 0; c < tbl.rows[0].cells.length; c++) {
            tblInfo.headerRow.push(tbl.rows[0].cells[c].contents.replace(/[\r\n]+/g, " "));
        }
    }
    result.tables.push(tblInfo);
}

// 3. Search for placeholders
app.findTextPreferences = NothingEnum.nothing;
app.findChangeTextOptions.caseSensitive = false;
app.findTextPreferences.findWhat = "[aggregator]";
var found = doc.findText();
result.placeholders.push({ placeholder: "[aggregator]", occurrences: found.length });

if (openedLocally) {
    doc.close(SaveOptions.NO);
}

// Save JSON output
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

var outFile = new File(outPath);
outFile.encoding = "UTF-8";
outFile.open("w");
outFile.write(simpleStringify(result));
outFile.close();
