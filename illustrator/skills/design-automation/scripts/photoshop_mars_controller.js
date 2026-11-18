#!/usr/bin/env node

/**
 * photoshop_mars_controller.js
 * 
 * Mars Premedia-Inspired Photoshop Controller for Design Automation & AI Video Animation.
 * Bridges Adobe Photoshop 2026 into the Design Automation & After Effects / Google Flow Pipelines.
 * 
 * Core Workflows:
 * 1. AI Subject & Face Centering / Auto-Crop to 9:16 & 16:9 for AI Video Models
 * 2. Automatic Subject Cutout & B&W Track Matte Generation for AE Puppet & Parallax
 * 3. PSD Layer Slicing & 3D Spatial Manifest Extraction for After Effects
 * 4. High-Volume Batch Variable Graphics from CSV Data
 * 5. Media Pre-Flight Audit & RGB Video Engine Compliance Check
 * 6. Before/After Split-Screen Proofing
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const PS_APP_NAME = process.env.PHOTOSHOP_APP || 'Adobe Photoshop 2026';
const PS_APP_PATH = '/Applications/Adobe Photoshop 2026/Adobe Photoshop 2026.app';
const MARS_ENGINE_JSX = path.join(__dirname, 'mars_photoshop_engine.jsx');

/**
 * Check Photoshop Environment Health
 */
function checkPhotoshopHealth() {
  const result = {
    installed: fs.existsSync(PS_APP_PATH),
    appName: PS_APP_NAME,
    appPath: PS_APP_PATH,
    running: false,
    engineJsxFound: fs.existsSync(MARS_ENGINE_JSX),
    version: null
  };

  try {
    const pgrep = execSync('pgrep -il "photoshop"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    result.running = pgrep.trim().length > 0;
  } catch (e) {
    result.running = false;
  }

  if (result.installed && result.running) {
    try {
      const appleScript = `tell application "${PS_APP_NAME}" to do javascript "app.name + ' ' + app.version;"`;
      const p = spawnSync('osascript', ['-e', appleScript], { encoding: 'utf8', timeout: 8000 });
      if (p.stdout && p.stdout.trim()) {
        result.version = p.stdout.trim();
      } else {
        result.version = "Installed (Idle)";
      }
    } catch (e) {
      result.version = "Installed (Idle)";
    }
  }

  return result;
}

/**
 * Execute ExtendScript snippet or file in Photoshop 2026 via AppleScript
 */
function executePhotoshopScript(jsxCode) {
  const tmpJsx = path.join('/tmp', `ps_mars_${Date.now()}_${Math.random().toString(36).substring(7)}.jsx`);
  fs.writeFileSync(tmpJsx, jsxCode, 'utf8');

  try {
    const appleScript = `
tell application "${PS_APP_NAME}"
  set res to do javascript file "${tmpJsx}"
  return res
end tell
`;
    const output = execSync(`osascript -e ${JSON.stringify(appleScript)}`, { 
      encoding: 'utf8', 
      timeout: 120000 
    });

    if (fs.existsSync(tmpJsx)) fs.unlinkSync(tmpJsx);
    return { success: true, output: output.trim() };
  } catch (err) {
    if (fs.existsSync(tmpJsx)) fs.unlinkSync(tmpJsx);
    return { 
      success: false, 
      error: err.message, 
      stderr: err.stderr ? err.stderr.toString() : '' 
    };
  }
}

/**
 * 1. Smart Subject Auto-Crop for Video (9:16 or 16:9)
 */
function autoCropSubject(inputPath, outputPath, options = {}) {
  const ratio = options.ratio || '9:16';
  const margin = options.margin !== undefined ? options.margin : 0.15;
  const targetW = options.targetWidth || (ratio === '9:16' ? 1080 : 1920);
  const targetH = options.targetHeight || (ratio === '9:16' ? 1920 : 1080);

  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.autoCropSubject(
    ${JSON.stringify(inputPath)},
    ${JSON.stringify(outputPath)},
    ${JSON.stringify(ratio)},
    ${margin},
    ${targetW},
    ${targetH}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

/**
 * 2. Batch Size & Mask: Isolate Subject Cutout & B&W Matte for AE
 */
function batchSizeAndMask(inputPath, outputDir, baseName) {
  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.batchSizeAndMask(
    ${JSON.stringify(inputPath)},
    ${JSON.stringify(outputDir)},
    ${JSON.stringify(baseName || "")}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

/**
 * 3. Slice PSD Layers & Export Layout Manifest for After Effects Rigging
 */
function sliceLayersForAE(psdPath, outputDir) {
  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.sliceLayersForAE(
    ${JSON.stringify(psdPath)},
    ${JSON.stringify(outputDir)}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

/**
 * 4. Batch Variable Graphics from CSV Data
 */
function variableFromCSV(templatePsdPath, csvPath, outputDir) {
  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.variableFromCSV(
    ${JSON.stringify(templatePsdPath)},
    ${JSON.stringify(csvPath)},
    ${JSON.stringify(outputDir)}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

/**
 * 5. Media Pre-Flight Audit & Health Report
 */
function auditMediaFolder(folderPath, reportCsvPath) {
  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.generateImagesReport(
    ${JSON.stringify(folderPath)},
    ${JSON.stringify(reportCsvPath)}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

/**
 * 6. Before / After Split-Screen Proofing
 */
function createBeforeAfter(beforePath, afterPath, outputPath) {
  const engineContent = fs.readFileSync(MARS_ENGINE_JSX, 'utf8');
  const runnerJsx = `
${engineContent}

(function() {
  return MarsPhotoshopEngine.createBeforeAfter(
    ${JSON.stringify(beforePath)},
    ${JSON.stringify(afterPath)},
    ${JSON.stringify(outputPath)}
  );
})();
`;

  return executePhotoshopScript(runnerJsx);
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let action = 'status';
  let input = '';
  let output = '';
  let outputDir = '';
  let psd = '';
  let csv = '';
  let ratio = '9:16';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && args[i + 1]) action = args[++i];
    else if (args[i] === '--input' && args[i + 1]) input = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
    else if (args[i] === '--output-dir' && args[i + 1]) outputDir = args[++i];
    else if (args[i] === '--psd' && args[i + 1]) psd = args[++i];
    else if (args[i] === '--csv' && args[i + 1]) csv = args[++i];
    else if (args[i] === '--ratio' && args[i + 1]) ratio = args[++i];
  }

  console.log(`[Mars Premedia Photoshop Controller] Action: ${action}`);

  switch (action) {
    case 'status':
      const health = checkPhotoshopHealth();
      console.log(JSON.stringify(health, null, 2));
      break;

    case 'crop':
      if (!input || !output) {
        console.error('Error: --input and --output are required for crop action');
        process.exit(1);
      }
      console.log(`Auto-cropping to ${ratio}...`);
      const cropRes = autoCropSubject(input, output, { ratio });
      console.log(cropRes);
      break;

    case 'mask':
      if (!input || !outputDir) {
        console.error('Error: --input and --output-dir are required for mask action');
        process.exit(1);
      }
      console.log(`Generating subject cutout and alpha matte...`);
      const maskRes = batchSizeAndMask(input, outputDir);
      console.log(maskRes);
      break;

    case 'slice':
      if (!psd || !outputDir) {
        console.error('Error: --psd and --output-dir are required for slice action');
        process.exit(1);
      }
      console.log(`Slicing PSD layers for After Effects...`);
      const sliceRes = sliceLayersForAE(psd, outputDir);
      console.log(sliceRes);
      break;

    case 'csv':
      if (!psd || !csv || !outputDir) {
        console.error('Error: --psd, --csv, and --output-dir are required for variable CSV action');
        process.exit(1);
      }
      console.log(`Generating variable batch graphics from CSV...`);
      const csvRes = variableFromCSV(psd, csv, outputDir);
      console.log(csvRes);
      break;

    case 'report':
      const folderToAudit = input || outputDir || process.cwd();
      const reportOut = output || path.join(folderToAudit, 'Images_Report.csv');
      console.log(`Auditing media in ${folderToAudit}...`);
      const reportRes = auditMediaFolder(folderToAudit, reportOut);
      console.log(reportRes);
      break;

    default:
      console.log(`Unknown action: ${action}. Available: status, crop, mask, slice, csv, report`);
  }
}

module.exports = {
  checkPhotoshopHealth,
  executePhotoshopScript,
  autoCropSubject,
  batchSizeAndMask,
  sliceLayersForAE,
  variableFromCSV,
  auditMediaFolder,
  createBeforeAfter
};
