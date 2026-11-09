const { callCanvaTool } = require('./canva_client');

async function test() {
  const result = await callCanvaTool('help', {
    prompt: 'Can import-design-from-url convert a multipage PDF file into an editable multipage Canva design?'
  });
  console.log(JSON.stringify(result, null, 2));
}
test();
