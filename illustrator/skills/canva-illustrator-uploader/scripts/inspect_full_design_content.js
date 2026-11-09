const { callCanvaTool } = require('./canva_client');

async function inspect() {
  const designId = 'DAHX6XpgF8w';
  try {
    const pages = await callCanvaTool('get-design-pages', { design_id: designId });
    console.log("Pages:", JSON.stringify(pages, null, 2));

    const content = await callCanvaTool('get-design-content', {
      design_id: designId,
      content_types: ['headings', 'body_texts', 'richtexts']
    });
    console.log("Full Design Content:", JSON.stringify(content, null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
inspect();
