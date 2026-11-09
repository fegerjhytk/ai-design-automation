import fs from "node:fs";
import { IgApiClient } from "instagram-private-api";

const accs = JSON.parse(fs.readFileSync("./auth_info/accounts.json", "utf-8"));

async function testMobileLogin(username) {
  const acc = accs.accounts[username];
  if (!acc || !acc.password) {
    console.log(`[Method 1] No credentials for ${username}`);
    return null;
  }

  console.log(`[Method 1] Attempting mobile app emulation login for @${username}...`);
  const ig = new IgApiClient();
  ig.state.generateDevice(username);

  try {
    await ig.simulate.preLoginFlow();
    const user = await ig.account.login(username, acc.password);
    console.log(`[Method 1 SUCCESS] Logged in as ${user.username} (PK: ${user.pk})`);

    // Serialize and save mobile session
    const serialized = await ig.state.serialize();
    delete serialized.constants;
    fs.writeFileSync(`./auth_info/sessions/${username}_mobile.json`, JSON.stringify(serialized, null, 2));
    console.log(`[Method 1] Saved mobile session state to auth_info/sessions/${username}_mobile.json`);
    return { success: true, user };
  } catch (err) {
    console.error(`[Method 1 ERROR] ${username}:`, err.name, "-", err.message);
    if (err.response) {
      console.error(`  Status: ${err.response.statusCode}`);
      console.error(`  Body:`, JSON.stringify(err.response.body));
    }
    return { success: false, error: err };
  }
}

async function main() {
  for (const u of ["deepans.designstudio", "vandanacreation09"]) {
    await testMobileLogin(u);
    console.log("-----------------------------------------");
  }
}

main();
