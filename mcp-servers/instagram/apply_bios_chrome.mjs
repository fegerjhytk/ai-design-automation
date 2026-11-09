import { execFileSync } from "node:child_process";

function runInChrome(js) {
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "instagram.com" then
          tell t to execute javascript ${JSON.stringify(js)}
          return result
        end if
      end repeat
    end repeat
    return "NO_TAB"
  end tell`;
  return execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pasteText(text) {
  // Copy text to clipboard via pbcopy
  execFileSync("bash", ["-c", `printf '%s' ${JSON.stringify(text)} | pbcopy`]);
  // Paste with Cmd+V
  execFileSync("osascript", ["-e", `
    tell application "Google Chrome" to activate
    delay 0.2
    tell application "System Events" to keystroke "v" using command down
  `]);
}

async function updateProfile(username, password, bio, website) {
  console.log(`\n🔄 Starting update for @${username}...`);

  // Step 1: Get CSRF token from current Chrome session
  const cookieJson = runInChrome(`JSON.stringify((function() {
    var c = {};
    document.cookie.split(';').forEach(function(p) {
      var i = p.indexOf('=');
      if (i > 0) c[p.slice(0, i).trim()] = p.slice(i+1).trim();
    });
    return { csrf: c.csrftoken || '', ds: c.ds_user_id || '', sid: c.sessionid ? 'ok' : '' };
  })()`);
  const cookies = JSON.parse(cookieJson);
  console.log(`   Chrome cookies: ds_user_id=${cookies.ds}, sessionid=${cookies.sid}`);

  // Step 2: Use the web API to get current profile
  const profileJson = runInChrome(`JSON.stringify((function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/v1/accounts/current_user/?edit=true', false);
    xhr.setRequestHeader('X-CSRFToken', '${cookies.csrf}');
    xhr.setRequestHeader('X-IG-App-ID', '936619743392459');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send();
    return { status: xhr.status, body: xhr.responseText.slice(0, 1000) };
  })()`);
  const profile = JSON.parse(profileJson);
  console.log(`   Profile API: ${profile.status} — ${profile.body.slice(0, 120)}`);

  let currentUser = null;
  try {
    const profileData = JSON.parse(profile.body);
    currentUser = profileData.user;
  } catch {}

  if (!currentUser) {
    console.log(`   ⚠️  Could not read current profile. Chrome may be logged into different account.`);
    console.log(`   Current URL: ${runInChrome("window.location.href")}`);
    return false;
  }
  console.log(`   Logged in as: ${currentUser.username} | ${currentUser.full_name}`);

  // Step 3: POST edit profile
  const editResult = runInChrome(`JSON.stringify((function() {
    var params = new URLSearchParams();
    params.append('biography', ${JSON.stringify(bio)});
    params.append('external_url', ${JSON.stringify(website)});
    params.append('first_name', ${JSON.stringify(currentUser?.full_name || "")});
    params.append('username', ${JSON.stringify(currentUser?.username || username)});
    params.append('email', ${JSON.stringify(currentUser?.email || "")});
    params.append('phone_number', ${JSON.stringify(currentUser?.phone_number || "")});
    params.append('gender', '${currentUser?.gender || 0}');
    params.append('_csrftoken', '${cookies.csrf}');
    params.append('chaining_enabled', 'on');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/accounts/edit/', false);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('X-CSRFToken', '${cookies.csrf}');
    xhr.setRequestHeader('X-IG-App-ID', '936619743392459');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Referer', 'https://www.instagram.com/accounts/edit/');
    xhr.send(params.toString());
    return { status: xhr.status, body: xhr.responseText.slice(0, 500) };
  })()`);

  const edit = JSON.parse(editResult);
  console.log(`   Edit API: ${edit.status} — ${edit.body.slice(0, 150)}`);

  try {
    const editData = JSON.parse(edit.body);
    if (editData.status === "ok" || editData.user) {
      console.log(`✅ @${username} bio updated successfully!`);
      if (editData.user?.biography) console.log(`   Bio: ${editData.user.biography}`);
      if (editData.user?.external_url) console.log(`   URL: ${editData.user.external_url}`);
      return true;
    } else {
      console.log(`❌ @${username} — API returned: ${JSON.stringify(editData).slice(0, 200)}`);
      return false;
    }
  } catch {
    console.log(`❌ @${username} — Could not parse response: ${edit.body.slice(0, 200)}`);
    return false;
  }
}

// ─── Account 1: deepans.designstudio ───
// First navigate to deepans profile to ensure we're on instagram
runInChrome("window.location.href = 'https://www.instagram.com/deepans.designstudio/'");
await sleep(3000);

const deepansBio = `Deepanshu Design Studio 🎨
Brand Designer | Social Media | Visual Content
🖥️ Reels • AI Videos • Marketing Visuals
Helping brands look ✨ scroll-stopping.
📩 DM for free consultation!`;

const deepansResult = await updateProfile(
  "deepans.designstudio",
  "@Dp7982003",
  deepansBio,
  "https://storage.googleapis.com/deepanshu-portfolio/index.html"
);

await sleep(4000);

// ─── Account 2: vandanacreation09 ───
const vandanaBio = `🖨️ Vandana Creation | Since 2013
Printing • Designing • Marketing Materials
📍 New Delhi, India
✅ Banners | Flex | Brand Collateral
📞 7982850887 | 9891358426
💌 DM for bulk orders & inquiries!`;

// vandanacreation09 was the previous page, Chrome might still be there
// Let's check who's logged in via the API first
const vandanaResult = await updateProfile(
  "vandanacreation09",
  "v9958544123",
  vandanaBio,
  "https://www.indiamart.com/vandanacreation-delhi/profile.html"
);

console.log("\n─── Summary ───");
console.log(`@deepans.designstudio: ${deepansResult ? "✅ Updated" : "❌ Failed"}`);
console.log(`@vandanacreation09: ${vandanaResult ? "✅ Updated" : "❌ Failed"}`);
