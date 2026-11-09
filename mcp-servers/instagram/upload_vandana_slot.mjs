import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

export function runInChromeTab(code) {
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

export function activateChrome() {
  execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function uploadReelToVandana({
  videoPath,
  caption,
  expectedRatioType = "portrait" // "portrait" (9:16) or "widescreen" (16:9)
}) {
  console.log(`\n======================================================`);
  console.log(`[UPLOAD] Starting upload for: ${videoPath}`);
  console.log(`[UPLOAD] Expected Aspect Ratio Type: ${expectedRatioType}`);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file does not exist: ${videoPath}`);
  }

  // 1. Go to Instagram Home
  console.log("[1/9] Navigating to Instagram home...");
  runInChromeTab("location.href = 'https://www.instagram.com/';");
  await sleep(3000);

  // 2. Open Create -> Post
  console.log("[2/9] Opening Create -> Post...");
  runInChromeTab(`(() => {
    const svg = document.querySelector("svg[aria-label=\\"New post\\"]");
    if (svg) (svg.closest("a") || svg.closest("div[role=button]") || svg).click();
    else {
      const btn = Array.from(document.querySelectorAll("a, span, div")).find(el => el.textContent.trim() === "Create");
      if (btn) btn.click();
    }
  })()`);
  await sleep(1200);

  runInChromeTab(`(() => {
    const post = Array.from(document.querySelectorAll("a, span, div[role=button]")).find(el => el.textContent.trim() === "Post");
    if (post) (post.closest("a") || post.closest("div[role=button]") || post).click();
  })()`);
  await sleep(1500);

  // 3. Inject Video file
  console.log("[3/9] Injecting video file chunks...");
  const videoB64 = fs.readFileSync(videoPath).toString("base64");
  runInChromeTab("window.__b64_chunks = [];");
  const chunkSize = 400000;
  for (let i = 0; i < videoB64.length; i += chunkSize) {
    runInChromeTab("window.__b64_chunks.push(" + JSON.stringify(videoB64.slice(i, i + chunkSize)) + ");");
  }

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
  console.log("[4/9] Video injected, waiting for preview mount...");
  await sleep(5000);

  // Dismiss Reels OK if present
  runInChromeTab(`(() => {
    const ok = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "OK");
    if (ok) ok.click();
  })()`);
  await sleep(1000);

  // 4. Select Crop -> Original
  console.log("[5/9] Selecting Original aspect ratio via synthetic pointer events...");
  runInChromeTab(`(() => {
    const svg = document.querySelector("svg[aria-label=\\"Select crop\\"]");
    const btn = svg ? (svg.closest("button") || svg) : null;
    if (btn) {
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      btn.click();
    }
  })()`);
  await sleep(1200);

  runInChromeTab(`(() => {
    const el = Array.from(document.querySelectorAll("button, span, div")).find(el => el.innerText?.trim() === "Original" && el.children.length === 0);
    if (el) {
      const target = el.closest("button") || el.closest("div[role=button]") || el.parentElement;
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      target.click();
    }
  })()`);
  await sleep(1500);

  // 5. PROGRAMMATIC RATIO GATE
  const ratioDataRaw = runInChromeTab(`(() => {
    const v = document.querySelector("div[role=dialog] video");
    if (!v) return JSON.stringify({ error: "NO_VIDEO" });
    const r = v.getBoundingClientRect();
    return JSON.stringify({
      width: r.width,
      height: r.height,
      ratio: (r.width / r.height).toFixed(2)
    });
  })()`).trim();
  const ratioData = JSON.parse(ratioDataRaw);
  console.log(`[GATE CHECK] Live Aspect Ratio Data:`, ratioData);

  if (ratioData.error || ratioData.ratio === "1.00") {
    throw new Error(`CRITICAL ABORT: Video is still in 1:1 Square crop (${ratioData.ratio})! Halting upload!`);
  }

  if (expectedRatioType === "portrait" && parseFloat(ratioData.ratio) > 0.8) {
    throw new Error(`CRITICAL ABORT: Expected 9:16 portrait (~0.56) but got ratio ${ratioData.ratio}! Halting!`);
  }

  if (expectedRatioType === "widescreen" && parseFloat(ratioData.ratio) < 1.3) {
    throw new Error(`CRITICAL ABORT: Expected 16:9 widescreen (~1.78) but got ratio ${ratioData.ratio}! Halting!`);
  }

  console.log(`[GATE PASSED] Aspect ratio passed gate (Ratio: ${ratioData.ratio}, non-square)!`);

  // 6. Next -> Edit
  console.log("[6/9] Clicking Next 1...");
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2000);

  // 7. Next -> Caption screen
  console.log("[7/9] Clicking Next 2...");
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2500);

  // 8. Native OS Paste for Caption with RETRIES (guarantees Lexical sets internal state with isTrusted: true)
  if (caption && caption.trim()) {
    console.log("[8/9] Injecting caption into Lexical editor via native macOS clipboard paste...");
    let verified = false;
    let finalCount = 0;

    for (let attempt = 1; attempt <= 4; attempt++) {
      spawnSync("pbcopy", { input: caption.trim() + "\n", encoding: "utf8" });
      
      runInChromeTab(`(() => {
        const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
        if (el) {
          el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      })()`);
      await sleep(500);

      const pasteScript = `tell application "Google Chrome" to activate
      delay 0.4
      tell application "System Events"
        keystroke "a" using command down
        delay 0.15
        keystroke "v" using command down
      end tell`;
      execFileSync("osascript", ["-e", pasteScript]);
      await sleep(1500);

      // Blur editor to commit Lexical AST and dismiss hashtag dropdowns
      runInChromeTab(`(() => {
        const el = document.querySelector("div[role=dialog] div[contenteditable=true]");
        if (el) el.blur();
      })()`);
      await sleep(800);

      // Verify counter
      const statusRaw = runInChromeTab(`(() => {
        const dialog = document.querySelector("div[role=dialog]");
        if (!dialog) return JSON.stringify({ error: "NO_DIALOG" });
        const text = dialog.innerText || "";
        const m = text.match(/(\\d+)\\/2,200/);
        return JSON.stringify({
          counter: m ? parseInt(m[1], 10) : 0
        });
      })()`).trim();
      const status = JSON.parse(statusRaw);
      console.log(`[CAPTION CHECK] Attempt ${attempt}: registered ${status.counter}/2,200 characters.`);

      if (status.counter >= 50) {
        verified = true;
        finalCount = status.counter;
        console.log(`[CAPTION VERIFIED] Native paste successfully verified (${finalCount} characters)!`);
        break;
      }
      await sleep(1000);
    }

    if (!verified) {
      throw new Error(`CRITICAL ABORT: Caption counter registered ${finalCount}/2,200 after 4 attempts. Halting upload!`);
    }
  }

  // 9. Click "Share"
  console.log("[9/9] Clicking final 'Share' button...");
  const shareStatus = runInChromeTab(`(() => {
    const dialog = document.querySelector("div[role=dialog]");
    const shareBtn = Array.from(dialog.querySelectorAll("div[role=button], button")).find(
      b => b.innerText?.trim() === "Share"
    );
    if (shareBtn) {
      shareBtn.click();
      return "CLICKED_SHARE";
    }
    return "NO_SHARE_BUTTON";
  })()`).trim();
  console.log(`[UPLOAD] Share button status: ${shareStatus}`);

  // Wait for upload completion
  console.log("[UPLOAD] Waiting for Reel to upload and process on Instagram servers...");
  let success = false;
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const check = runInChromeTab(`(() => {
      const dialog = document.querySelector("div[role=dialog]");
      const text = document.body.innerText;
      if (text.includes("Your reel has been shared") || text.includes("Your post has been shared")) return "SUCCESS_TEXT";
      if (!dialog) return "DIALOG_CLOSED";
      return "WAITING: " + (dialog.innerText?.slice(0, 50).replace(/\\n/g, " ") || "");
    })()`).trim();

    if (check === "SUCCESS_TEXT" || check === "DIALOG_CLOSED") {
      console.log(`[UPLOAD SUCCESS] Upload confirmed: ${check}`);
      success = true;
      break;
    }
    if (i % 5 === 0) {
      console.log(`[UPLOAD STATUS] Progress check (${i*2}s): ${check}`);
    }
  }

  if (!success) {
    throw new Error("Upload timed out or dialog did not close within expected timeframe.");
  }

  // Dismiss any remaining dialog
  runInChromeTab(`(() => {
    const done = Array.from(document.querySelectorAll("button, div[role=button]")).find(b => ["Done", "Close"].includes(b.innerText?.trim()));
    if (done) done.click();
  })()`);
  await sleep(3000);

  // 10. Fetch new live Reel URL from profile
  console.log("[VERIFY] Fetching new live Reel URL from Vandana Creation profile...");
  runInChromeTab("location.href = 'https://www.instagram.com/vandanacreation09/';");
  await sleep(4000);

  const profileDataRaw = runInChromeTab(`(() => {
    const links = Array.from(document.querySelectorAll("a[href*=\\"/reel/\\"]")).map(a => a.href);
    return JSON.stringify({ reelUrls: links });
  })()`).trim();
  const profileData = JSON.parse(profileDataRaw);
  const latestReel = profileData.reelUrls[0] || "URL_NOT_FOUND";

  console.log(`[SUCCESS] Reel is LIVE: ${latestReel}`);
  return {
    success: true,
    url: latestReel
  };
}
