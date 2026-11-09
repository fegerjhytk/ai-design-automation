const { callCanvaTool } = require('./canva_client');

async function check() {
  const design = await callCanvaTool('get-design', { design_id: 'DAHX6XpgF8w' });
  console.log("Singapore roadshow design details:", JSON.stringify(design, null, 2));
}
check();
