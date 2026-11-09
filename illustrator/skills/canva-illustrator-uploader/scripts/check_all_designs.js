const { callCanvaTool } = require('./canva_client');

async function searchAll() {
  const queries = ['Singapore', 'roadshow', 'CanvaReady', 'Ig stories'];
  for (const q of queries) {
    try {
      const res = await callCanvaTool('search-designs', { query: q });
      console.log(`\n=== QUERY: "${q}" ===`);
      if (res && res.items) {
        res.items.slice(0, 5).forEach(it => {
          console.log(`- ${it.title} (ID: ${it.design_id}, created: ${it.created_at}, edit_url: ${it.edit_url})`);
        });
      }
    } catch (e) {
      console.log(`Search err for "${q}":`, e.message);
    }
  }
}
searchAll();
