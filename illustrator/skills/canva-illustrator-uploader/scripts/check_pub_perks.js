const { callCanvaTool } = require('./canva_client');

async function check() {
  const design = await callCanvaTool('get-design', { design_id: 'DAHX59vZDqk' });
  console.log("Design DAHX59vZDqk info:", JSON.stringify(design, null, 2));
}
check();
