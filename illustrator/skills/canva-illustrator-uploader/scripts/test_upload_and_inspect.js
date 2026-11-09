const { callCanvaTool } = require('./canva_client');
const fs = require('fs');

async function run() {
  const uploadData = await callCanvaTool('create-upload-url', {
    user_intent: 'Test upload and inspect response structure'
  });
  console.log("Upload URL response:", JSON.stringify(uploadData, null, 2));
}
run();
