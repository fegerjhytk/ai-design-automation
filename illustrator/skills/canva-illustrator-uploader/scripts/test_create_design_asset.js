const { callCanvaTool } = require('./canva_client');

async function test() {
  const result = await callCanvaTool('help', {
    prompt: 'How can an API client turn a file uploaded via create-upload-url (which returns a fileId) into an editable design? Can create-design accept an asset_id or fileId?'
  });
  console.log(JSON.stringify(result, null, 2));
}
test();
