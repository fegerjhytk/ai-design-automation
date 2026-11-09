const { callCanvaTool } = require('./canva_client');

async function test() {
  console.log("Listing available MCP tool names...");
  const helpRes = await callCanvaTool('help', {
    prompt: 'Is there a Canva MCP tool that imports a file as a design, similar to POST /imports in the Canva Connect API?'
  });
  console.log(JSON.stringify(helpRes, null, 2));
}
test();
