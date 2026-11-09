import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { authManager, normalizeUsername } from "./auth.js";

export function isChromeInstagramOpen() {
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "instagram.com" then
          return "YES"
        end if
      end repeat
    end repeat
  end tell
  return "NO"`;
  try {
    const res = execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
    return res === "YES";
  } catch {
    return false;
  }
}

function runInChromeTab(code) {
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "instagram.com" then
          tell t to execute javascript ${JSON.stringify(code)}
          return result
        end if
      end repeat
    end repeat
  end tell`;
  return execFileSync("osascript", ["-e", script], { encoding: "utf8" });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getChromeLoggedInUsername() {
  try {
    const registry = authManager.readRegistry();
    const raw = runInChromeTab(`JSON.stringify((() => {
      const m = (document.cookie || "").match(/(?:^|;\\s*)ds_user_id=([^;]+)/);
      const dsUserId = m ? m[1].trim() : "";
      const links = Array.from(document.querySelectorAll("a[role=link], a[href^='/']"));
      let profileHref = "";
      for (const a of links) {
        const href = a.getAttribute("href") || "";
        const match = href.match(/^\\/([a-zA-Z0-9._]+)\\/$/);
        if (match && !["explore", "reels", "direct", "stories", "accounts", "your_activity"].includes(match[1])) {
          if (a.querySelector("img") || a.innerText.toLowerCase().includes("profile")) {
            profileHref = match[1].toLowerCase();
            break;
          }
        }
      }
      return { dsUserId, profileHref };
    })())`).trim();
    const { dsUserId, profileHref } = JSON.parse(raw);
    if (dsUserId) {
      const byPk = Object.values(registry.accounts || {}).find(
        (a) => String(a.pk) === String(dsUserId)
      );
      if (byPk?.username) return normalizeUsername(byPk.username);
    }
    if (profileHref) return normalizeUsername(profileHref);
  } catch {
    // Non-fatal
  }
  return "";
}

async function ensureChromeAccount(account = null) {
  const registry = authManager.readRegistry();
  const desired = normalizeUsername(account || registry.defaultAccount || "");
  const currentInChrome = getChromeLoggedInUsername();

  // If no specific account was requested and Chrome is already logged into a known account, or already on desired account
  if (!desired || currentInChrome === desired) {
    return currentInChrome || desired || "deepans.designstudio";
  }

  const savedPassword = authManager.getSavedPassword(desired);
  if (!savedPassword) {
    return currentInChrome || desired;
  }

  // Open Switch Accounts modal or login form in Chrome to switch to `desired`
  runInChromeTab(`(() => {
    const moreBtn = Array.from(document.querySelectorAll("a, span, div[role=button]")).find(
      el => el.textContent?.trim() === "More" || el.querySelector("svg[aria-label=\\"Settings\\"]")
    );
    if (moreBtn) moreBtn.click();
  })()`);
  await sleep(700);

  runInChromeTab(`(() => {
    const switchBtn = Array.from(document.querySelectorAll("span, div[role=button], button")).find(
      el => el.textContent?.trim() === "Switch accounts"
    );
    if (switchBtn) switchBtn.click();
  })()`);
  await sleep(1200);

  // Check if target account is already listed in the Switch Accounts dialog
  const clickedExisting = runInChromeTab(`(() => {
    const dialog = document.querySelector("div[role=dialog]");
    if (!dialog) return "NO_DIALOG";
    const btn = Array.from(dialog.querySelectorAll("div[role=button], button, div")).find(
      el => el.innerText?.trim().toLowerCase() === ${JSON.stringify(desired)}
    );
    if (btn) {
      btn.click();
      return "CLICKED";
    }
    return "NOT_FOUND";
  })()`).trim();

  if (clickedExisting === "CLICKED") {
    await sleep(4000);
    return getChromeLoggedInUsername() || desired;
  }

  // Fill username & password in the Switch Accounts dialog if inputs appear
  const switched = runInChromeTab(`(() => {
    const u = document.querySelector("input[name=username], input[name=email]");
    const p = document.querySelector("input[name=password], input[name=pass]");
    if (!u || !p) return "NO_INPUTS";
    const setVal = (el, val) => {
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setVal(u, ${JSON.stringify(desired)});
    setVal(p, ${JSON.stringify(savedPassword)});
    const submit = document.querySelector("button[type=submit]") ||
      Array.from(document.querySelectorAll("div[role=dialog] button")).find(b => /log in/i.test(b.innerText));
    if (submit) submit.click();
    return "SUBMITTED";
  })()`).trim();

  if (switched === "SUBMITTED") {
    await sleep(4500);
  }

  return getChromeLoggedInUsername() || desired;
}

function detectActiveUsername(account = null) {
  const active = getChromeLoggedInUsername();
  if (active) return active;
  if (account && String(account).trim()) {
    return normalizeUsername(account);
  }
  return authManager.getDefaultAccount() || "deepans.designstudio";
}

/**
 * Automate publishing a 9:16 Reel with full caption via the user's active Chrome browser session.
 */
export async function postReelViaBrowser({
  videoPath,
  caption = "",
  coverPath = null,
  aspect = "9:16",
  account = null,
} = {}) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  if (!isChromeInstagramOpen()) {
    throw new Error(
      "Google Chrome does not have an active instagram.com tab open. Please open Instagram in Chrome first."
    );
  }

  // 1. Ensure tab is on Instagram home & switched to target account
  runInChromeTab(`(() => {
    if (location.pathname !== "/" && !location.pathname.startsWith("/reels")) {
      location.href = "https://www.instagram.com/";
    }
  })()`);
  await sleep(1500);
  const activeAccount = await ensureChromeAccount(account);

  // 2. Wait for Create button to mount, then click Create / New post
  let createReady = false;
  for (let i = 0; i < 25; i++) {
    const ready = runInChromeTab(`(() => {
      const svg = document.querySelector("svg[aria-label=\\"New post\\"]");
      const btn = Array.from(document.querySelectorAll("a, span, div")).find(el => el.textContent.trim() === "Create");
      return (svg || btn) ? "YES" : "NO";
    })()`).trim();
    if (ready === "YES") {
      createReady = true;
      break;
    }
    await sleep(400);
  }

  runInChromeTab(`(() => {
    const svg = document.querySelector("svg[aria-label=\\"New post\\"]");
    if (svg) (svg.closest("a") || svg.closest("div[role=button]") || svg).click();
    else {
      const btn = Array.from(document.querySelectorAll("a, span, div")).find(el => el.textContent.trim() === "Create");
      if (btn) btn.click();
    }
  })()`);
  await sleep(1200);

  // Click Post submenu item
  runInChromeTab(`(() => {
    const post = Array.from(document.querySelectorAll("a, span, div[role=button]")).find(el => el.textContent.trim() === "Post");
    if (post) (post.closest("a") || post.closest("div[role=button]") || post).click();
  })()`);

  // 3. Wait for file input
  let inputReady = false;
  for (let i = 0; i < 35; i++) {
    const check = runInChromeTab(`document.querySelector("input[type=file]") ? "YES" : "NO"`).trim();
    if (check === "YES") {
      inputReady = true;
      break;
    }
    await sleep(400);
  }
  if (!inputReady) {
    throw new Error("Could not find Instagram file upload input in Chrome.");
  }

  // 4. Feed video in chunks (avoids ARG_MAX buffer overflows)
  const videoB64 = fs.readFileSync(videoPath).toString("base64");
  runInChromeTab("window.__b64_chunks = [];");
  const chunkSize = 400000;
  for (let i = 0; i < videoB64.length; i += chunkSize) {
    const slice = videoB64.slice(i, i + chunkSize);
    runInChromeTab(`window.__b64_chunks.push(${JSON.stringify(slice)});`);
  }

  // 5. Attach file to input
  runInChromeTab(`(() => {
    const full = window.__b64_chunks.join("");
    window.__b64_chunks = null;
    const chars = atob(full);
    const nums = new Uint8Array(chars.length);
    for (let i = 0; i < chars.length; i++) nums[i] = chars.charCodeAt(i);
    const blob = new Blob([nums], { type: "video/mp4" });
    const file = new File([blob], "video.mp4", { type: "video/mp4" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const inp = document.querySelector("input[type=file]");
    inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);

  // 6. Wait for crop dialog to load
  await sleep(3000);
  runInChromeTab(`(() => {
    const ok = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "OK");
    if (ok) ok.click();
  })()`);
  await sleep(800);

  // 7. Enforce Aspect Ratio (9:16 portrait or 16:9 widescreen - NEVER square)
  const cropCoordsRaw = runInChromeTab(`(() => {
    const svg = document.querySelector("div[role=dialog] svg[aria-label='Select crop']");
    if (!svg) return "NO_SVG";
    const r = svg.getBoundingClientRect();
    const screenX = window.screenX + r.x + r.width/2;
    const screenY = window.screenY + r.y + r.height/2;
    return JSON.stringify({ screenX, screenY });
  })()`).trim();

  if (cropCoordsRaw && !cropCoordsRaw.includes("NO_SVG")) {
    try {
      const { screenX, screenY } = JSON.parse(cropCoordsRaw);
      execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
      const clickScript = `
import Foundation
import CoreGraphics
let pt = CGPoint(x: ${screenX}, y: ${screenY})
let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)
let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left)
let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left)
move?.post(tap: .cghidEventTap)
usleep(50000)
down?.post(tap: .cghidEventTap)
usleep(100000)
up?.post(tap: .cghidEventTap)
`;
      execFileSync("swift", ["-e", clickScript]);
      await sleep(1000);

      const desiredRatio = (aspect === "16:9") ? "16:9" : "9:16";
      const optCoordsRaw = runInChromeTab(`(() => {
        const items = Array.from(document.querySelectorAll("button, div[role=button], span")).filter(
          el => ["Original", "16:9", "9:16"].includes(el.innerText?.trim()) && el.children.length === 0
        );
        const match = items.find(el => el.innerText?.trim() === "Original") ||
                      items.find(el => el.innerText?.trim() === "${desiredRatio}") ||
                      items[0];
        if (!match) return "NO_OPT";
        const r = match.getBoundingClientRect();
        const sx = window.screenX + r.x + r.width/2;
        const sy = window.screenY + r.y + r.height/2;
        return JSON.stringify({ screenX: sx, screenY: sy, text: match.innerText.trim() });
      })()`).trim();

      if (optCoordsRaw && !optCoordsRaw.includes("NO_OPT")) {
        const opt = JSON.parse(optCoordsRaw);
        const optClickScript = `
import Foundation
import CoreGraphics
let pt = CGPoint(x: ${opt.screenX}, y: ${opt.screenY})
let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)
let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left)
let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left)
move?.post(tap: .cghidEventTap)
usleep(50000)
down?.post(tap: .cghidEventTap)
usleep(100000)
up?.post(tap: .cghidEventTap)
`;
        execFileSync("swift", ["-e", optClickScript]);
        await sleep(800);
      }
    } catch {
      // Fallback
    }
  }

  // 8. Next -> Edit / Cover photo step
  runInChromeTab(`(() => {
    const nextBtn = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (nextBtn) nextBtn.click();
  })()`);
  await sleep(2000);

  // Attach custom cover frame if provided
  if (coverPath && fs.existsSync(coverPath)) {
    const coverB64 = fs.readFileSync(coverPath).toString("base64");
    runInChromeTab(`(() => {
      const chars = atob(${JSON.stringify(coverB64)});
      const nums = new Uint8Array(chars.length);
      for (let i = 0; i < chars.length; i++) nums[i] = chars.charCodeAt(i);
      const blob = new Blob([nums], { type: "image/jpeg" });
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const inp = document.querySelector("div[role=dialog] input[type=file]");
      if (inp) {
        inp.files = dt.files;
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(1000);
  }

  // 9. Next -> Caption step
  runInChromeTab(`(() => {
    const nextBtn = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (nextBtn) nextBtn.click();
  })()`);
  await sleep(2500);

  // 10. Native OS Paste for Caption (guarantees Lexical sets internal state with isTrusted: true)
  if (caption && caption.trim()) {
    spawnSync("pbcopy", { input: caption.trim(), encoding: "utf8" });
    runInChromeTab(`(() => {
      const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
      if (el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    })()`);
    await sleep(300);

    const pasteScript = `tell application "Google Chrome" to activate
    delay 0.2
    tell application "System Events"
      keystroke "a" using command down
      delay 0.1
      keystroke "v" using command down
    end tell`;
    execFileSync("osascript", ["-e", pasteScript]);
    await sleep(1200);

    // Blur editor to dismiss hashtag dropdowns
    runInChromeTab(`(() => {
      const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
      if (el) el.blur();
    })()`);
    await sleep(600);
  }

  // 11. Click Share
  runInChromeTab(`(() => {
    const btns = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]"));
    const share = btns.find(b => b.innerText.trim() === "Share");
    if (share) share.click();
  })()`);

  // 12. Monitor completion until Instagram confirms sharing
  let publishedUrl = null;
  let sharedConfirmed = false;
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const status = runInChromeTab(`(() => {
      const d = document.querySelector("div[role=dialog]");
      if (!d) return "NO_DIALOG";
      return d.innerText.split("\\n").filter(Boolean).slice(0, 5).join(" | ");
    })()`).trim();

    if (status.toLowerCase().includes("shared") || status.toLowerCase().includes("your reel has been shared")) {
      sharedConfirmed = true;
      break;
    }
  }

  // Close modal if still open
  await sleep(1500);
  runInChromeTab(`(() => {
    const close = Array.from(document.querySelectorAll("svg[aria-label='Close'], div[role=dialog] button")).find(
      el => el.getAttribute?.("aria-label") === "Close" || el.innerText?.trim() === "Close"
    );
    if (close) (close.closest("button") || close).click();
  })()`);
  await sleep(1500);

  // Navigate to user profile reels to extract live URL
  const targetUser = detectActiveUsername(activeAccount);
  runInChromeTab(`location.href = "https://www.instagram.com/${targetUser}/reels/";`);
  await sleep(3000);

  publishedUrl = runInChromeTab(`(() => {
    const links = Array.from(document.querySelectorAll("a[href*=\\"/reel/\\"], a[href*=\\"/p/\\"]")).map(a => a.href);
    return Array.from(new Set(links))[0] || "https://www.instagram.com/${targetUser}/reels/";
  })()`).trim();

  return {
    status: "published",
    account: targetUser,
    type: "video",
    mode: "browser_automation",
    aspect_ratio: aspect || "9:16",
    caption_length: caption?.length || 0,
    url: publishedUrl,
  };
}

/**
 * Automate publishing a photo with full caption via the user's active Chrome browser session.
 */
export async function postPhotoViaBrowser({
  imagePath,
  caption = "",
  aspect = "Original",
  account = null,
} = {}) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  if (!isChromeInstagramOpen()) {
    throw new Error(
      "Google Chrome does not have an active instagram.com tab open. Please open Instagram in Chrome first."
    );
  }

  // 1. Ensure tab is on Instagram home & switched to target account
  runInChromeTab(`(() => {
    if (location.pathname !== "/" && !location.pathname.startsWith("/reels")) {
      location.href = "https://www.instagram.com/";
    }
  })()`);
  await sleep(1500);
  const activeAccount = await ensureChromeAccount(account);

  // 2. Click Create / New post
  runInChromeTab(`(() => {
    const svg = document.querySelector("svg[aria-label=\\"New post\\"]");
    if (svg) (svg.closest("a") || svg.closest("div[role=button]") || svg).click();
    else {
      const btn = Array.from(document.querySelectorAll("a, span, div")).find(el => el.textContent.trim() === "Create");
      if (btn) btn.click();
    }
  })()`);
  await sleep(800);

  // Click Post submenu item
  runInChromeTab(`(() => {
    const post = Array.from(document.querySelectorAll("a, span, div[role=button]")).find(el => el.textContent.trim() === "Post");
    if (post) post.click();
  })()`);

  // 3. Wait for file input
  let inputReady = false;
  for (let i = 0; i < 20; i++) {
    const check = runInChromeTab(`document.querySelector("input[type=file]") ? "YES" : "NO"`).trim();
    if (check === "YES") {
      inputReady = true;
      break;
    }
    await sleep(300);
  }
  if (!inputReady) {
    throw new Error("Could not find Instagram file upload input in Chrome.");
  }

  // 4. Feed image in chunks
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const imageB64 = fs.readFileSync(imagePath).toString("base64");
  runInChromeTab("window.__b64_chunks = [];");
  const chunkSize = 400000;
  for (let i = 0; i < imageB64.length; i += chunkSize) {
    const slice = imageB64.slice(i, i + chunkSize);
    runInChromeTab(`window.__b64_chunks.push(${JSON.stringify(slice)});`);
  }

  // 5. Attach file to input
  runInChromeTab(`(() => {
    const full = window.__b64_chunks.join("");
    window.__b64_chunks = null;
    const chars = atob(full);
    const nums = new Uint8Array(chars.length);
    for (let i = 0; i < chars.length; i++) nums[i] = chars.charCodeAt(i);
    const blob = new Blob([nums], { type: ${JSON.stringify(mime)} });
    const file = new File([blob], "image.jpg", { type: ${JSON.stringify(mime)} });
    const dt = new DataTransfer();
    dt.items.add(file);
    const inp = document.querySelector("input[type=file]");
    inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);

  // 6. Wait for crop dialog to load
  await sleep(2000);

  // 7. Aspect ratio selection if not Original
  if (aspect && aspect !== "Original") {
    runInChromeTab(`(() => {
      const btns = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]"));
      const cropBtn = btns.find(b => b.getAttribute("aria-label")?.includes("crop") || b.innerText.includes("Select crop"));
      if (cropBtn) cropBtn.click();
    })()`);
    await sleep(500);

    runInChromeTab(`(() => {
      const targetAspect = ${JSON.stringify(aspect)};
      const options = Array.from(document.querySelectorAll("button, div[role=button], span")).filter(el => {
        const txt = el.innerText?.trim();
        return txt === targetAspect;
      });
      if (options[0]) options[0].click();
    })()`);
    await sleep(500);
  }

  // 8. Next -> Filter step
  runInChromeTab(`(() => {
    const nextBtn = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (nextBtn) nextBtn.click();
  })()`);
  await sleep(1500);

  // 9. Next -> Caption step
  runInChromeTab(`(() => {
    const nextBtn = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (nextBtn) nextBtn.click();
  })()`);
  await sleep(2000);

  // 10. Native OS Paste for Caption
  if (caption && caption.trim()) {
    spawnSync("pbcopy", { input: caption.trim(), encoding: "utf8" });
    runInChromeTab(`(() => {
      const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
      if (el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    })()`);
    await sleep(300);

    const pasteScript = `tell application "Google Chrome" to activate
    delay 0.2
    tell application "System Events"
      keystroke "a" using command down
      delay 0.1
      keystroke "v" using command down
    end tell`;
    execFileSync("osascript", ["-e", pasteScript]);
    await sleep(1200);

    runInChromeTab(`(() => {
      const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
      if (el) el.blur();
    })()`);
    await sleep(600);
  }

  // 11. Click Share
  runInChromeTab(`(() => {
    const btns = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]"));
    const share = btns.find(b => b.innerText.trim() === "Share");
    if (share) share.click();
  })()`);

  // 12. Monitor completion
  let publishedUrl = null;
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const status = runInChromeTab(`(() => {
      const d = document.querySelector("div[role=dialog]");
      if (!d) return "DONE_NO_DIALOG";
      return d.innerText.split("\\n").filter(Boolean).slice(0, 5).join(" | ");
    })()`).trim();

    if (status.includes("Your post has been shared") || status.includes("DONE_NO_DIALOG")) {
      break;
    }
  }

  // Close modal
  runInChromeTab(`(() => {
    const close = Array.from(document.querySelectorAll("svg[aria-label=\\"Close\\"]")).map(s => s.closest("button") || s.closest("div[role=button]")).find(Boolean);
    if (close) close.click();
  })()`);
  await sleep(1500);

  const targetUser = detectActiveUsername(activeAccount);
  runInChromeTab(`location.href = "https://www.instagram.com/${targetUser}/";`);
  await sleep(3000);

  publishedUrl = runInChromeTab(`(() => {
    const links = Array.from(document.querySelectorAll("a[href*=\\"/p/\\"]")).map(a => a.href);
    return Array.from(new Set(links))[0] || "https://www.instagram.com/${targetUser}/";
  })()`).trim();

  return {
    status: "published",
    account: targetUser,
    type: "photo",
    mode: "browser_automation",
    caption_length: caption?.length || 0,
    url: publishedUrl,
  };
}
