const { callCanvaTool } = require('./canva_client');

async function check() {
  try {
    const brandKits = await callCanvaTool('list-brand-kits', {});
    console.log("Brand kits:", JSON.stringify(brandKits, null, 2));
  } catch(e) {
    console.error("Brand kit err:", e.message);
  }
}
check();
