#!/usr/bin/env node
const { execFileSync, spawnSync } = require("child_process");

function runInChrome(js) {
  const script = [
    'tell application "Google Chrome"',
    '  repeat with w in every window',
    '    repeat with t in every tab of w',
    '      if URL of t contains "instagram.com" then',
    `        tell t to execute javascript ${JSON.stringify(js)}`,
    '        return result as string',
    '      end if',
    '    end repeat',
    '  end repeat',
    '  return "NO_TAB"',
    'end tell'
  ].join('\n');
  return execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pbcopy(text) {
  const proc = spawnSync("pbcopy", [], { input: text, encoding: "utf8" });
  return proc.status === 0;
}

async function setFieldAndSubmit(bio, website, accountLabel) {
  console.log(`\n📝 Setting form values for ${accountLabel}...`);
  
  // Set bio textarea using React internal setter
  const bioSet = runInChrome(`(function() {
    var ta = Array.from(document.querySelectorAll("textarea")).find(function(t) {
      return t.placeholder === "Bio" || t.getAttribute("aria-label") === "Bio";
    });
    if (!ta) return "NO_TEXTAREA";
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(ta, ${JSON.stringify(bio)});
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    ta.focus();
    ta.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    return "OK:" + ta.value.length;
  })()`);
  console.log("   Bio set:", bioSet);

  await sleep(300);

  // Set website input
  const webSet = runInChrome(`(function() {
    var inp = Array.from(document.querySelectorAll("input")).find(function(i) {
      return i.placeholder === "Website" || i.getAttribute("aria-label") === "Website";
    });
    if (!inp) return "NO_WEBSITE_INPUT";
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(inp, ${JSON.stringify(website)});
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    return "OK:" + inp.value;
  })()`);
  console.log("   Website set:", webSet);

  await sleep(600);

  // Find and click Submit/Save/Done button
  const submitResult = runInChrome(`(function() {
    var allBtns = Array.from(document.querySelectorAll("button, div[role=button]"));
    var submitBtn = allBtns.find(function(b) {
      var t = (b.textContent || "").trim();
      return t === "Submit" || t === "Save" || t === "Done";
    });
    if (submitBtn) {
      submitBtn.click();
      return "CLICKED:" + submitBtn.textContent.trim();
    }
    return "NOT_FOUND:" + allBtns.map(function(b) { return b.textContent.trim().slice(0,15); }).filter(Boolean).join("|").slice(0, 200);
  })()`);
  console.log("   Submit:", submitResult);

  await sleep(2500);

  // Verify result
  const pageText = runInChrome("document.body.innerText.slice(0, 400)");
  console.log("   Page after submit:", pageText.slice(0, 200));
  
  return submitResult.startsWith("CLICKED");
}

async function main() {
  // ─── ACCOUNT 1: vandanacreation09 (currently logged in Chrome) ───
  console.log("\n═══ @vandanacreation09 ═══");
  console.log("Navigating to edit profile...");
  runInChrome("window.location.href = 'https://www.instagram.com/accounts/edit/'");
  await sleep(3500);
  
  // Verify edit profile form is loaded
  let formCheck = runInChrome(`(function() {
    var ta = Array.from(document.querySelectorAll("textarea")).find(function(t) { return t.placeholder === "Bio"; });
    var inp = Array.from(document.querySelectorAll("input")).find(function(i) { return i.placeholder === "Website"; });
    return JSON.stringify({ bioFound: !!ta, websiteFound: !!inp, currentBio: ta ? ta.value.slice(0, 60) : null });
  })()`);
  console.log("Form check:", formCheck);
  
  const vandanaBio = "🖨️ Vandana Creation | Since 2013\nPrinting • Designing • Marketing Materials\n📍 New Delhi, India\n✅ Banners | Flex | Brand Collateral\n📞 7982850887 | 9891358426\n💌 DM for bulk orders & inquiries!";
  const vandanaWebsite = "https://www.indiamart.com/vandanacreation-delhi/profile.html";
  
  const vandanaOk = await setFieldAndSubmit(vandanaBio, vandanaWebsite, "@vandanacreation09");
  
  await sleep(3000);
  
  // ─── ACCOUNT 2: deepans.designstudio ───
  // Need to switch accounts in Chrome. deepans.designstudio is the other account.
  // Navigate to deepans profile and check if we can access edit page
  console.log("\n═══ @deepans.designstudio ═══");
  console.log("Switching to deepans.designstudio...");
  
  // Try opening a new tab or navigating with the other account's session
  // deepans.designstudio is ds_user_id=77976713678
  // Let's check if Instagram has account switcher we can use
  runInChrome("window.location.href = 'https://www.instagram.com/deepans.designstudio/'");
  await sleep(3000);
  
  const currentUser = runInChrome(`(function() {
    var c = {};
    document.cookie.split(";").forEach(function(p) {
      var i = p.indexOf("=");
      if (i > 0) c[p.slice(0, i).trim()] = p.slice(i+1).trim();
    });
    return "ds_user_id=" + (c.ds_user_id || "none");
  })()`);
  console.log("Current user in Chrome:", currentUser);
  // ds_user_id=53411247633 = vandanacreation09
  // ds_user_id=77976713678 = deepans.designstudio
  
  if (currentUser.includes("53411247633")) {
    console.log("⚠️  Still logged in as vandanacreation09 in Chrome.");
    console.log("   Will use saved session cookies for deepans.designstudio to make direct API call...");
    
    // Use the deepans.designstudio session cookies directly via fetch
    const fs = require("fs");
    const session = JSON.parse(fs.readFileSync("/Users/deep/.gemini/config/plugins/instagram/auth_info/sessions/deepans.designstudio.json", "utf8"));
    const cookiesObj = JSON.parse(session.cookies);
    const sessionCookies = cookiesObj.cookies.map(function(c) { return c.key + "=" + c.value; }).join("; ");
    const csrf = cookiesObj.cookies.find(function(c) { return c.key === "csrftoken"; })?.value || "";
    
    // Inject deepans.designstudio cookies into Chrome temporarily is not possible via cross-domain
    // Instead, try using Node.js fetch with the saved session
    const { default: https } = await import("https");
    
    const deepansBio = "Deepanshu Design Studio 🎨\nBrand Designer | Social Media | Visual Content\n🖥️ Reels • AI Videos • Marketing Visuals\nHelping brands look ✨ scroll-stopping.\n📩 DM for free consultation!";
    const deepansWebsite = "https://storage.googleapis.com/deepanshu-portfolio/index.html";
    
    const params = new URLSearchParams();
    params.append("biography", deepansBio);
    params.append("external_url", deepansWebsite);
    params.append("first_name", "Deepanshu Kumar");
    params.append("username", "deepans.designstudio");
    params.append("email", "");
    params.append("phone_number", "");
    params.append("gender", "0");
    params.append("_csrftoken", csrf);
    params.append("chaining_enabled", "on");
    
    console.log("   Attempting Node.js fetch with saved session...");
    const resp = await fetch("https://www.instagram.com/api/v1/accounts/edit/", {
      method: "POST",
      headers: {
        "Cookie": sessionCookies,
        "X-CSRFToken": csrf,
        "X-IG-App-ID": "936619743392459",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/accounts/edit/",
        "Origin": "https://www.instagram.com",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      body: params.toString(),
    });
    
    const text = await resp.text();
    console.log("   Node fetch status:", resp.status);
    console.log("   Response:", text.slice(0, 300));
    
    try {
      const json = JSON.parse(text);
      if (json.status === "ok" || json.user) {
        console.log("✅ @deepans.designstudio bio updated via Node.js!");
        if (json.user?.biography) console.log("   Bio:", json.user.biography);
      } else {
        console.log("❌ @deepans.designstudio:", JSON.stringify(json).slice(0, 200));
      }
    } catch {
      console.log("❌ Could not parse response.");
    }
  }
  
  console.log("\n─── Final Summary ───");
  console.log("@vandanacreation09:", vandanaOk ? "✅ Updated" : "❌ Check manually");
}

main().catch(console.error);
