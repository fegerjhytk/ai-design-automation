const { callCanvaTool } = require('./canva_client');

async function search() {
  const res = await callCanvaTool('search-designs', { query: '.ai' });
  console.log("Recent .ai designs:", JSON.stringify(res.items.slice(0, 8), null, 2));
}
search();
