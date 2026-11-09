const { callCanvaTool } = require('./canva_client');

async function test() {
  const result = await callCanvaTool('help', {
    prompt: 'Does Canva Connect API support importing an Adobe Illustrator .ai file directly to create a new editable design, or does import-design-from-url only work for public URLs?'
  });
  console.log(JSON.stringify(result, null, 2));
}
test();
