/**
 * Adobe Illustrator CC Automation Core
 * Runs ExtendScript in desktop Illustrator via macOS AppleScript.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function buildBrandIdentity(options) {
  const {
    projectName = "Brand_Master",
    wordmark = "MIRAI",
    fontName = "IvyPrestoDisplay-SemiBold",
    tracking = -20,
    primaryColorHex = "#4A0E17",
    secondarySealName = "Bonsai_Seal",
    outputDir = process.env.OUTPUT_DIR || path.join(os.homedir(), "Desktop")
  } = options;

  if (typeof projectName !== "string" || !projectName.trim() ||
      projectName === "." || projectName === ".." || /[/\\:\x00-\x1f]/.test(projectName)) {
    throw new Error("project_name must be a single valid folder name.");
  }
  for (const [name, value] of Object.entries({ wordmark, fontName, secondarySealName })) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(name + " must be a nonempty string.");
    }
  }
  if (!Number.isFinite(tracking)) throw new Error("tracking must be a finite number.");
  if (typeof primaryColorHex !== "string" || !/^#?[0-9a-f]{6}$/i.test(primaryColorHex)) {
    throw new Error("primary_color_hex must be a six-digit RGB color.");
  }

  const targetProjectDir = path.resolve(outputDir, projectName);
  const aiFilePath = path.join(targetProjectDir, projectName + ".ai");
  fs.mkdirSync(targetProjectDir, { recursive: true });
  if (fs.realpathSync(targetProjectDir) !== path.join(fs.realpathSync(outputDir), projectName)) {
    throw new Error("The project folder points outside the configured output location.");
  }
  if (fs.existsSync(aiFilePath)) throw new Error("The Illustrator master already exists.");

  const hex = primaryColorHex.replace(/^#/, "");
  const [r, g, b] = hex.match(/../g).map(channel => parseInt(channel, 16));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-build-"));
  const scriptPath = path.join(tempDir, "build.jsx");
  const scriptString = value => JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  const jsxContent = `
#target illustrator


function hexToRgb(rVal, gVal, bVal) {
    var c = new RGBColor();
    c.red = rVal;
    c.green = gVal;
    c.blue = bVal;
    return c;
}

function main() {
    var saveFile = new File(${scriptString(aiFilePath)});
    if (saveFile.exists) throw new Error("The Illustrator master already exists.");

    // 1080x1080 pt master artboard
    var doc = app.documents.add(DocumentColorSpace.RGB, 1080, 1080);

    // Setup 4 strict unflattened layers
    var baseLayer = doc.layers[0];
    baseLayer.name = "Packaging Dielines";

    var dielineRect = baseLayer.pathItems.rectangle(-140, 140, 800, 800);
    dielineRect.stroked = true;
    dielineRect.filled = false;
    var strokeColor = new RGBColor();
    strokeColor.red = 180; strokeColor.green = 180; strokeColor.blue = 180;
    dielineRect.strokeColor = strokeColor;
    dielineRect.strokeWidth = 1;

    // 2. Atmospheric Gradients Layer
    var gradLayer = doc.layers.add();
    gradLayer.name = "Atmospheric Gradients";
    var bgRect = gradLayer.pathItems.rectangle(0, 0, 1080, 1080);
    bgRect.stroked = false;
    bgRect.filled = true;
    bgRect.fillColor = hexToRgb(${r}, ${g}, ${b});

    // 3. Secondary Seals Layer (The Bonsai Rule)
    var sealLayer = doc.layers.add();
    sealLayer.name = "Secondary Seals";
    
    // Draw modular circular seal badge
    var sealBadge = sealLayer.pathItems.ellipse(-780, 490, 100, 100);
    sealBadge.stroked = true;
    sealBadge.filled = false;
    var sealColor = new RGBColor();
    sealColor.red = 240; sealColor.green = 240; sealColor.blue = 240;
    sealBadge.strokeColor = sealColor;
    sealBadge.strokeWidth = 1.5;

    var sealText = sealLayer.textFrames.add();
    sealText.contents = ${scriptString(secondarySealName)};
    sealText.top = -820;
    sealText.left = 505;
    sealText.textRange.characterAttributes.size = 12;
    sealText.textRange.characterAttributes.fillColor = sealColor;

    // 4. Wordmark (Hero) Layer (Strictly 100% Typographic)
    var wordmarkLayer = doc.layers.add();
    wordmarkLayer.name = "Wordmark (Hero)";

    var wmText = wordmarkLayer.textFrames.add();
    wmText.contents = ${scriptString(wordmark.toUpperCase())};
    wmText.top = -480;
    wmText.left = 240;
    
    try {
        wmText.textRange.characterAttributes.textFont = app.textFonts.getByName(${scriptString(fontName)});
    } catch(e) {
        // Fallback gracefully if PostScript font not loaded
    }
    wmText.textRange.characterAttributes.size = 96;
    wmText.textRange.characterAttributes.tracking = ${tracking};
    var white = new RGBColor();
    white.red = 255; white.green = 255; white.blue = 255;
    wmText.textRange.characterAttributes.fillColor = white;

    // Save master file
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    doc.saveAs(saveFile, saveOpts);

    return "SUCCESS: " + saveFile.fsName;
}

var previousInteractionLevel = app.userInteractionLevel;
try {
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    main();
} finally {
    app.userInteractionLevel = previousInteractionLevel;
}
`;

  fs.writeFileSync(scriptPath, jsxContent);

  try {
    const osaScript = 'on run argv\n' +
      'tell application id "com.adobe.illustrator" to do javascript (read POSIX file (item 1 of argv))\n' +
      'end run';
    const result = execFileSync("/usr/bin/osascript", ["-e", osaScript, scriptPath], {
      encoding: "utf8",
      timeout: 90_000
    });
    if (!fs.existsSync(aiFilePath) || fs.statSync(aiFilePath).size === 0) {
      throw new Error("Illustrator did not write a nonempty master file.");
    }
    fs.unlinkSync(scriptPath);
    fs.rmdirSync(tempDir);
    return {
      status: "success",
      master_ai_file: aiFilePath,
      project_directory: targetProjectDir,
      layer_architecture: [
        "Wordmark (Hero) -> 100% vector typography (isolated, zero icons)",
        "Secondary Seals -> Modular badge/stamp (The Bonsai Rule)",
        "Atmospheric Gradients -> Solid brand-color background",
        "Packaging Dielines -> Rectangular placeholder bounds"
      ],
      raw_output: result.trim()
    };
  } catch (err) {
    return {
      status: "fallback_generated",
      message: `Script written to ${scriptPath}. Illustrator automation did not confirm a saved master.`,
      script_path: scriptPath,
      target_ai_path: aiFilePath,
      error: err.message
    };
  }
}
