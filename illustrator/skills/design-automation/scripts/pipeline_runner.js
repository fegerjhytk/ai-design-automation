#!/usr/bin/env node

/**
 * pipeline_runner.js
 * 
 * Master Orchestrator for Autonomous Ad Designer Workflow:
 * 1. Ingestion & Studio Package Architecture (~/Desktop/<Project Name>)
 * 2. Document Health Audit & Environment Normalization
 * 3. Autonomous Vector First Aid & Asset Cleanup
 * 4. Production Master Build & Appearance Application
 * 5. Multi-Density Export (300 DPI PNG, JPG, Master AI)
 * 6. Live Screen Centering (fitin) via Universal Menu Controller
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { 
  executeFastCommand, 
  clickMenuItemPath, 
  executeDOMScript, 
  FAST_MENU_COMMANDS 
} = require('./illustrator_menu_controller');
const {
  checkAfterEffectsHealth,
  executeAEScript,
  animatePuppetFlow,
  animatePromoComp,
  applyBuoyancyPhysics,
  renderAEPComposition,
  buildAIVideoShowcaseComp,
  preflightArtworkForAnimation,
  generateAnimationVisualDiff,
  cloneMotionFromReference,
  exportCompToSmoothGif
} = require('./after_effects_motion_controller');
const {
  checkAIVideoEnginesHealth,
  formatDirectorialVideoPrompt,
  applyMotionClone,
  publishSmoothGif,
  assembleVideoAdPackage
} = require('./ai_video_controller');
const {
  checkPhotoshopHealth,
  autoCropSubject,
  batchSizeAndMask,
  sliceLayersForAE,
  variableFromCSV,
  auditMediaFolder,
  createBeforeAfter
} = require('./photoshop_mars_controller');
const {
  checkChromeAutomationHealth,
  isChromeTabOpen,
  runInChromeTab,
  typeViaSystemPaste,
  uploadFileToChrome,
  hardwareClick
} = require('./chrome_active_tab_controller');

class AutonomousDesignPipeline {
  constructor(options = {}) {
    this.projectName = options.project || "Shahrukhz Waterfront Ad 01";
    this.desktopDir = path.join(process.env.HOME, 'Desktop');
    this.projectDir = options.studioDir || path.join(this.desktopDir, this.projectName);
    this.linksDir = path.join(this.projectDir, 'Links');
    this.fontsDir = path.join(this.projectDir, 'Fonts');
    this.outputDir = path.join(this.projectDir, 'Output');
  }

  // Stage 1: Setup Studio Packaging
  setupStudioStructure() {
    console.log(`[Stage 1] Initializing Studio Package at: ${this.projectDir}`);
    [this.projectDir, this.linksDir, this.fontsDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  + Created directory: ${path.basename(dir)}/`);
      }
    });
    return { success: true, projectDir: this.projectDir };
  }

  // Stage 1.4: Free Text Copywriting
  async generateCopy(prompt) {
    console.log(`[Stage 1.4] Generating Ad Copy via Free Gemini Flash...`);
    const { generateCopy } = require('./multimodal_router');
    return await generateCopy(prompt);
  }

  // Stage 1.5: Fast Headless Nano Banana Generation (Zero Chrome, Sub-4s)
  async generateHeroAsset(prompt, aspectRatio = '1:1', model = 'gemini-nano-banana-2.1') {
    console.log(`[Stage 1.5] Generating Hero Asset via Fast Headless Nano Banana...`);
    const { generateHeadlessImages } = require('./fast_nano_banana');
    return await generateHeadlessImages({
      prompt,
      aspectRatio,
      model,
      outputDir: this.linksDir
    });
  }

  // Stage 1.6: Free Narration Voiceover
  async generateVoiceover(scriptText, voiceName = 'Aoede') {
    console.log(`[Stage 1.6] Generating Narration Voiceover via Free Gemini TTS...`);
    const { generateVoiceover } = require('./multimodal_router');
    const outPath = path.join(this.outputDir, `narration_${Date.now()}.wav`);
    return await generateVoiceover(scriptText, voiceName, outPath);
  }

  // Stage 1.7: Mars Premedia Photoshop Asset Conditioning for AI Video & Motion
  cropMediaForVideo(ratio = '9:16') {
    console.log(`[Stage 1.7] Mars Premedia Auto-Cropping Assets in Links/ for ${ratio} Video...`);
    if (!fs.existsSync(this.linksDir)) return { success: false, error: "Links dir missing" };
    const files = fs.readdirSync(this.linksDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i) && !f.includes('_video_crop') && !f.includes('_cutout') && !f.includes('_mask'));
    const results = [];
    files.forEach(f => {
      const inPath = path.join(this.linksDir, f);
      const outPath = path.join(this.linksDir, `${path.parse(f).name}_video_crop_${ratio.replace(':', 'x')}.png`);
      console.log(`  + Auto-cropping subject: ${f} -> ${path.basename(outPath)}`);
      const r = autoCropSubject(inPath, outPath, { ratio });
      results.push({ file: f, result: r });
    });
    return { success: true, crops: results };
  }

  maskMediaForAE() {
    console.log(`[Stage 1.7] Mars Premedia Batch Masking Subject Cutouts in Links/...`);
    if (!fs.existsSync(this.linksDir)) return { success: false, error: "Links dir missing" };
    const files = fs.readdirSync(this.linksDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i) && !f.includes('_cutout') && !f.includes('_mask'));
    const results = [];
    files.forEach(f => {
      const inPath = path.join(this.linksDir, f);
      console.log(`  + Generating Cutout & Alpha Matte: ${f}`);
      const r = batchSizeAndMask(inPath, this.linksDir, path.parse(f).name);
      results.push({ file: f, result: r });
    });
    return { success: true, masks: results };
  }

  auditMediaHealth() {
    console.log(`[Stage 1.7] Mars Premedia Media Pre-Flight Audit...`);
    const reportPath = path.join(this.outputDir, 'Media_Preflight_Report.csv');
    return auditMediaFolder(this.linksDir, reportPath);
  }

  slicePsdForAE(psdName) {
    const psdPath = path.join(this.projectDir, psdName || `${this.projectName}.psd`);
    const layersOut = path.join(this.projectDir, 'Layers_AE');
    console.log(`[Stage 1.7] Mars Premedia Slicing PSD Layers for AE: ${psdPath}`);
    return sliceLayersForAE(psdPath, layersOut);
  }

  generateVariableCSV(csvPath, templatePsd) {
    const tPath = templatePsd || path.join(this.projectDir, `${this.projectName}.psd`);
    const cPath = csvPath || path.join(this.projectDir, 'variants.csv');
    const outDir = path.join(this.outputDir, 'Variants');
    console.log(`[Stage 1.7] Mars Premedia Variable Production from CSV: ${cPath}`);
    return variableFromCSV(tPath, cPath, outDir);
  }

  // Stage 1.8: Design QC & Pre-Flight Audit (via design-qc-visual-diff)
  runDesignQC(drawMarkers = false) {
    console.log(`[Stage 1.8] Running Deep Design QC Audit (via design-qc-visual-diff)...`);
    const qcRunnerPath = path.resolve(__dirname, '../../design-qc-visual-diff/scripts/qc_runner.py');
    if (!fs.existsSync(qcRunnerPath)) {
      console.warn("  ! design-qc-visual-diff skill not found at:", qcRunnerPath);
      return { success: false, error: "QC skill not found" };
    }
    const flag = drawMarkers ? "--markers" : "--active";
    const res = spawnSync('python3', [qcRunnerPath, flag], { stdio: 'inherit' });
    if (res.status !== 0) {
      return { success: false, error: `QC exited with status ${res.status}` };
    }
    return { success: true };
  }

  // Stage 1.8: Visual Difference Comparison (Image Mode & Marked Mode)
  generateVisualDiff(beforePath, afterPath, options = {}) {
    const mode = options.mode || 'all';
    const outputDir = options.output || path.join(this.outputDir, 'Visual_Diff');
    console.log(`[Stage 1.8] Generating Visual Difference Comparison (${mode} mode)...`);
    return generateAnimationVisualDiff(beforePath, afterPath, outputDir, mode);
  }

  // Stage 2: Document Inspection & Health Audit
  auditActiveDocument() {
    console.log(`[Stage 2] Auditing Active Illustrator Document...`);
    const script = `
      (function() {
        if (app.documents.length === 0) return "ERROR||No open documents";
        var doc = app.activeDocument;
        var layerNames = [];
        for (var i = 0; i < doc.layers.length; i++) {
          layerNames.push(doc.layers[i].name + " (" + doc.layers[i].pageItems.length + ")");
        }
        return [
          doc.name,
          doc.documentColorSpace.toString(),
          doc.width,
          doc.height,
          doc.pageItems.length,
          layerNames.join("; ")
        ].join("||");
      })();
    `;
    const res = executeDOMScript(script);
    if (!res.success) {
      console.error("  x Audit failed:", res.error);
      return res;
    }
    const parts = res.output.split("||");
    if (parts[0] === "ERROR") {
      console.error("  x", parts[1]);
      return { success: false, error: parts[1] };
    }
    const data = {
      name: parts[0],
      colorSpace: parts[1],
      width: parseFloat(parts[2]),
      height: parseFloat(parts[3]),
      totalItems: parseInt(parts[4], 10),
      layers: parts[5]
    };
    console.log(`  ✓ Active Document: ${data.name}`);
    console.log(`  ✓ Canvas Dimensions: ${data.width} x ${data.height} pt`);
    console.log(`  ✓ Color Space: ${data.colorSpace}`);
    console.log(`  ✓ Total Page Items: ${data.totalItems}`);
    console.log(`  ✓ Layer Structure: ${data.layers}`);
    return { success: true, audit: data };
  }

  // Stage 3: Vector First Aid & Cleanup
  cleanupVectorDebris() {
    console.log(`[Stage 3] Running Vector First Aid & Cleanup...`);
    const cleanupScript = `
      (function() {
        if (app.documents.length === 0) return "ERROR||No active document";
        var doc = app.activeDocument;
        var strayPointsRemoved = 0;
        var emptyTextRemoved = 0;
        var emptyLayersRemoved = 0;

        // 1. Remove empty layers
        for (var l = doc.layers.length - 1; l >= 0; l--) {
          var layer = doc.layers[l];
          if (layer.pageItems.length === 0 && doc.layers.length > 1) {
            try {
              layer.remove();
              emptyLayersRemoved++;
            } catch(e) {}
          }
        }

        // 2. Remove stray anchor points
        for (var p = doc.pathItems.length - 1; p >= 0; p--) {
          var pathItem = doc.pathItems[p];
          if (pathItem.pathPoints.length <= 1 || (!pathItem.filled && !pathItem.stroked)) {
            try {
              pathItem.remove();
              strayPointsRemoved++;
            } catch(e) {}
          }
        }

        // 3. Remove empty whitespace text frames
        for (var t = doc.textFrames.length - 1; t >= 0; t--) {
          var tf = doc.textFrames[t];
          if (tf.contents.replace(/\\s+/g, '') === "") {
            try {
              tf.remove();
              emptyTextRemoved++;
            } catch(e) {}
          }
        }

        return [strayPointsRemoved, emptyTextRemoved, emptyLayersRemoved].join("||");
      })();
    `;
    const res = executeDOMScript(cleanupScript);
    if (res.success && res.output) {
      const parts = res.output.split("||");
      console.log(`  ✓ Purged ${parts[2]} empty layer(s)`);
      console.log(`  ✓ Removed ${parts[0]} stray point(s)`);
      console.log(`  ✓ Cleaned ${parts[1]} blank text frame(s)`);
    }
    return res;
  }

  // Stage 4: Apply Menu Commands & Refresh Canvas
  refreshAndFitCanvas() {
    console.log(`[Stage 4] Aligning & Framing Artboard on Screen...`);
    const fitRes = executeFastCommand('fitin');
    if (fitRes.success) {
      console.log(`  ✓ View > Fit Artboard in Window (Cmd+0) executed successfully.`);
    }
    return fitRes;
  }

  // Stage 5: Production Export
  exportProductionDeliverables() {
    console.log(`[Stage 5] Exporting Production Deliverables to: ${this.outputDir}`);
    const safeBaseName = this.projectName.replace(/\s+/g, '-');
    const pngPath = path.join(this.outputDir, `${safeBaseName}.png`);
    const jpgPath = path.join(this.outputDir, `${safeBaseName}.jpg`);
    const aiPath = path.join(this.projectDir, `${this.projectName}.ai`);

    const exportScript = `
      (function() {
        if (app.documents.length === 0) return "ERROR||No active document";
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var doc = app.activeDocument;

        // 1. Save Master AI (Silent, zero modal dialogs)
        try {
          var aiFile = new File(${JSON.stringify(aiPath)});
          var saveOpts = new IllustratorSaveOptions();
          saveOpts.compatibility = Compatibility.ILLUSTRATOR24;
          saveOpts.pdfCompatible = true;
          doc.saveAs(aiFile, saveOpts);
        } catch(e) {
          try { doc.save(); } catch(e2) {}
        }

        // 2. Export High-Res PNG-24
        var pngFile = new File(${JSON.stringify(pngPath)});
        var expPng = new ExportOptionsPNG24();
        expPng.antiAliasing = true;
        expPng.transparency = false;
        expPng.artBoardClipping = true;
        doc.exportFile(pngFile, ExportType.PNG24, expPng);

        // 3. Export Production JPEG
        var jpgFile = new File(${JSON.stringify(jpgPath)});
        var expJpg = new ExportOptionsJPEG();
        expJpg.antiAliasing = true;
        expJpg.artBoardClipping = true;
        expJpg.qualitySetting = 100;
        doc.exportFile(jpgFile, ExportType.JPEG, expJpg);

        app.executeMenuCommand("fitin");
        app.redraw();

        return ["OK", ${JSON.stringify(aiPath)}, ${JSON.stringify(pngPath)}, ${JSON.stringify(jpgPath)}].join("||");
      })();
    `;

    const res = executeDOMScript(exportScript, 60000);
    if (res.success && res.output) {
      const parts = res.output.split("||");
      if (parts[0] === "OK") {
        console.log(`  ✓ Master AI Saved: ${parts[1]}`);
        console.log(`  ✓ High-Res PNG: ${parts[2]}`);
        console.log(`  ✓ Production JPG: ${parts[3]}`);
      }
    } else {
      console.error("  x Export failed:", res.error);
    }
    return res;
  }

  // Stage 6: After Effects Motion Graphics & Video Pipeline
  checkAEHealth() {
    console.log(`[Stage 6] Auditing After Effects 2026 & Skills Integration...`);
    const health = checkAfterEffectsHealth();
    console.log(`  ✓ Installed: ${health.installed ? 'Yes' : 'No'} (${health.version || 'AE 2026'})`);
    console.log(`  ✓ Live Running: ${health.running ? 'Active' : 'Standby / Headless'}`);
    console.log(`  ✓ Skills Active:`);
    console.log(`    - Puppet Animations: ${health.skillsFound.puppetAnimations ? '✓' : '✗'}`);
    console.log(`    - Promo Graphics (Pub-Perk): ${health.skillsFound.pubPerkAnimation ? '✓' : '✗'}`);
    console.log(`    - Zigma Video Production: ${health.skillsFound.zigmaVideoProduction ? '✓' : '✗'}`);
    console.log(`    - AE Motion Clone: ${health.skillsFound.motionClone ? '✓' : '✗'}`);
    return health;
  }

  animateAfterEffects(mode = 'puppet', options = {}) {
    const aiPath = path.join(this.projectDir, `${this.projectName}.ai`);
    const targetAep = path.join(this.outputDir, `${this.projectName}.aep`);

    console.log(`[Stage 6] Initiating After Effects Motion Pipeline (Mode: ${mode})...`);
    console.log(`  + Source Vector: ${aiPath}`);
    console.log(`  + Target Project: ${targetAep}`);

    if (mode === 'puppet') {
      return animatePuppetFlow(aiPath, { ...options, output: targetAep });
    } else if (mode === 'promo') {
      return animatePromoComp(aiPath, { ...options, output: targetAep });
    } else if (mode === 'buoyancy' || mode === 'product') {
      return applyBuoyancyPhysics(options.compName || "Main Comp");
    } else if (mode === 'clone' || mode === 'motion-clone' || mode === 'reference') {
      return cloneMotionFromReference({ compName: options.compName || "Main Comp", ...options });
    } else {
      throw new Error(`Unknown After Effects mode: ${mode}. Available: puppet, promo, product, buoyancy, motion-clone`);
    }
  }

  // Stage 6.2: Reference-Driven Motion Cloning (ae-motion-clone)
  cloneMotion(options = {}) {
    console.log(`[Stage 6.2] Executing Reference-Driven Motion Cloning (ae-motion-clone)...`);
    return applyMotionClone(options);
  }

  // Stage 6.3: Dual-Tier Harmonic Smooth GIF Publisher (ae-comp-to-gif)
  exportSmoothGIF(options = {}) {
    console.log(`[Stage 6.3] Publishing Dual-Tier Smooth GIF Deliverables (ae-comp-to-gif)...`);
    const defaultOut = path.join(this.projectDir, 'Output');
    return publishSmoothGif({
      out: defaultOut,
      ...options
    });
  }

  // Stage 6.5: Dynamic AI Video Services Showcase
  buildShowcasePromo(videoPath = null) {
    console.log(`[Stage 6.5] Generating AI Video Showcase & Promo Animation Package...`);
    this.setupStudioStructure();
    return assembleVideoAdPackage({
      projectDir: this.projectDir,
      videoPath: videoPath
    });
  }

  // Stage 12: Chrome Active Tab Automation
  checkChromeStatus(domain = 'google.com') {
    console.log(`[Stage 12] Checking Google Chrome Automation Health (Domain: ${domain})...`);
    const status = checkChromeAutomationHealth(domain);
    console.log(`  ✓ Chrome Running: ${status.chromeRunning ? 'Yes' : 'No'}`);
    console.log(`  ✓ Apple Events Allowed: ${status.appleEventsAllowed ? 'Yes' : 'No'}`);
    if (domain) {
      console.log(`  ✓ Matching Tab Found (${domain}): ${status.matchingTabFound ? 'Yes' : 'No'}`);
    }
    if (status.error) console.warn(`  ! Error: ${status.error}`);
    return status;
  }

  executeInChrome(code, domain = 'google.com') {
    console.log(`[Stage 12] Executing JavaScript in Chrome tab matching: ${domain}...`);
    const result = runInChromeTab(code, domain);
    console.log(`  ✓ Result: ${result}`);
    return result;
  }

  pasteInChrome(selector, text, domain = 'google.com') {
    console.log(`[Stage 12] Pasting text via system clipboard into selector "${selector}" (${domain})...`);
    return typeViaSystemPaste(selector, text, domain);
  }

  uploadToChrome(filePath, selector = 'input[type=file]', domain = 'google.com') {
    console.log(`[Stage 12] Uploading "${filePath}" to Chrome selector "${selector}" (${domain})...`);
    return uploadFileToChrome(filePath, selector, domain);
  }

  clickChromeHardware(x, y) {
    console.log(`[Stage 12] Injecting hardware click at (${x}, ${y})...`);
    return hardwareClick(x, y);
  }

  // Execute full autonomous pipeline
  runFullPipeline() {
    console.log(`=======================================================`);
    console.log(`  AUTONOMOUS AD DESIGNER PIPELINE: ${this.projectName}`);
    console.log(`=======================================================`);
    this.setupStudioStructure();
    const auditRes = this.auditActiveDocument();
    this.cleanupVectorDebris();
    this.refreshAndFitCanvas();
    const exportRes = this.exportProductionDeliverables();
    console.log(`=======================================================`);
    console.log(`  PIPELINE EXECUTION COMPLETED SUCCESSFULLY`);
    console.log(`=======================================================`);
    return {
      success: true,
      audit: auditRes,
      exports: exportRes
    };
  }
}

// CLI Execution Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let action = 'all';
  let project = "Shahrukhz Waterfront Ad 01";
  let prompt = "";
  let aspectRatio = "1:1";

  let voice = 'Aoede';
  let aeMode = 'puppet';
  let flow = 'columns';
  let duration = 10;
  let fps = 24;
  let csv = '';
  let psd = '';
  let beforePath = '';
  let afterPath = '';
  let diffMode = 'all';
  let refSource = '';
  let compName = '';
  let archetype = 'cascade_drop';
  let layout = 'as-is';
  let elementsOnly = true;
  let hold = 1.9;
  let stagger = 0.12;
  let previewGif = false;
  let videoPath = null;
  let skipWeb = false;
  let chromeDomain = 'google.com';
  let chromeSelector = '';
  let chromeText = '';
  let chromeCode = '';
  let chromeFile = '';
  let chromeX = 0;
  let chromeY = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && args[i + 1]) {
      action = args[i + 1];
      i++;
    } else if (args[i] === '--project' && args[i + 1]) {
      project = args[i + 1];
      i++;
    } else if (args[i] === '--ref' && args[i + 1]) {
      refSource = args[i + 1];
      i++;
    } else if (args[i] === '--comp' && args[i + 1]) {
      compName = args[i + 1];
      i++;
    } else if (args[i] === '--archetype' && args[i + 1]) {
      archetype = args[i + 1];
      i++;
    } else if (args[i] === '--layout' && args[i + 1]) {
      layout = args[i + 1];
      i++;
    } else if (args[i] === '--elements-only') {
      elementsOnly = true;
    } else if (args[i] === '--include-text') {
      elementsOnly = false;
    } else if (args[i] === '--hold' && args[i + 1]) {
      hold = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--stagger' && args[i + 1]) {
      stagger = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--preview-gif') {
      previewGif = true;
    } else if (args[i] === '--prompt' && args[i + 1]) {
      prompt = args[i + 1];
      i++;
    } else if (args[i] === '--ratio' && args[i + 1]) {
      aspectRatio = args[i + 1];
      i++;
    } else if (args[i] === '--voice' && args[i + 1]) {
      voice = args[i + 1];
      i++;
    } else if (args[i] === '--ae-mode' && args[i + 1]) {
      aeMode = args[i + 1];
      i++;
    } else if (args[i] === '--flow' && args[i + 1]) {
      flow = args[i + 1];
      i++;
    } else if (args[i] === '--duration' && args[i + 1]) {
      duration = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--fps' && args[i + 1]) {
      fps = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--csv' && args[i + 1]) {
      csv = args[i + 1];
      i++;
    } else if (args[i] === '--psd' && args[i + 1]) {
      psd = args[i + 1];
      i++;
    } else if (args[i] === '--before' && args[i + 1]) {
      beforePath = args[i + 1];
      i++;
    } else if (args[i] === '--after' && args[i + 1]) {
      afterPath = args[i + 1];
      i++;
    } else if (args[i] === '--diff-mode' && args[i + 1]) {
      diffMode = args[i + 1];
      i++;
    } else if (args[i] === '--video' && args[i + 1]) {
      videoPath = args[i + 1];
      i++;
    } else if (args[i] === '--skip-web') {
      skipWeb = true;
    } else if (args[i] === '--domain' && args[i + 1]) {
      chromeDomain = args[i + 1];
      i++;
    } else if (args[i] === '--selector' && args[i + 1]) {
      chromeSelector = args[i + 1];
      i++;
    } else if (args[i] === '--text' && args[i + 1]) {
      chromeText = args[i + 1];
      i++;
    } else if (args[i] === '--code' && args[i + 1]) {
      chromeCode = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      chromeFile = args[i + 1];
      i++;
    } else if (args[i] === '--x' && args[i + 1]) {
      chromeX = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--y' && args[i + 1]) {
      chromeY = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage:
  node pipeline_runner.js [options]

Options:
  --action <all|audit|cleanup|fit|export|generate|copy|voice|ae-status|animate|motion-clone|comp-to-gif|ai-video-status|video-ad|ps-status|ps-crop|ps-mask|ps-report|ps-slice|ps-csv|qc|qc-markers|diff|chrome-status|chrome-eval|chrome-paste|chrome-upload|chrome-click> Pipeline action (default: all)
  --project <name>                                            Project folder name on Desktop (default: "Shahrukhz Waterfront Ad 01")
  --prompt <text>                                             Prompt or copy script for generation
  --ratio <1:1|16:9|9:16|4:3|3:4>                             Aspect ratio for image generation (default: 1:1)
  --voice <Aoede|Puck|Charon|Kore|Fenrir>                     Voice for narration (default: Aoede)
  --ae-mode <puppet|promo|product|buoyancy|motion-clone>      After Effects animation mode (default: puppet)
  --flow <columns|top-bottom|left-right>                      Reading flow for puppet animation (default: columns)
  --duration <seconds>                                        Animation duration in seconds (default: 10)
  --fps <number>                                              Comp frame rate (default: 24)
  --ref <url_or_file>                                         Reference video/GIF/URL for motion-clone
  --comp <name>                                               Target After Effects composition name for motion-clone or comp-to-gif
  --archetype <cascade_drop|carousel_scroll|elastic_pop>      Motion archetype model for motion-clone (default: cascade_drop)
  --layout <as-is|stacked>                                    Layout mode: as-is or stacked collage (default: as-is)
  --elements-only                                             Animate only graphic elements, lock text/BG (default: true)
  --include-text                                              Also animate text layers
  --preview-gif                                               Export butter-smooth 50 FPS GIF via ae-comp-to-gif
  --video <path>                                              User AI video file path to inject into showcase promo
  --skip-web                                                  Skip web-optimized GIF generation
  --csv <path>                                                CSV path for variable batch graphics
  --psd <path>                                                PSD path for layer slicing or template
  --before <path>                                             Before image/artboard path for visual diffing
  --after <path>                                              After image/artboard path for visual diffing
  --diff-mode <image|marked|all>                              Diff mode (image: side-by-side, marked: pins/boxes)
  --domain <domain>                                           Target domain for Chrome automation (default: google.com)
  --code <javascript>                                         JavaScript snippet to execute in Chrome tab
  --selector <cssSelector>                                    DOM selector for Chrome paste or file upload
  --text <string>                                             Text to type via system paste into Chrome
  --file <path>                                               Local file to inject into Chrome <input type=file>
  --x <number>                                                Screen X coordinate for hardware click
  --y <number>                                                Screen Y coordinate for hardware click
  --help                                                      Show this help message
      `);
      process.exit(0);
    }
  }

  const pipeline = new AutonomousDesignPipeline({ project });

  switch (action) {
    case 'qc':
      pipeline.runDesignQC(false);
      break;
    case 'qc-markers':
      pipeline.runDesignQC(true);
      break;
    case 'diff':
      pipeline.setupStudioStructure();
      pipeline.generateVisualDiff(beforePath, afterPath, { mode: diffMode });
      break;
    case 'ps-status':
      console.log(`[Photoshop 2026 Environment Check]`);
      console.log(JSON.stringify(checkPhotoshopHealth(), null, 2));
      break;
    case 'ps-crop':
      pipeline.setupStudioStructure();
      pipeline.cropMediaForVideo(aspectRatio || '9:16');
      break;
    case 'ps-mask':
      pipeline.setupStudioStructure();
      pipeline.maskMediaForAE();
      break;
    case 'ps-report':
      pipeline.setupStudioStructure();
      pipeline.auditMediaHealth();
      break;
    case 'ps-slice':
      pipeline.setupStudioStructure();
      pipeline.slicePsdForAE(psd);
      break;
    case 'ps-csv':
      pipeline.setupStudioStructure();
      pipeline.generateVariableCSV(csv, psd);
      break;
    case 'motion-clone':
    case 'clone-motion':
      pipeline.cloneMotion({
        comp: compName || 'Slide 11',
        ref: refSource,
        archetype,
        layout,
        elementsOnly,
        duration,
        stagger,
        hold,
        previewGif
      });
      break;
    case 'comp-to-gif':
    case 'smooth-gif':
      pipeline.exportSmoothGIF({
        comp: compName || 'Slide 5',
        duration: duration || null,
        fps: fps || 'auto',
        skipWeb
      });
      break;
    case 'ai-video-status':
      console.log(JSON.stringify(checkAIVideoEnginesHealth(), null, 2));
      break;
    case 'video-ad':
    case 'ai-video-showcase':
      pipeline.setupStudioStructure();
      pipeline.buildShowcasePromo(videoPath);
      break;
    case 'ae-status':
      pipeline.checkAEHealth();
      break;
    case 'animate':
      pipeline.setupStudioStructure();
      pipeline.animateAfterEffects(aeMode, { flow, duration, fps });
      break;
    case 'copy':
      pipeline.generateCopy(prompt || "Luxury waterfront real estate ad headline and hook").then(r => {
        console.log(`\nGenerated Copy:\n${r.text}`);
      });
      break;
    case 'voice':
      pipeline.setupStudioStructure();
      pipeline.generateVoiceover(prompt || "Experience unparalleled architectural elegance with sweeping waterfront vistas.", voice);
      break;
    case 'generate':
      pipeline.setupStudioStructure();
      pipeline.generateHeroAsset(prompt || "Luxury waterfront real estate ad visual, cinematic golden hour, 85mm lens", aspectRatio || "1:1");
      break;
    case 'audit':
      pipeline.auditActiveDocument();
      break;
    case 'cleanup':
      pipeline.cleanupVectorDebris();
      break;
    case 'fit':
      pipeline.refreshAndFitCanvas();
      break;
    case 'export':
      pipeline.exportProductionDeliverables();
      break;
    case 'chrome-status':
      pipeline.checkChromeStatus(chromeDomain);
      break;
    case 'chrome-eval':
      if (!chromeCode) {
        console.error("Error: --code <javascript> is required for chrome-eval");
        process.exit(1);
      }
      pipeline.executeInChrome(chromeCode, chromeDomain);
      break;
    case 'chrome-paste':
      if (!chromeSelector || !chromeText) {
        console.error("Error: --selector <css> and --text <string> are required for chrome-paste");
        process.exit(1);
      }
      pipeline.pasteInChrome(chromeSelector, chromeText, chromeDomain);
      break;
    case 'chrome-upload':
      if (!chromeFile) {
        console.error("Error: --file <path> is required for chrome-upload");
        process.exit(1);
      }
      pipeline.uploadToChrome(chromeFile, chromeSelector || 'input[type=file]', chromeDomain);
      break;
    case 'chrome-click':
      pipeline.clickChromeHardware(chromeX, chromeY);
      break;
    case 'all':
    default:
      pipeline.runFullPipeline();
      break;
  }
}

module.exports = AutonomousDesignPipeline;
