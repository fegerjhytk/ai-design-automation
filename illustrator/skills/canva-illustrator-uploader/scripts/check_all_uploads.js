const { callCanvaTool } = require('./canva_client');

async function check() {
  console.log("Checking folder uploads with item_types ['image']...");
  try {
    const res = await callCanvaTool('list-folder-items', {
      folder_id: 'uploads',
      item_types: ['image'],
      limit: 10,
      sort_by: 'created_descending'
    });
    console.log("Uploaded images:", JSON.stringify(res.items.slice(0, 5), null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
check();
