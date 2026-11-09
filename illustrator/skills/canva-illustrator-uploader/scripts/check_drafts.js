const { callCanvaTool } = require('./canva_client');

async function check() {
  console.log("Checking draft designs or designs across accounts...");
  const queries = ['Singapore', 'roadshow', 'CanvaReady', 'Ig stories'];
  for (const q of queries) {
    try {
      const res = await callCanvaTool('search-designs', { query: q });
      if (res && res.items && res.items.length) {
        console.log(`\nResults for "${q}":`);
        res.items.slice(0, 5).forEach(it => {
          console.log(` - ${it.title} (ID: ${it.design_id}, edit_url: ${it.edit_url})`);
        });
      }
    } catch(e) {
      console.log(`Error on "${q}":`, e.message);
    }
  }
}
check();
