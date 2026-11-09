const { callCanvaTool } = require('./canva_client');

async function check() {
  const fileId = 'oAHX6sex6Bg';
  console.log(`Checking fileId ${fileId} in Canva MCP...`);
  
  try {
    const assetRes = await callCanvaTool('get-assets', { asset_ids: [fileId] });
    console.log("get-assets:", JSON.stringify(assetRes, null, 2));
  } catch(e) {
    console.log("get-assets error:", e.message);
  }

  try {
    const searchRes = await callCanvaTool('search-designs', { query: 'Singapore roadshow' });
    console.log("search-designs:", JSON.stringify(searchRes.items.slice(0, 3), null, 2));
  } catch(e) {
    console.log("search error:", e.message);
  }
}
check();
