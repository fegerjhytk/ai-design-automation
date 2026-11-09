const { callCanvaTool } = require('./canva_client');

async function check() {
  const fileIds = ['oAHX6SEo6qI', 'oAHX6d9IkgU'];
  for (const id of fileIds) {
    try {
      const res = await callCanvaTool('get-assets', { asset_ids: [id] });
      console.log(`Asset ${id}:`, JSON.stringify(res, null, 2));
    } catch (e) {
      console.log(`Asset ${id} err:`, e.message);
    }
  }
}
check();
