const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('/Users/admin/.gemini/antigravity/mcp/canva/create-upload-url.json', 'utf8'));
console.log("create-upload-url full schema:", JSON.stringify(schema, null, 2));
