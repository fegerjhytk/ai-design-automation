const { callCanvaTool } = require('./canva_client');

async function check() {
  console.log("Checking Canva folders and designs...");
  try {
    const rootItems = await callCanvaTool('list-folder-items', {
      folder_id: 'root',
      limit: 10
    });
    console.log("Root items:", JSON.stringify(rootItems, null, 2));
  } catch (e) {
    console.error("Root check err:", e.message);
  }
}
check();
