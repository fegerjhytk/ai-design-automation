const { callCanvaTool } = require('./canva_client');
const fs = require('fs');
const path = require('path');

async function uploadDirectlyViaCanvaMCP(filePath) {
  console.log(`================================================================`);
  console.log(`  🚀 CANVA MCP UPLOADER: DIRECT INGESTION PIPELINE`);
  console.log(`================================================================\n`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileStats = fs.statSync(filePath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  const fileName = path.basename(filePath);

  console.log(`📁 File Target: ${filePath}`);
  console.log(`📦 File Size:   ${fileSizeMB} MB\n`);

  // Step 1: Call Canva MCP create-upload-url
  console.log(`[Step 1] Calling Canva MCP 'create-upload-url'...`);
  const uploadUrlResponse = await callCanvaTool('create-upload-url', {
    user_intent: `Upload ${fileName} into user's Canva library and project workspace`
  });

  if (!uploadUrlResponse || !uploadUrlResponse.uploadUrl) {
    throw new Error(`Failed to obtain upload URL from Canva MCP: ${JSON.stringify(uploadUrlResponse)}`);
  }

  console.log(`   ✅ Single-use signed Canva upload URL received.`);
  console.log(`   🔗 Endpoint: ${uploadUrlResponse.uploadUrl.slice(0, 75)}...\n`);

  // Step 2: Stream raw bytes to Canva ingress endpoint
  console.log(`[Step 2] Streaming binary file bytes to Canva ingress...`);
  const fileBytes = fs.readFileSync(filePath);

  const ingressResponse = await fetch(uploadUrlResponse.uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(fileBytes.length)
    },
    body: fileBytes
  });

  if (!ingressResponse.ok) {
    const errorText = await ingressResponse.text();
    throw new Error(`Ingress upload failed (HTTP ${ingressResponse.status}): ${errorText}`);
  }

  const ingressResult = await ingressResponse.json();
  const fileId = ingressResult.fileId;
  console.log(`   ✅ Ingress upload accepted with HTTP ${ingressResponse.status}!`);
  console.log(`   🆔 File ID: ${fileId}\n`);

  // Step 3: Verify Asset Registration via Canva MCP
  console.log(`[Step 3] Polling Canva MCP for asset registration...`);
  let asset = null;
  for (let i = 1; i <= 6; i++) {
    process.stdout.write(`   • Check ${i}/6: calling Canva MCP 'get-assets'... `);
    try {
      const assetRes = await callCanvaTool('get-assets', { asset_ids: [fileId] });
      if (assetRes && assetRes.assets && assetRes.assets.length) {
        asset = assetRes.assets[0];
        console.log(`FOUND!`);
        break;
      }
    } catch(e) {}
    console.log(`processing...`);
    await new Promise(r => setTimeout(r, 4000));
  }

  // Step 4: List recent uploads in Canva MCP
  console.log(`\n[Step 4] Checking Canva MCP folder items...`);
  const folderRes = await callCanvaTool('list-folder-items', {
    folder_id: 'uploads',
    limit: 5,
    sort_by: 'created_descending'
  });

  console.log(`   ✅ Canva MCP uploads folder items inspected.`);
  return {
    fileId,
    asset,
    filePath,
    fileName,
    fileSizeMB
  };
}

const targetPath = process.argv[2] || '/Users/admin/Desktop/Ig stories - Singapore roadshow_v7_CanvaReady.ai';

uploadDirectlyViaCanvaMCP(targetPath)
  .then(res => {
    console.log(`\n🎉 Upload Completed via Canva MCP:`, JSON.stringify(res, null, 2));
  })
  .catch(err => {
    console.error(`\n❌ Error:`, err.message);
    process.exit(1);
  });
