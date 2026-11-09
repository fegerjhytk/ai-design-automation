const { callCanvaTool } = require('./canva_client');

async function check() {
  const folders = ['uploads', 'root'];
  for (const f of folders) {
    try {
      const res = await callCanvaTool('list-folder-items', {
        folder_id: f,
        limit: 20,
        sort_by: 'created_descending'
      });
      console.log(`\n=== FOLDER: ${f} (Count: ${res?.items?.length || 0}) ===`);
      if (res && res.items) {
        for (const it of res.items) {
          const title = it.design ? it.design.title : (it.image ? it.image.name : it.type);
          const id = it.design ? it.design.id : (it.image ? it.image.id : 'n/a');
          const created = it.design ? it.design.created_at : (it.image ? it.image.created_at : 'n/a');
          console.log(`- [${it.type}] ${title} (ID: ${id}, created: ${created})`);
        }
      }
    } catch (e) {
      console.log(`Error checking folder ${f}:`, e.message);
    }
  }
}
check();
