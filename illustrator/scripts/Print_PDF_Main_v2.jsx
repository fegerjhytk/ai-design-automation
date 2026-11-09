(function(){

// ─── GATHER DOC INFO FOR UI ───────────────────────────────────────────────────
var uiDocName = "No file open";
var uiArtboardCount = 0;
var uiColorMode = "\u2014";
var uiDocParentPath = "";

if (app.documents.length > 0) {
  try { uiDocName = app.activeDocument.name; } catch(e) {}
  try { uiArtboardCount = app.activeDocument.artboards.length; } catch(e) {}
  try {
    uiColorMode = (app.activeDocument.documentColorSpace === DocumentColorSpace.CMYK) ? "CMYK" : "RGB";
  } catch(e) {}
  try {
    if (app.activeDocument.fullName && app.activeDocument.fullName.parent) {
      uiDocParentPath = app.activeDocument.fullName.parent.fsName;
    }
  } catch(e) {}
}

// ─── REMEMBER LAST-USED SETTINGS ──────────────────────────────────────────────
var prefsFile = new File(Folder.userData + "/PrintPDF_settings.json");

function loadPrefs() {
  var d = {
    mode: 0,
    folderChoice: 0,
    locationChoice: 0,       // 0 = Document folder, 1 = Different location
    customLocationPath: "",  // Saved custom folder path
    allOpenFiles: false,
    openAfter: true,
    advancedOpen: false
  };
  if (!prefsFile.exists) return d;
  try {
    prefsFile.encoding = "UTF-8";
    prefsFile.open("r");
    var raw = prefsFile.read();
    prefsFile.close();
    var saved = eval("(" + raw + ")");
    for (var k in d) { if (saved[k] === undefined) saved[k] = d[k]; }
    return saved;
  } catch (e) { return d; }
}

function savePrefs(p) {
  try {
    prefsFile.encoding = "UTF-8";
    prefsFile.open("w");
    var customPathSafe = (p.customLocationPath || "").replace(/\\/g, "/").replace(/"/g, '\\"');
    prefsFile.write(
      "{\"mode\":" + p.mode +
      ",\"folderChoice\":" + p.folderChoice +
      ",\"locationChoice\":" + p.locationChoice +
      ",\"customLocationPath\":\"" + customPathSafe + "\"" +
      ",\"allOpenFiles\":" + p.allOpenFiles +
      ",\"openAfter\":" + p.openAfter +
      ",\"advancedOpen\":" + p.advancedOpen + "}"
    );
    prefsFile.close();
  } catch (e) {}
}

var prefs = loadPrefs();

// ─── BUILD MINIMAL HUD DIALOG (MATCHING IMAGE EXPORT V2 HUD) ──────────────────
var activeArtboardCount = (app.documents.length > 0) ? app.activeDocument.artboards.length : 1;
var openDocsCount = (app.documents.length > 0) ? app.documents.length : 1;

var dialog = new Window("dialog", "Print PDF");
dialog.orientation = "column";
dialog.alignChildren = ["fill", "top"];
dialog.spacing = 10;
dialog.margins = 16;
dialog.preferredSize = [420, -1];

// 1. Preset Status Bar (Clean Header)
var presetBox = dialog.add("panel", undefined, undefined);
presetBox.orientation = "row";
presetBox.alignChildren = ["left", "center"];
presetBox.margins = [12, 10, 12, 10];

var txtPreset = presetBox.add("statictext", undefined, "");
try { txtPreset.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11); } catch(e) {}

// 2. Target Dropdown Row
var targetRow = dialog.add("group");
targetRow.orientation = "row";
targetRow.alignChildren = ["left", "center"];
targetRow.spacing = 12;

var lblTarget = targetRow.add("statictext", undefined, "Target:");
lblTarget.preferredSize = [55, -1];

var targetItems = [];
targetItems.push("All Artboards (" + activeArtboardCount + ")");
targetItems.push("Separate PDFs (" + activeArtboardCount + ")");
targetItems.push("Pairs PDF (1+2, 3+4...)");
targetItems.push("Custom Range...");
if (openDocsCount > 1) {
  targetItems.push("All Open Documents (" + openDocsCount + " files)");
} else {
  targetItems.push("All Open Documents (1 file)");
}

var ddTarget = targetRow.add("dropdownlist", undefined, targetItems);
ddTarget.preferredSize = [310, 26];

if (prefs.allOpenFiles) {
  ddTarget.selection = 4;
} else if (prefs.mode >= 0 && prefs.mode < 4) {
  ddTarget.selection = prefs.mode;
} else {
  ddTarget.selection = 0;
}

// Artboard range row (shown only when Custom Range selected)
var rangeRow = dialog.add("group");
rangeRow.orientation = "row";
rangeRow.alignChildren = ["left", "center"];
rangeRow.spacing = 12;
rangeRow.visible = (ddTarget.selection.index === 3);

var lblRange = rangeRow.add("statictext", undefined, "Range:");
lblRange.preferredSize = [55, -1];

var txtRange = rangeRow.add("edittext", undefined, "");
txtRange.preferredSize = [310, 24];
txtRange.helpTip = "e.g. 1-3 or 2,4 or 1-3,5";

// 3. Open 'PDF' Folder After Export Checkbox
var chkRow = dialog.add("group");
chkRow.orientation = "row";
chkRow.alignChildren = ["left", "center"];
chkRow.margins = [6, 0, 0, 0];

var chkOpenFolder = chkRow.add("checkbox", undefined, "Open 'PDF' folder after export");
chkOpenFolder.value = (prefs.openAfter !== false);

// 4. Toggle Button for More Options
var toggleRow = dialog.add("group");
toggleRow.orientation = "row";
toggleRow.alignChildren = ["left", "center"];

var btnMore = toggleRow.add("button", undefined, prefs.advancedOpen ? "▾ Fewer Options" : "▸ More Options");
btnMore.preferredSize = [125, 22];

// 5. Expandable Details Panel
var morePanel = dialog.add("panel", undefined, "Export Settings");
morePanel.orientation = "column";
morePanel.alignChildren = ["fill", "top"];
morePanel.spacing = 10;
morePanel.margins = [14, 12, 14, 12];
morePanel.visible = !!prefs.advancedOpen;

// Row A: Destination Location (Document Folder vs Different Location in 'PDF' folder)
var locTypeRow = morePanel.add("group");
locTypeRow.orientation = "row";
locTypeRow.alignChildren = ["left", "center"];
locTypeRow.spacing = 15;

var lblLoc = locTypeRow.add("statictext", undefined, "Location:");
lblLoc.preferredSize = [70, -1];

var rbDocLoc = locTypeRow.add("radiobutton", undefined, "Document Folder ('PDF')");
var rbCustomLoc = locTypeRow.add("radiobutton", undefined, "Different Location...");

if (prefs.locationChoice === 1) rbCustomLoc.value = true;
else rbDocLoc.value = true;

// Custom Folder Picker Row
var customRow = morePanel.add("group");
customRow.orientation = "row";
customRow.alignChildren = ["fill", "center"];
customRow.spacing = 8;
customRow.visible = rbCustomLoc.value;

var currentCustomPath = prefs.customLocationPath || "";
var txtCustomPath = customRow.add("edittext", undefined, currentCustomPath || "(Choose a destination folder...)");
txtCustomPath.preferredSize = [230, 22];

var btnBrowse = customRow.add("button", undefined, "Browse...");
btnBrowse.preferredSize = [75, 22];

// Row B: Printer Marks / Bleed
var marksRow = morePanel.add("group");
marksRow.orientation = "row";
marksRow.alignChildren = ["left", "center"];
marksRow.spacing = 15;

var lblMarks = marksRow.add("statictext", undefined, "Preset:");
lblMarks.preferredSize = [70, -1];

var rbBleedOnly = marksRow.add("radiobutton", undefined, "Bleed Only");
var rbTrimMarks = marksRow.add("radiobutton", undefined, "Bleed + Trim Marks");

if (prefs.folderChoice === 1 || prefs.folderChoice === 3) rbTrimMarks.value = true;
else rbBleedOnly.value = true;

// Update header summary text dynamically
function updatePresetDisplay() {
  var selIdx = ddTarget.selection ? ddTarget.selection.index : 0;
  var modeStr = (selIdx === 4) ? "All Open Files" :
                (selIdx === 1) ? "Separate PDFs" :
                (selIdx === 2) ? "Pairs PDF" :
                (selIdx === 3) ? "Custom Range" : "Combined PDF";
  var marksStr = (rbTrimMarks && rbTrimMarks.value) ? "Trim Marks" : "Bleed Only";
  var locStr = (rbCustomLoc && rbCustomLoc.value && currentCustomPath !== "") ? "Custom Location" : "PDF Folder";
  txtPreset.text = "Preset:  " + modeStr + "  •  " + marksStr + "  •  " + locStr;
}

// Listeners
ddTarget.onChange = function() {
  var isRange = (ddTarget.selection && ddTarget.selection.index === 3);
  rangeRow.visible = isRange;
  updatePresetDisplay();
  dialog.layout.layout(true);
  dialog.layout.resize();
};

rbDocLoc.onClick = function() {
  rbDocLoc.value = true;
  rbCustomLoc.value = false;
  customRow.visible = false;
  updatePresetDisplay();
  dialog.layout.layout(true);
  dialog.layout.resize();
};

rbCustomLoc.onClick = function() {
  rbCustomLoc.value = true;
  rbDocLoc.value = false;
  customRow.visible = true;
  if (!currentCustomPath || currentCustomPath === "") {
    btnBrowse.notify();
  }
  updatePresetDisplay();
  dialog.layout.layout(true);
  dialog.layout.resize();
};

btnBrowse.onClick = function() {
  var startF = (currentCustomPath && new Folder(currentCustomPath).exists)
    ? new Folder(currentCustomPath)
    : (uiDocParentPath ? new Folder(uiDocParentPath) : Folder.desktop);
  var picked = Folder.selectDialog("Select Export Destination for 'PDF' Folder", startF);
  if (picked) {
    currentCustomPath = picked.fsName;
    txtCustomPath.text = currentCustomPath;
    rbCustomLoc.value = true;
    rbDocLoc.value = false;
    customRow.visible = true;
    updatePresetDisplay();
  }
};

txtCustomPath.onChange = function() {
  currentCustomPath = txtCustomPath.text.replace(/^\s+|\s+$/g, "");
  updatePresetDisplay();
};

rbBleedOnly.onClick = function() {
  rbBleedOnly.value = true;
  rbTrimMarks.value = false;
  updatePresetDisplay();
};

rbTrimMarks.onClick = function() {
  rbTrimMarks.value = true;
  rbBleedOnly.value = false;
  updatePresetDisplay();
};

btnMore.onClick = function() {
  morePanel.visible = !morePanel.visible;
  btnMore.text = morePanel.visible ? "▾ Fewer Options" : "▸ More Options";
  dialog.layout.layout(true);
  dialog.layout.resize();
};

updatePresetDisplay();

// 6. Action Buttons (Centered, Clean Native UI)
var btnGroup = dialog.add("group");
btnGroup.alignment = ["center", "center"];
btnGroup.spacing = 12;

var btnOk = btnGroup.add("button", undefined, "Export", { name: "ok" });
var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });

btnOk.onClick = function() {
  var selIdx = ddTarget.selection.index;
  if (selIdx === 3) {
    var rng = txtRange.text.replace(/\s/g, "");
    if (rng === "") {
      alert("Please enter an artboard range.\nExample: 1-3  or  2,4");
      return;
    }
  }

  if (rbCustomLoc.value) {
    var cPath = txtCustomPath.text.replace(/^\s+|\s+$/g, "");
    if (!cPath || cPath === "" || cPath === "(Choose a destination folder...)") {
      alert("Please click 'Browse...' and select a destination folder.");
      btnBrowse.notify();
      return;
    }
    var tf = new Folder(cPath);
    if (!tf.exists) {
      alert("The chosen folder does not exist:\n" + cPath + "\nPlease select an existing folder.");
      return;
    }
    currentCustomPath = cPath;
  }

  savePrefs({
    mode: (selIdx === 4) ? 0 : selIdx,
    folderChoice: rbTrimMarks.value ? 1 : 0,
    locationChoice: rbCustomLoc.value ? 1 : 0,
    customLocationPath: currentCustomPath,
    allOpenFiles: (selIdx === 4),
    openAfter: chkOpenFolder.value,
    advancedOpen: morePanel.visible
  });

  dialog.close(1);
};

btnCancel.onClick = function() {
  dialog.close(0);
};

var dlgResult = dialog.show();
if (dlgResult !== 1) return;

// ─── READ USER CHOICES ────────────────────────────────────────────────────────
var selIndex        = ddTarget.selection.index;
var allOpenFiles    = (selIndex === 4);
var mode            = (selIndex === 4) ? 1 : (selIndex + 1); // 1=Combined, 2=Separate, 3=Pairs, 4=Custom
var customRange     = txtRange.text.replace(/\s/g, "");
var trimMarks       = rbTrimMarks.value;
var locationChoice  = rbCustomLoc.value ? 1 : 0;
var chosenPath      = currentCustomPath;
var openAfter       = chkOpenFolder.value;
var folderChoice    = trimMarks ? 1 : 0;

// ─── RESOLVE OUTPUT FOLDER HELPER ─────────────────────────────────────────────
function resolveExportFolder(docFile, locChoice, customLoc, fChoice) {
  var baseDir = null;
  if (locChoice === 1 && customLoc && customLoc !== "") {
    baseDir = new Folder(customLoc);
  } else {
    baseDir = (docFile && docFile.parent && docFile.parent.exists) ? docFile.parent : Folder.desktop;
  }

  var targetFolder = null;
  if (fChoice === 0) {
    // "PDF (Standard)" -> Base/PDF
    if (baseDir.name.toLowerCase() === "pdf") {
      targetFolder = baseDir;
    } else {
      targetFolder = new Folder(baseDir.fsName + "/PDF");
    }
  } else if (fChoice === 1) {
    // "PDF (Print File)" -> Base/PDF/Print File
    if (baseDir.name.toLowerCase() === "pdf") {
      targetFolder = new Folder(baseDir.fsName + "/Print File");
    } else {
      targetFolder = new Folder(baseDir.fsName + "/PDF/Print File");
    }
  } else if (fChoice === 2) {
    // "Output" -> Base/Output
    targetFolder = new Folder(baseDir.fsName + "/Output");
  } else if (fChoice === 3) {
    // "Print File" -> Base/Print File
    targetFolder = new Folder(baseDir.fsName + "/Print File");
  } else {
    targetFolder = new Folder(baseDir.fsName + "/PDF");
  }

  if (!targetFolder.exists) targetFolder.create();
  return targetFolder;
}

// ─── INITIALIZE TARGET DOCUMENTS ──────────────────────────────────────────────
var docList = [];

if (allOpenFiles) {
  if (app.documents.length > 0) {
    for (var i = 0; i < app.documents.length; i++) {
      try {
        var td = app.documents[i];
        if (td.fullName && td.fullName.exists) {
          docList.push({
            file: new File(td.fullName.fsName),
            name: td.name,
            reopenAfter: true
          });
        }
      } catch(e) {}
    }
    if (docList.length === 0) {
      alert("No saved open documents found. Please save your file(s) first.");
      return;
    }
  } else {
    var opened = initScriptDocuments("Select Files to Export");
    if (!opened || opened.length === 0) return;
    for (var k = 0; k < opened.length; k++) {
      docList.push({
        file: new File(opened[k].fullName.fsName),
        name: opened[k].name,
        reopenAfter: false
      });
    }
  }
} else {
  if (app.documents.length > 0) {
    var d = app.activeDocument;
    if (!d.fullName || !d.fullName.exists) {
      alert("Please save the file first, then run the script again.");
      return;
    }
    docList.push({
      file: new File(d.fullName.fsName),
      name: d.name,
      reopenAfter: true
    });
  } else {
    var opened = initScriptDocuments("Select File to Export");
    if (!opened || opened.length === 0) return;
    docList.push({
      file: new File(opened[0].fullName.fsName),
      name: opened[0].name,
      reopenAfter: false
    });
  }
}

// ─── PDF SAVE OPTIONS BUILDER ─────────────────────────────────────────────────
function makePDFOptions(hasTrimMarks) {
  var p = new PDFSaveOptions();
  p.compatibility = PDFCompatibility.ACROBAT5;
  p.preserveEditability = false;
  p.embedPageThumbnails = false;
  p.optimizeForFastWebView = false;
  p.viewAfterSaving = false;
  p.preserveHyperlinks = true;
  p.acrobatLayers = false;
  p.trimMarks = !!hasTrimMarks;
  p.trimMarkOffset = new UnitValue(2.117, "mm");
  p.useDocumentBleeds = true;
  p.useArtboards = true;
  return p;
}

// ─── PREPARE DOC: unlock + outline text ───────────────────────────────────────
function prepareDoc(doc) {
  function unlockLayers(l) {
    for (var i = 0; i < l.length; i++) {
      l[i].locked = false;
      if (l[i].layers.length) unlockLayers(l[i].layers);
    }
  }
  unlockLayers(doc.layers);
  try { app.executeMenuCommand("unlockAll"); } catch(e) {}
  doc.selection = null;
  app.executeMenuCommand("selectall");
  try { app.executeMenuCommand("outline"); } catch(e) {}
  doc.selection = null;
  var frames = [];
  for (var i = 0; i < doc.textFrames.length; i++) frames.push(doc.textFrames[i]);
  for (var i = 0; i < frames.length; i++) {
    try { doc.selection = null; frames[i].selected = true; app.executeMenuCommand("outline"); } catch(e) {}
  }
  doc.selection = null;
}

// ─── RUN EXPORT ENGINE (GUARANTEE: NO PAGES/ARTBOARDS MISSED) ────────────────
try {
  var results = [], errors = [];
  var lastOutFolder = null;
  var totalArtboardsExported = 0;

  for (var i = 0; i < docList.length; i++) {
    var item = docList[i];
    var origFile = item.file;
    if (!origFile || !origFile.exists) {
      errors.push("\u2022 " + item.name + ": file not found on disk, skipped.");
      continue;
    }

    // Locate open document instance or open cleanly
    var doc = null;
    for (var d = 0; d < app.documents.length; d++) {
      try {
        if (app.documents[d].fullName.fsName === origFile.fsName) {
          doc = app.documents[d];
          break;
        }
      } catch(e) {}
    }
    if (!doc) {
      doc = app.open(origFile);
    }

    // Activate document to ensure foreground menu operations target this file
    doc.activate();
    app.redraw();
    $.sleep(50);

    // CRITICAL: Cache total artboard count UPFRONT before any save/outline mutations
    var totalArtboards = doc.artboards.length;
    var docMode = (doc.documentColorSpace === DocumentColorSpace.CMYK) ? "CMYK" : "RGB";

    // Prepare document (convert fonts to outlines)
    prepareDoc(doc);

    // Resolve output folder
    var outFolder = resolveExportFolder(origFile, locationChoice, chosenPath, folderChoice);
    lastOutFolder = outFolder;

    var n = origFile.name.replace(/\.ai$/i, "");
    var exportMsg = "";

    // Determine effective mode:
    // If allOpenFiles is true AND mode was 4 (Custom Range), export ALL artboards
    // so no pages or artboards are ever skipped across multi-page files.
    var effectiveMode = mode;
    if (allOpenFiles && mode === 4) {
      effectiveMode = 1; // Export all artboards in combined PDF
    }

    if (effectiveMode === 1) {
      // Combined PDF - all artboards (1 to totalArtboards)
      var p = makePDFOptions(trimMarks);
      p.artboardRange = (totalArtboards === 1) ? "1" : ("1-" + totalArtboards);
      var f = new File(outFolder.fsName + "/" + n + ".pdf");
      doc.saveAs(f, p);
      exportMsg = "All " + totalArtboards + " artboard" + (totalArtboards > 1 ? "s" : "") + " (Combined) \u2192 " + f.name;
      totalArtboardsExported += totalArtboards;

    } else if (effectiveMode === 2) {
      // Separate PDF - EVERY artboard from 1 to totalArtboards without exception
      for (var ab = 1; ab <= totalArtboards; ab++) {
        var p = makePDFOptions(trimMarks);
        p.artboardRange = ab.toString();
        var f = new File(outFolder.fsName + "/" + n + " " + ab + ".pdf");
        doc.saveAs(f, p);
      }
      exportMsg = "All " + totalArtboards + " artboards (Separate PDFs 1-" + totalArtboards + ") \u2192 " + outFolder.name;
      totalArtboardsExported += totalArtboards;

    } else if (effectiveMode === 3) {
      // Pairs PDF - 1+2, 3+4, 5+6... Covering all artboards up to totalArtboards
      var pairCount = 0;
      for (var ab = 1; ab <= totalArtboards; ab += 2) {
        var p = makePDFOptions(trimMarks);
        var s = ab;
        var e = Math.min(ab + 1, totalArtboards);
        p.artboardRange = (s === e) ? s.toString() : (s + "-" + e);
        var fname = (s === e) ? (n + " " + s + ".pdf") : (n + " " + s + "-" + e + ".pdf");
        var f = new File(outFolder.fsName + "/" + fname);
        doc.saveAs(f, p);
        pairCount++;
      }
      exportMsg = "All " + totalArtboards + " artboards in " + pairCount + " pairs \u2192 " + outFolder.name;
      totalArtboardsExported += totalArtboards;

    } else if (effectiveMode === 4) {
      // Custom Range (single active document mode only)
      var p = makePDFOptions(trimMarks);
      p.artboardRange = customRange;
      var f = new File(outFolder.fsName + "/" + n + " (" + customRange.replace(/,/g, "_") + ").pdf");
      doc.saveAs(f, p);
      exportMsg = "Range [" + customRange + "] \u2192 " + f.name;
      totalArtboardsExported += 1;
    }

    // Close without saving changes so source AI remains non-outlined and clean
    doc.close(SaveOptions.DONOTSAVECHANGES);

    results.push("\u2022 " + origFile.name + " [" + docMode + "]: " + exportMsg);
  }

  // Cleanly reopen original documents that were open before export
  for (var r = 0; r < docList.length; r++) {
    if (docList[r].reopenAfter && docList[r].file && docList[r].file.exists) {
      try {
        $.sleep(80);
        app.open(docList[r].file);
      } catch(e) {}
    }
  }

  // Open destination folder in Finder if requested
  if (openAfter && lastOutFolder && lastOutFolder.exists) {
    try { lastOutFolder.execute(); } catch(e) {}
  }

  // Summary Alert
  var destSummary = (locationChoice === 1) ? ("Custom Location ('PDF' folder)\n" + chosenPath) : "Document Location ('PDF' folder)";
  var modeLabel = ["", "Combined PDF", "Separate PDFs", "Pairs PDF", "Custom Range"][effectiveMode];
  var summary = "\u2713 PDF Export Completed!\n" +
                "Mode: " + modeLabel + "\n" +
                "Destination: " + destSummary + "\n" +
                "Total Artboards Exported: " + totalArtboardsExported + "\n\n" +
                results.join("\n");
  if (errors.length) summary += "\n\n\u2715 Errors:\n" + errors.join("\n");
  alert(summary);

} catch(e) {
  alert("Export Error: " + e.message + " (line " + e.line + ")");
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
//  HELPER FUNCTIONS
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function initScriptDocuments(dialogTitle) {
  var openedDocs = [];
  var recentFiles = getRecentFiles(15);
  var selectedFiles = null;

  var fd = new Window("dialog", dialogTitle || "Select File(s)");
  fd.orientation = "column";
  fd.alignChildren = ["fill", "top"];
  fd.spacing = 10;
  fd.margins = 15;

  fd.add("statictext", undefined, "Select one or more recent files (hold Cmd for multiple):");

  var listbox = fd.add("listbox", undefined, undefined, {numberOfColumns: 1, multiselect: true});
  listbox.preferredSize = [500, 250];

  for (var f = 0; f < recentFiles.length; f++) {
    var file = recentFiles[f];
    var item = listbox.add("item", decodeURI(file.name) + "   (" + decodeURI(file.parent.name) + ")");
    item.fileRef = file;
  }
  if (recentFiles.length === 0) {
    listbox.add("item", "No recent files found.");
    listbox.enabled = false;
  } else {
    listbox.selection = 0;
  }

  function getSelected() {
    var out = [];
    var sel = listbox.selection;
    if (!sel) return out;
    var arr = (sel instanceof Array || typeof sel.length !== "undefined") ? sel : [sel];
    for (var k = 0; k < arr.length; k++) { if (arr[k].fileRef) out.push(arr[k].fileRef); }
    return out;
  }

  listbox.onDoubleClick = function() {
    var sel = getSelected();
    if (sel.length > 0) { selectedFiles = sel; fd.close(1); }
  };

  var btnGrp = fd.add("group");
  btnGrp.orientation = "row";
  btnGrp.alignment = ["fill", "center"];
  btnGrp.alignChildren = ["fill", "center"];
  var bOpen   = btnGrp.add("button", undefined, "Open File...");
  btnGrp.add("group").preferredSize = [80, 10];
  var bRun    = btnGrp.add("button", undefined, "Open & Run", {name: "ok"});
  var bCancel = btnGrp.add("button", undefined, "Cancel", {name: "cancel"});

  bOpen.onClick = function() {
    var picked = File.openDialog("Select Illustrator files", "Illustrator Files:*.ai;*.eps;*.pdf,All Files:*.*", true);
    if (picked) { selectedFiles = (picked instanceof Array) ? picked : [picked]; fd.close(1); }
  };
  bRun.onClick = function() {
    var sel = getSelected();
    if (sel.length > 0) { selectedFiles = sel; fd.close(1); }
    else alert("Please select a file, or click 'Open File...' to browse.");
  };
  bCancel.onClick = function() { fd.close(0); };

  if (fd.show() !== 1 || !selectedFiles || selectedFiles.length === 0) return [];

  for (var s = 0; s < selectedFiles.length; s++) {
    var doc = app.open(selectedFiles[s]);
    if (doc) { doc.closeAfterProcess = true; openedDocs.push(doc); }
  }
  return openedDocs;
}

function getRecentFiles(maxCount) {
  var homePath = Folder("~").fsName;
  var cacheFile = null;
  var versions = ["31", "30", "29", "28", "27", "26"];
  for (var v = 0; v < versions.length; v++) {
    var f1 = new File(homePath + "/Library/Preferences/Adobe Illustrator " + versions[v] + " Settings/en_US/RecentDataCache.log");
    var f2 = new File(homePath + "/Library/Preferences/Adobe Illustrator " + versions[v] + " Settings/RecentDataCache.log");
    if (f1.exists) { cacheFile = f1; break; }
    if (f2.exists) { cacheFile = f2; break; }
  }
  if (!cacheFile || !cacheFile.exists) return [];

  var foundPaths = [];
  cacheFile.encoding = "binary";
  if (cacheFile.open("r")) {
    var content = cacheFile.read();
    cacheFile.close();
    var cur = "";
    for (var i = 0; i < content.length; i++) {
      var cc = content.charCodeAt(i);
      if (cc >= 32 && cc <= 126) { cur += String.fromCharCode(cc); }
      else { if (cur.length > 8) { var c = cleanPath(cur); if (c) foundPaths.push(c); } cur = ""; }
    }
    if (cur.length > 8) { var c = cleanPath(cur); if (c) foundPaths.push(c); }
  }

  var uniqueFiles = [], seen = {};
  for (var p = foundPaths.length - 1; p >= 0; p--) {
    var path = foundPaths[p];
    if (!seen[path]) {
      seen[path] = true;
      var file = new File(path);
      if (file.exists) { uniqueFiles.push(file); if (uniqueFiles.length >= maxCount) break; }
    }
  }
  return uniqueFiles;

  function cleanPath(str) {
    str = str.replace(/^\s+|\s+$/g, "");
    if (str.indexOf("/Users/") === 0) {
      var lower = str.toLowerCase(), exts = [".ai", ".eps", ".pdf"], extIdx = -1;
      for (var e = 0; e < exts.length; e++) {
        var idx = lower.lastIndexOf(exts[e]);
        if (idx > extIdx) extIdx = idx + exts[e].length;
      }
      if (extIdx !== -1) return str.substring(0, extIdx);
    }
    return null;
  }
}

})();
