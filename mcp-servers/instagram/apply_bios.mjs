import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { IgApiClient } = require("instagram-private-api");

const AUTH_DIR = "/Users/admin/.gemini/config/plugins/instagram/auth_info";

async function loadSession(ig, sessionPath) {
  const data = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
  await ig.state.deserialize(data);
}

async function editBio(username, bio, website) {
  console.log(`\n🔄 Updating @${username}...`);
  const sessionPath = path.join(AUTH_DIR, "sessions", `${username}.json`);
  
  const ig = new IgApiClient();
  ig.state.generateDevice(username);
  await loadSession(ig, sessionPath);

  try {
    // Try to get current user to confirm session is active
    const currentUser = await ig.account.currentUser();
    console.log(`   ✔ Session active for: ${currentUser.username}`);

    // Edit profile
    const result = await ig.account.editProfile({
      biography: bio,
      external_url: website,
      // Keep existing values for other fields
      first_name: currentUser.full_name || "",
      email: currentUser.email || "",
      phone_number: currentUser.phone_number || "",
      username: currentUser.username,
      gender: currentUser.gender || 0,
    });

    if (result?.user) {
      console.log(`✅ @${username} bio updated!`);
      console.log(`   Bio: ${result.user.biography}`);
      console.log(`   URL: ${result.user.external_url}`);
    } else {
      console.log(`✅ @${username} — response received:`, JSON.stringify(result).slice(0, 200));
    }
  } catch (err) {
    console.log(`❌ @${username} error: ${err.message}`);
    // If session expired, try re-login with saved password
    if (err.message?.includes("login_required") || err.message?.includes("not authenticated")) {
      console.log(`   → Session expired. Please re-authenticate.`);
    }
    console.log("   Full error:", err.response?.body ? JSON.stringify(err.response.body).slice(0, 300) : err.stack?.slice(0, 300));
  }
}

const deepansBio = `Deepanshu Design Studio 🎨
Brand Designer | Social Media | Visual Content
🖥️ Reels • AI Videos • Marketing Visuals
Helping brands look ✨ scroll-stopping.
📩 DM for free consultation!`;

const vandanaBio = `🖨️ Vandana Creation | Since 2013
Printing • Designing • Marketing Materials
📍 New Delhi, India
✅ Banners | Flex | Brand Collateral
📞 7982850887 | 9891358426
💌 DM for bulk orders & inquiries!`;

await editBio("deepans.designstudio", deepansBio, "https://storage.googleapis.com/deepanshu-portfolio/index.html");
await editBio("vandanacreation09", vandanaBio, "https://www.indiamart.com/vandanacreation-delhi/profile.html");

