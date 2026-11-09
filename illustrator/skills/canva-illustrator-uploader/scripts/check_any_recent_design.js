const { callCanvaTool } = require('./canva_client');

async function check() {
  const res = await callCanvaTool('list-folder-items', {
    folder_id: 'uploads',
    limit: 5,
    sort_by: 'created_descending'
  });
  console.log("Latest items in uploads folder:");
  if (res && res.items) {
    res.items.forEach(it => {
      const title = it.design ? it.design.title : (it.image ? it.image.name : it.type);
      console.log(`- [${it.type}] ${title} (created: ${it.design?.created_at || it.image?.created_at})`);
    });
  }
}
check();
