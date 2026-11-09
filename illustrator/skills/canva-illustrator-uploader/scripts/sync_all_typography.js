const { callCanvaTool } = require('./canva_client');
const fs = require('fs');

async function syncAll() {
  const designId = 'DAHX6XpgF8w';
  console.log("=== 🎨 CANVA MCP TYPOGRAPHY ALIGNMENT PIPELINE ===");
  console.log(`Design ID: ${designId}`);
  
  // 1. Start editing transaction
  const tx = await callCanvaTool('start-editing-transaction', {
    design_id: designId,
    user_intent: 'Align typography and text styling with Illustrator manifest'
  });
  
  const txId = tx.transaction.transaction_id;
  console.log(`Transaction opened: ${txId}`);
  console.log(`Total live Canva richtext elements: ${tx.richtexts ? tx.richtexts.length : 0}`);

  if (tx.richtexts && tx.richtexts.length) {
    tx.richtexts.forEach((rt, idx) => {
      const text = rt.regions ? rt.regions.map(r => r.text).join('') : '';
      console.log(` [${idx + 1}] Page ${rt.page_index} | ID: ${rt.element_id} | Text: "${text}"`);
    });
  }

  // Cancel to leave clean for user
  await callCanvaTool('cancel-editing-transaction', {
    transaction_id: txId,
    user_intent: 'Completed inspection'
  });
  console.log("\nTransaction closed cleanly. Ready for precision edits.");
}
syncAll();
