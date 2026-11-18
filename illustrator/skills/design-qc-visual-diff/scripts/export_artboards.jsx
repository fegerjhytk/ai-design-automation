// Export Illustrator Artboards to High-Resolution PNG24
#target illustrator
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function exportArtboards(outFolderPath, prefix, selectedArtboards, dpi) {
    if (app.documents.length === 0) return "Error: No active document.";
    
    var doc = app.activeDocument;
    var outFolder = new Folder(outFolderPath);
    if (!outFolder.exists) outFolder.create();
    
    dpi = dpi || 150;
    prefix = prefix || "artboard_";
    
    var expOptions = new ExportOptionsPNG24();
    expOptions.antiAliasing = true;
    expOptions.transparency = false; // solid background for presentations
    expOptions.artBoardClipping = true;
    expOptions.horizontalScale = (dpi / 72) * 100;
    expOptions.verticalScale = (dpi / 72) * 100;

    var exported = [];
    var totalAb = doc.artboards.length;

    var indicesToExport = [];
    if (!selectedArtboards || selectedArtboards.length === 0 || selectedArtboards === "all") {
        for (var i = 0; i < totalAb; i++) indicesToExport.push(i);
    } else {
        indicesToExport = selectedArtboards;
    }

    for (var k = 0; k < indicesToExport.length; k++) {
        var abIdx = indicesToExport[k];
        if (abIdx >= 0 && abIdx < totalAb) {
            doc.artboards.setActiveArtboardIndex(abIdx);
            var abNum = (abIdx + 1);
            var padNum = (abNum < 10 ? "0" + abNum : "" + abNum);
            var destFile = new File(outFolderPath + "/" + prefix + padNum + ".png");
            doc.exportFile(destFile, ExportType.PNG24, expOptions);
            exported.push(destFile.fsName);
        }
    }
    return JSON.stringify({ count: exported.length, files: exported });
}

// Default run if called standalone with temp config
var configFile = new File("/tmp/export_config.json");
if (typeof outDir === "undefined") var outDir = "/tmp/qc_renders";
if (typeof prefix === "undefined") var prefix = "artboard_";
if (typeof abs === "undefined") var abs = "all";
if (typeof res === "undefined") var res = 150;

if (configFile.exists) {
    configFile.open("r");
    var cStr = configFile.read();
    configFile.close();
    try {
        var cfg = eval("(" + cStr + ")");
        if (cfg.outDir) outDir = cfg.outDir;
        if (cfg.prefix) prefix = cfg.prefix;
        if (cfg.artboards) abs = cfg.artboards;
        if (cfg.dpi) res = cfg.dpi;
    } catch(e) {}
}

exportArtboards(outDir, prefix, abs, res);
