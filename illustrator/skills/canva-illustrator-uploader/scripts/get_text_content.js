const { callCanvaTool } = require('./canva_client');

async function check() {
  const content = await callCanvaTool('get-design-content', {
    design_id: 'DAHX6XpgF8w',
    content_types: ['richtexts']
  });
  console.log("Design Rich Text Content:", JSON.stringify(content, null, 2));
}
check();
