const { callCanvaTool } = require('./canva_client');

async function inspect() {
  console.log("=== Inspecting Canva MCP Tools ===");
  // Let's check get-assets on the fileId that was returned: oAHX6SEo6qI and oAHX6d9IkgU
  const ids = ['oAHX6SEo6qI', 'oAHX6d9IkgU'];
  for (const id of ids) {
    try {
      const res = await callCanvaTool('get-assets', { asset_ids: [id] });
      console.log(`get-assets(${id}):`, res);
    } catch (e) {
      console.log(`get-assets(${id}) error:`, e.message);
    }
  }
}
inspect();
