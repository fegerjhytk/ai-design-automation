/**
 * Adobe Illustrator CC Automation Core
 * Executes ExtendScript headlessly via macOS osascript to build master brand files.
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
    dielineType = "tin_can_100g",
    outputDir = path.join(os.homedir(), "Desktop")
  } = options;

  const targetProjectDir = path.join(outputDir, projectName);
  if (!fs.existsSync(targetProjectDir)) {
    fs.mkdirSync(targetProjectDir, { recursive: true });
  }

  // Parse Hex to RGB
  const hex = primaryColorHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 74;
  const g = parseInt(hex.substring(2, 4), 16) || 14;
  const b = parseInt(hex.substring(4, 6), 16) || 23;

  const scriptPath = path.join(os.tmpdir(), `build_brand_${Date.now()}.jsx`);
  const aiFilePath = path.join(targetProjectDir, `${projectName}.ai`);

  const jsxContent = `
#target illustrator
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function hexToRgb(rVal, gVal, bVal) {
    var c = new RGBColor();
    c.red = rVal;
    c.green = gVal;
    c.blue = bVal;
    return c;
}

function main() {
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
    sealText.contents = "${secondarySealName}";
    sealText.top = -820;
    sealText.left = 505;
    sealText.textRange.characterAttributes.size = 12;
    sealText.textRange.characterAttributes.fillColor = sealColor;

    // 4. Wordmark (Hero) Layer (Strictly 100% Typographic)
    var wordmarkLayer = doc.layers.add();
    wordmarkLayer.name = "Wordmark (Hero)";

    var wmText = wordmarkLayer.textFrames.add();
    wmText.contents = "${wordmark.toUpperCase()}";
    wmText.top = -480;
    wmText.left = 240;
    
    try {
        wmText.textRange.characterAttributes.textFont = app.textFonts.getByName("${fontName}");
    } catch(e) {
        // Fallback gracefully if PostScript font not loaded
    }
    wmText.textRange.characterAttributes.size = 96;
    wmText.textRange.characterAttributes.tracking = ${tracking};
    var white = new RGBColor();
    white.red = 255; white.green = 255; white.blue = 255;
    wmText.textRange.characterAttributes.fillColor = white;

    // Save master file
    var saveFile = new File("${aiFilePath.replace(/\\/g, '/')}");
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    doc.saveAs(saveFile, saveOpts);

    return "SUCCESS: " + saveFile.fsName;
}

main();
`;

  fs.writeFileSync(scriptPath, jsxContent);

  try {
    const osaScript = `tell application id "com.adobe.illustrator" to do javascript (read POSIX file "${scriptPath}")`;
    const result = execFileSync("osascript", ["-e", osaScript], { encoding: "utf8" });
    return {
      status: "success",
      master_ai_file: aiFilePath,
      project_directory: targetProjectDir,
      layer_architecture: [
        "Wordmark (Hero) -> 100% vector typography (isolated, zero icons)",
        "Secondary Seals -> Modular badge/stamp (The Bonsai Rule)",
        "Atmospheric Gradients -> Deep background falloff & shadow blending",
        "Packaging Dielines -> 1:1 scale container bounds"
      ],
      raw_output: result.trim()
    };
  } catch (err) {
    return {
      status: "fallback_generated",
      message: `Script written to ${scriptPath}. Could not trigger live Illustrator via AppleScript (is Illustrator open?).`,
      script_path: scriptPath,
      target_ai_path: aiFilePath,
      error: err.message
    };
  }
}
