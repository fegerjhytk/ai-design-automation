const { callCanvaTool } = require('./canva_client');

async function check() {
  const pages = await callCanvaTool('get-design-pages', { design_id: 'DAHX6XpgF8w' });
  console.log("Pages:", JSON.stringify(pages, null, 2));
}
check();
