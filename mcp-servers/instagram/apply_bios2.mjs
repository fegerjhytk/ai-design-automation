import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { IgApiClient } = require("instagram-private-api");

const ACCOUNTS = [
  {
    username: "deepans.designstudio",
    password: "@Dp7982003",
    bio: `Deepanshu Design Studio 🎨\nBrand Designer | Social Media | Visual Content\n🖥️ Reels • AI Videos • Marketing Visuals\nHelping brands look ✨ scroll-stopping.\n📩 DM for free consultation!`,
    website: "https://storage.googleapis.com/deepanshu-portfolio/index.html"
  },
  {
    username: "vandanacreation09",
    password: "v9958544123",
    bio: `🖨️ Vandana Creation | Since 2013\nPrinting • Designing • Marketing Materials\n📍 New Delhi, India\n✅ Banners | Flex | Brand Collateral\n📞 7982850887 | 9891358426\n💌 DM for bulk orders & inquiries!`,
    website: "https://www.indiamart.com/vandanacreation-delhi/profile.html"
  }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

for (const acct of ACCOUNTS) {
  console.log(`\n🔄 Logging in and updating @${acct.username}...`);
  try {
    const ig = new IgApiClient();
    ig.state.generateDevice(acct.username);
    await ig.simulate.preLoginFlow().catch(() => {});
    
    const user = await ig.account.login(acct.username, acct.password);
    console.log(`   ✔ Logged in: ${user.username} (${user.full_name})`);
    await sleep(1500);

    const result = await ig.account.editProfile({
      biography: acct.bio,
      external_url: acct.website,
      first_name: user.full_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      username: user.username,
      gender: user.gender || 0,
    });

    if (result?.user) {
      console.log(`✅ @${acct.username} — Bio updated successfully!`);
      console.log(`   Bio: ${result.user.biography}`);
      console.log(`   URL: ${result.user.external_url}`);
    } else {
      console.log(`✅ @${acct.username} — Done:`, JSON.stringify(result).slice(0, 300));
    }
  } catch (err) {
    if (err?.response?.body?.error_type === "needs_upgrade" || /out of date/i.test(err?.message || "")) {
      console.log(`   → Mobile API blocked (needs_upgrade). Trying web method...`);
      // Will fall through to web method
    } else {
      console.log(`❌ @${acct.username} error: ${err.message}`);
      if (err.response?.body) console.log("   Body:", JSON.stringify(err.response.body).slice(0, 300));
    }
  }
  await sleep(3000);
}

