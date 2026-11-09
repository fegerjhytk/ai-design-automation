const { callCanvaTool } = require('./canva_client');

async function test() {
  console.log("Calling get-assets or list-folder-items with limit 5...");
  try {
    const folders = await callCanvaTool('search-folders', { query: '' });
    console.log("Folders:", JSON.stringify(folders, null, 2));
  } catch(e) {
    console.error("search-folders error:", e.message);
  }
}
test();
