const { callCanvaTool } = require('./canva_client');

async function inspect() {
  const shortlink = 'sWr9LfDhkZOgpIU';
  console.log(`Resolving design from ${shortlink}...`);
  try {
    const resolved = await callCanvaTool('resolve-shortlink', { url: `https://www.canva.com/d/${shortlink}` });
    console.log("Resolved shortlink:", JSON.stringify(resolved, null, 2));
  } catch(e) {
    console.log("resolve-shortlink err:", e.message);
  }

  // Also check DAHX6XpgF8w which was the design associated with this edit url
  try {
    const design = await callCanvaTool('get-design', { design_id: 'DAHX6XpgF8w' });
    console.log("Design DAHX6XpgF8w:", JSON.stringify(design, null, 2));
  } catch(e) {
    console.log("get-design err:", e.message);
  }
}
inspect();
