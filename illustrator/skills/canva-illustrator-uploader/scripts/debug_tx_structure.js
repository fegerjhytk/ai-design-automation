const { callCanvaTool } = require('./canva_client');

async function test() {
  const designId = 'DAHX6XpgF8w';
  const tx = await callCanvaTool('start-editing-transaction', {
    design_id: designId,
    user_intent: 'Inspect transaction response keys'
  });
  console.log("TX keys:", Object.keys(tx));
  if (tx.transaction_id) console.log("TX ID:", tx.transaction_id);
  // Cancel transaction to keep clean
  if (tx.transaction_id) {
    await callCanvaTool('cancel-editing-transaction', {
      transaction_id: tx.transaction_id,
      user_intent: 'Cancel test inspection'
    });
    console.log("Cancelled cleanly.");
  }
}
test();
