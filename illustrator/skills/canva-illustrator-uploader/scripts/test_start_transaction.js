const { callCanvaTool } = require('./canva_client');

async function test() {
  const designId = 'DAHX6XpgF8w';
  console.log("Starting editing transaction on design DAHX6XpgF8w...");
  try {
    const tx = await callCanvaTool('start-editing-transaction', {
      design_id: designId,
      user_intent: 'Update design elements from Illustrator manifest'
    });
    console.log("Transaction:", JSON.stringify(tx, null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
