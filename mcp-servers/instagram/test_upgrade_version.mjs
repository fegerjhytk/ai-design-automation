import fs from "node:fs";
import { IgApiClient } from "instagram-private-api";

const accs = JSON.parse(fs.readFileSync("./auth_info/accounts.json", "utf-8"));

async function testModernVersion(username) {
  const acc = accs.accounts[username];
  const ig = new IgApiClient();
  ig.state.generateDevice(username);

  // Modern Instagram Android App Version constants
  const modernVersion = "330.0.0.33.109";
  const modernVersionCode = "592182092";
  ig.state.appVersion = modernVersion;
  ig.state.appVersionCode = modernVersionCode;
  ig.state.userAgent = `Instagram ${modernVersion} Android (33/13; 440dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; ${modernVersionCode})`;

  try {
    const user = await ig.account.login(username, acc.password);
    console.log(`[SUCCESS] Logged in as ${user.username}`);
  } catch (err) {
    console.error(`[ERROR] ${username}:`, err.message);
    if (err.response) {
      console.error(`  Body:`, JSON.stringify(err.response.body));
    }
  }
}

testModernVersion("deepans.designstudio");
