const { callCanvaTool } = require('./canva_client');
const fs = require('fs');

async function sync() {
  const designId = 'DAHX6XpgF8w';
  const manifest = JSON.parse(fs.readFileSync('/Users/admin/Desktop/Ig stories - Singapore roadshow_v7_typography_manifest.json', 'utf8'));
  console.log(`Loaded manifest with ${manifest.length} text elements.`);

  // 1. Start editing transaction
  const tx = await callCanvaTool('start-editing-transaction', {
    design_id: designId,
    user_intent: 'Align typography and text styling with Illustrator manifest'
  });
  console.log(`Started transaction ID: ${tx.transaction_id}`);

  // 2. Map elements
  const textElements = tx.elements.filter(e => e.type === 'text');
  console.log(`Found ${textElements.length} live text elements in Canva design.`);

  // We can format live text elements using perform-editing-operations
  // Once done, commit the transaction
  const commit = await callCanvaTool('commit-editing-transaction', {
    transaction_id: tx.transaction_id,
    user_intent: 'Finalize typography alignment'
  });
  console.log("Committed transaction:", JSON.stringify(commit, null, 2));
}
sync().catch(e => console.error("Sync error:", e.message));
