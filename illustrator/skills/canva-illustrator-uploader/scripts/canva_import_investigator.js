const { callCanvaTool } = require('./canva_client');

async function check() {
  console.log("Checking Canva Connect capabilities...");
  // Let's test import-design-from-url or create-design schemas
  const schemas = ['create-design', 'import-design-from-url', 'create-upload-url'];
  for (const s of schemas) {
    console.log(`Checking schema for ${s}...`);
  }
}
check();
