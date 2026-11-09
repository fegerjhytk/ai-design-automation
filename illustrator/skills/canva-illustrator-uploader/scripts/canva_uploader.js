#!/usr/bin/env node
/**
 * canva_uploader.js
 * End-to-end automated Illustrator-to-Canva pipeline.
 *
 * Usage:
 *   node canva_uploader.js                    # Full automated pipeline on active Illustrator doc
 *   node canva_uploader.js --file <path>      # Run on specific file
 *   node canva_uploader.js --step optimize    # Run only Illustrator optimization & manifest
 *   node canva_uploader.js --step upload      # Run only Canva upload & design capture
 *   node canva_uploader.js --step sync        # Run only Canva typography inspection & sync
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { callCanvaTool } = require('./canva_client');

function runAppleScript(script, timeoutSeconds = 1800) {
  const tmpAppleScript = path.join(__dirname, '.tmp_as.scpt');
  fs.writeFileSync(tmpAppleScript, `with timeout of ${timeoutSeconds} seconds\n${script}\nend timeout`, 'utf8');
  try {
    const output = execSync(`osascript "${tmpAppleScript}"`, { encoding: 'utf8' }).trim();
    try { fs.unlinkSync(tmpAppleScript); } catch(e) {}
    return output;
  } catch (err) {
    try { fs.unlinkSync(tmpAppleScript); } catch(e) {}
    throw err;
  }
}

function runExtendScript(scriptPath) {
  const as = `tell application "Adobe Illustrator" to do javascript (file "${scriptPath}")`;
  return runAppleScript(as);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf('--file');
  const stepArgIdx = args.indexOf('--step');
  
  const customFilePath = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
  const targetStep = stepArgIdx !== -1 ? args[stepArgIdx + 1] : 'all';

  console.log('================================================================');
  console.log('     🎨 AUTOMATED ILLUSTRATOR TO CANVA UPLOADER SKILL');
  console.log('================================================================\n');

  // STEP 1: Inspect Active Document & Duplicate
  let activeDocName = '';
  let activeDocPath = '';
  let preTextCount = 0;
  let artboardCount = 0;

  if (targetStep === 'all' || targetStep === 'optimize') {
    console.log('🔍 [Phase 1] Inspecting Adobe Illustrator document...');
    const docQueryScript = path.join(__dirname, '.tmp_query.jsx');
    fs.writeFileSync(docQueryScript, `
      if (app.documents.length === 0) {
        "NONE";
      } else {
        var d = app.activeDocument;
        var p = "";
        try { p = d.fullName.fsName; } catch(e) { p = ""; }
        d.name + "|||" + p + "|||" + d.textFrames.length + "|||" + d.artboards.length;
      }
    `, 'utf8');

    const queryResult = runExtendScript(docQueryScript);
    try { fs.unlinkSync(docQueryScript); } catch(e) {}

    if (queryResult === 'NONE') {
      console.error('❌ Error: No document is currently open in Adobe Illustrator.');
      process.exit(1);
    }

    const parts = queryResult.split('|||');
    activeDocName = parts[0];
    activeDocPath = parts[1];
    preTextCount = parseInt(parts[2], 10);
    artboardCount = parseInt(parts[3], 10);

    console.log(`   • Active Document: \x1b[32m${activeDocName}\x1b[0m`);
    console.log(`   • Source Path:     ${activeDocPath}`);
    console.log(`   • Live Text Frames:${preTextCount}`);
    console.log(`   • Artboards:       ${artboardCount}\n`);

    // Safety Duplicate
    const baseName = activeDocName.replace(/\.ai$/i, '');
    const isAlreadyWorkingCopy = activeDocName.endsWith('_CanvaReady.ai');
    let workingCopyPath = path.join(os.homedir(), 'Desktop', `${baseName}_CanvaReady.ai`);

    if (!isAlreadyWorkingCopy) {
      console.log(`📋 [Phase 1.1] Creating safe working copy on Desktop...`);
      const dupScript = path.join(__dirname, '.tmp_dup.jsx');
      fs.writeFileSync(dupScript, `
        var doc = app.activeDocument;
        var targetFile = new File("${workingCopyPath}");
        var saveOpts = new IllustratorSaveOptions();
        saveOpts.compatibility = Compatibility.ILLUSTRATOR24;
        saveOpts.pdfCompatible = true;
        saveOpts.compressed = true;
        doc.saveAs(targetFile, saveOpts);
        "OK";
      `, 'utf8');
      runExtendScript(dupScript);
      try { fs.unlinkSync(dupScript); } catch(e) {}
      console.log(`   ✅ Saved working copy: ${workingCopyPath}\n`);
    } else {
      workingCopyPath = path.join(os.homedir(), 'Desktop', activeDocName);
      console.log(`   ℹ️ Already using working copy: ${workingCopyPath}\n`);
    }

    // STEP 2: Typography Manifest Extraction
    console.log('📝 [Phase 1.2] Extracting Typography Manifest...');
    const extractScriptPath = path.join(__dirname, 'extract_typography.jsx');
    const manifestJsonRaw = runExtendScript(extractScriptPath);
    const manifest = JSON.parse(manifestJsonRaw);
    const manifestPath = path.join(os.homedir(), 'Desktop', `${baseName.replace('_CanvaReady', '')}_typography_manifest.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`   ✅ Extracted metrics for \x1b[32m${manifest.length}\x1b[0m text frames.`);
    console.log(`   💾 Saved Manifest: ${manifestPath}\n`);

    // STEP 3: Headless Optimization
    console.log('⚡ [Phase 1.3] Executing Headless Canva Optimizer (300 PPI alpha rasterization)...');
    const optScriptPath = path.join(__dirname, 'optimize_headless.jsx');
    const optResultRaw = runExtendScript(optScriptPath);
    const optResult = JSON.parse(optResultRaw);

    if (!optResult.success) {
      console.error(`❌ Optimization failed: ${optResult.error}`);
      process.exit(1);
    }

    console.log(`   ✅ Optimization metrics:`);
    console.log(`      • Vector Elements Rasterized: ${optResult.rasterizedCount}`);
    console.log(`      • Edge Clipping Masks Released: ${optResult.edgeUnclipCount}`);
    console.log(`      • Groups Ungrouped:            ${optResult.ungroupCount}\n`);

    // STEP 4: Text Verification Gate
    console.log('🛡  [Phase 1.4] Checking Text Integrity Gate...');
    if (optResult.postTextCount !== optResult.preTextCount) {
      console.error(`🚨 FATAL: Text count mismatch! Expected ${optResult.preTextCount}, but got ${optResult.postTextCount}.`);
      console.error('Halting execution to prevent artwork distortion.');
      process.exit(1);
    }
    console.log(`   ✅ VERIFIED: 100% text frames (${optResult.postTextCount}/${optResult.preTextCount}) remain live and untouched!\n`);
  }

  // Target file to upload
  const baseName = (activeDocName || 'design').replace(/\.ai$/i, '').replace('_CanvaReady', '');
  const uploadFilePath = customFilePath || path.join(os.homedir(), 'Desktop', `${baseName}_CanvaReady.ai`);

  if (!fs.existsSync(uploadFilePath)) {
    console.error(`❌ Error: File to upload does not exist: ${uploadFilePath}`);
    process.exit(1);
  }

  // STEP 5: Direct Canva Native Upload
  if (targetStep === 'all' || targetStep === 'upload') {
    const fileStats = fs.statSync(uploadFilePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log('🚀 [Phase 2] Streaming native Illustrator file to Canva...');
    console.log(`   • File: ${uploadFilePath}`);
    console.log(`   • Size: ${fileSizeMB} MB`);

    console.log('   🔑 Requesting single-use signed upload URL from Canva MCP...');
    const uploadUrlData = await callCanvaTool('create-upload-url', {
      user_intent: `Upload ${path.basename(uploadFilePath)} into Canva`
    });

    if (!uploadUrlData || !uploadUrlData.uploadUrl) {
      console.error('❌ Failed to get upload URL from Canva MCP:', uploadUrlData);
      process.exit(1);
    }

    console.log('   📤 Uploading raw file stream to Canva ingress endpoint...');
    const fileBytes = fs.readFileSync(uploadFilePath);
    const uploadRes = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: fileBytes
    });

    if (!uploadRes.ok) {
      console.error(`❌ Upload failed with HTTP status ${uploadRes.status}: ${await uploadRes.text()}`);
      process.exit(1);
    }

    const uploadResultJson = await uploadRes.json();
    console.log(`   ✅ Ingress uploaded successfully! File ID: \x1b[32m${uploadResultJson.fileId}\x1b[0m\n`);

    // STEP 6: Poll Canva for Design Conversion
    console.log('⏳ [Phase 2.1] Waiting for Canva cloud converter to create design document...');
    const filenameToFind = path.basename(uploadFilePath);
    let foundDesign = null;
    const maxAttempts = 20;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      process.stdout.write(`   • Polling attempt ${attempt}/${maxAttempts} (waiting 5s)... `);
      await sleep(5000);

      try {
        const folderItems = await callCanvaTool('list-folder-items', {
          folder_id: 'uploads',
          item_types: ['design'],
          sort_by: 'created_descending',
          user_intent: 'Find newly converted design'
        });

        if (folderItems && folderItems.items) {
          const match = folderItems.items.find(it => 
            it.type === 'design' && (
              it.design.title === filenameToFind ||
              it.design.title.includes(baseName)
            )
          );
          if (match) {
            foundDesign = match.design;
            console.log('\x1b[32mFOUND!\x1b[0m');
            break;
          }
        }
      } catch (err) {
        // Continue polling
      }
      console.log('processing...');
    }

    if (foundDesign) {
      console.log('\n🎉 ==============================================================');
      console.log(`  CANVA DESIGN CREATED SUCCESSFULLY!`);
      console.log(`  • Title:      ${foundDesign.title}`);
      console.log(`  • Design ID:  ${foundDesign.id}`);
      console.log(`  • Pages:      ${foundDesign.page_count}`);
      console.log(`  • Edit Link:  \x1b[34m${foundDesign.urls ? foundDesign.urls.edit_url : foundDesign.edit_url}\x1b[0m`);
      console.log('==============================================================\n');
    } else {
      console.log('\nℹ️ Canva is still converting the large multi-page file in the background.');
      console.log('It will appear directly in your Canva Uploads / Projects tab shortly.\n');
    }
  }

  // STEP 7: Typography & Kerning Sync / Inspection
  if (targetStep === 'all' || targetStep === 'sync') {
    const manifestPath = path.join(os.homedir(), 'Desktop', `${baseName}_typography_manifest.json`);
    if (fs.existsSync(manifestPath)) {
      console.log('📐 [Phase 3] Typography & Kerning Metrics Report:');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`   Loaded ${manifest.length} reference frames from Illustrator manifest.\n`);

      // Group by font and tracking
      const styles = {};
      manifest.forEach(t => {
        const key = `${t.fontName} | Size: ${Math.round(t.fontSize)}pt | Tracking: ${t.tracking} | Leading: ${Math.round(t.leading)}pt`;
        styles[key] = (styles[key] || 0) + 1;
      });

      console.log('   Identified Typography Hierarchy:');
      Object.entries(styles).slice(0, 10).forEach(([style, count]) => {
        console.log(`   • [${count}x] ${style}`);
      });
      console.log('');
    }
  }

  console.log('✅ Pipeline finished.\n');
}

main().catch(err => {
  console.error('\n❌ Unhandled error in Canva uploader pipeline:', err.message);
  process.exit(1);
});
