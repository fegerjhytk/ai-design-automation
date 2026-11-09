"use strict";
const { execFileSync, spawnSync } = require("child_process");

const DEEPANS_BIO = "Deepanshu Design Studio 🎨\nBrand Designer | Social Media\nReels • AI Videos • Marketing\n✨ Helping brands look scroll-stopping\n📩 DM to collaborate!";
const DEEPANS_URL = "https://storage.googleapis.com/deepanshu-portfolio/index.html";

const VANDANA_BIO = "🖨️ Vandana Creation | Since 2013\nPrinting • Designing • Marketing\n📍 New Delhi | ✅ Banners & Branding\n📞 7982850887 | 9891358426\n💌 DM for orders!";
const VANDANA_URL = "https://www.indiamart.com/vandanacreation-delhi/profile.html";

function chromeJS(js) {
  const script = `tell application "Google Chrome"
  repeat with w in every window
    repeat with t in every tab of w
      if URL of t contains "instagram.com" then
        tell t to execute javascript ${JSON.stringify(js)}
        return result as string
      end if
    end repeat
  end repeat
  return "NO_TAB"
end tell`;
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
  } catch (e) {
    return "ERR: " + e.message.slice(0, 80);
  }
}

function osa(script) {
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
  } catch (e) {
    return "ERR:" + e.message.slice(0, 60);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pbcopy(text) {
  spawnSync("pbcopy", [], { input: text, encoding: "utf8" });
}

async function applyBio(bio, website, label) {
  console.log("\n🔄 Applying bio for " + label);

  // Navigate to edit page
  chromeJS("window.location.href = 'https://www.instagram.com/accounts/edit/'");
  await sleep(4500);

  // Check form loaded
  const formOk = chromeJS(
    "(function(){" +
    "var ta=Array.from(document.querySelectorAll('textarea')).find(function(t){return t.placeholder==='Bio';});" +
    "return ta ? 'FOUND:'+ta.value.slice(0,30) : 'NOT_FOUND';" +
    "})()"
  );
  console.log("  Form:", formOk);
  if (formOk === "NOT_FOUND") { console.log("  ❌ Edit form not found"); return false; }

  // ── Bio field ──
  // 1. Focus via JS
  chromeJS(
    "(function(){" +
    "var ta=Array.from(document.querySelectorAll('textarea')).find(function(t){return t.placeholder==='Bio';});" +
    "if(ta){ta.focus();ta.click();}" +
    "})()"
  );
  await sleep(400);
  // 2. Bring Chrome to front
  osa("tell application \"Google Chrome\" to activate");
  await sleep(300);
  // 3. Select all text in field
  osa("tell application \"System Events\" to keystroke \"a\" using command down");
  await sleep(200);
  // 4. Paste new bio
  pbcopy(bio);
  osa("tell application \"System Events\" to keystroke \"v\" using command down");
  await sleep(700);

  const bioVal = chromeJS(
    "(function(){" +
    "var ta=Array.from(document.querySelectorAll('textarea')).find(function(t){return t.placeholder==='Bio';});" +
    "return ta?ta.value.slice(0,60):'NOT_FOUND';" +
    "})()"
  );
  console.log("  Bio value:", bioVal);

  // ── Website field ──
  // 1. Focus via JS
  chromeJS(
    "(function(){" +
    "var inp=Array.from(document.querySelectorAll('input')).find(function(i){return i.placeholder==='Website';});" +
    "if(inp){inp.focus();inp.click();inp.select();}" +
    "})()"
  );
  await sleep(400);
  osa("tell application \"Google Chrome\" to activate");
  await sleep(300);
  osa("tell application \"System Events\" to keystroke \"a\" using command down");
  await sleep(200);
  pbcopy(website);
  osa("tell application \"System Events\" to keystroke \"v\" using command down");
  await sleep(700);

  const webVal = chromeJS(
    "(function(){" +
    "var inp=Array.from(document.querySelectorAll('input')).find(function(i){return i.placeholder==='Website';});" +
    "return inp?inp.value:'NOT_FOUND';" +
    "})()"
  );
  console.log("  Website value:", webVal);

  // ── Submit ──
  await sleep(400);
  // Try JS click first
  chromeJS(
    "(function(){" +
    "var btn=Array.from(document.querySelectorAll('button,[role=button]')).find(function(b){" +
    "var t=(b.innerText||b.textContent||'').trim();" +
    "return t==='Submit'||t==='Save'||t==='Done';});" +
    "if(btn)btn.click();" +
    "})()"
  );
  // Also press Enter as fallback
  await sleep(300);
  osa("tell application \"System Events\" to key code 36");
  await sleep(3500);

  // Verify on profile page
  const profileUrl = label.includes("deepans") ? "deepans.designstudio" : "vandanacreation09";
  chromeJS("window.location.href = 'https://www.instagram.com/" + profileUrl + "/'");
  await sleep(4000);
  const profileText = chromeJS("document.body.innerText.slice(0, 350)");
  console.log("\n  Profile now:\n  " + profileText.split("\n").slice(0, 10).join("\n  "));

  const updated = profileText.includes("Since 2013") && !profileText.includes("Signature Solutions") ||
                  profileText.includes("Deepanshu Design Studio") && profileText.includes("Reels");
  return updated;
}

(async () => {
  console.log("Character counts:");
  console.log("  @deepans.designstudio:", [...DEEPANS_BIO].length, "chars");
  console.log("  @vandanacreation09:", [...VANDANA_BIO].length, "chars");

  // ── vandanacreation09 (currently logged in Chrome) ──
  const v = await applyBio(VANDANA_BIO, VANDANA_URL, "@vandanacreation09");
  await sleep(2000);

  console.log("\n═══════════════════════════");
  console.log("@vandanacreation09:", v ? "✅ Updated" : "⚠️  Check manually");
  console.log("\nNOTE: @deepans.designstudio needs Chrome to be logged into that account.");
  console.log("Chrome is currently logged in as vandanacreation09 (ds_user_id=53411247633).");
  console.log("Please switch Chrome to deepans.designstudio account and the script will apply there too.");
})();
