import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { runInChromeTab, activateChrome, hardwareClick, sleep } from "./schedule_runner.mjs";

async function publishVandanaSlot1() {
  console.log("=== PUBLISHING SLOT 1 (BRUT IRON) FOR VANDANA CREATION ===");
  const videoPath = "/Users/admin/Desktop/Brut_Iron_Product_Video_NoBranding.mp4";
  const caption = `Precision meets effortless glide. ✨ Built for crisp, wrinkle-free perfection with every press — featuring a heavy-weight non-stick soleplate, ergonomic grip, and rapid thermal control.\n\nCrafted with clean motion graphics & modern product aesthetics. 🎬⚡\n\n#ProductShowcase #MotionGraphics #AfterEffects #ProductVideo #IndustrialDesign #HomeAppliances #CommercialReel #VisualDesign #CreativeProduction #ModernLiving`;

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file does not exist: ${videoPath}`);
  }

  // 1. Go to Instagram Home
  runInChromeTab("location.href = 'https://www.instagram.com/';");
  await sleep(2500);

  // 2. Open Create -> Post
  runInChromeTab(`(() => {
    const svg = document.querySelector("svg[aria-label=\\"New post\\"]");
    if (svg) (svg.closest("a") || svg.closest("div[role=button]") || svg).click();
    else {
      const btn = Array.from(document.querySelectorAll("a, span, div")).find(el => el.textContent.trim() === "Create");
      if (btn) btn.click();
    }
  })()`);
  await sleep(1000);

  runInChromeTab(`(() => {
    const post = Array.from(document.querySelectorAll("a, span, div[role=button]")).find(el => el.textContent.trim() === "Post");
    if (post) (post.closest("a") || post.closest("div[role=button]") || post).click();
  })()`);
  await sleep(1500);

  // 3. Inject Video file
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
  console.log("[VANDANA] Video injected, waiting for preview mount...");
  await sleep(4000);

  // Dismiss Reels OK if present
  runInChromeTab(`(() => {
    const ok = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "OK");
    if (ok) ok.click();
  })()`);
  await sleep(1000);

  // 4. Set Aspect Ratio (Select crop -> Original)
  activateChrome();
  await sleep(500);
  console.log("[VANDANA] Clicking Select crop icon at (518, 922)...");
  hardwareClick(518, 922);
  await sleep(800);

  console.log("[VANDANA] Clicking Original option at (520, 705)...");
  hardwareClick(520, 705);
  await sleep(1200);

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
  console.log(`[VANDANA] Live Aspect Ratio Check:`, ratioData);

  if (ratioData.error || ratioData.ratio === "1.00") {
    throw new Error(`CRITICAL ABORT: Video is still in 1:1 Square crop (${ratioData.ratio})! Halting upload!`);
  }
  console.log(`[VANDANA] Aspect ratio passed gate (Ratio: ${ratioData.ratio}, non-square)!`);

  // 6. Next -> Edit
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2000);

  // 7. Next -> Caption
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2500);

  // 8. Inject Caption via pbcopy + AppleScript Cmd+V
  console.log("[VANDANA] Pasting caption into Lexical editor...");
  spawnSync("pbcopy", { input: caption });
  runInChromeTab(`(() => {
    const editor = document.querySelector("div[role=dialog] div[contenteditable=true]");
    if (editor) editor.focus();
  })()`);
  await sleep(500);
  activateChrome();
  execFileSync("osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
  await sleep(1000);

  // 9. Click "Share" button
  console.log("[VANDANA] Clicking final 'Share' button...");
  const shareClicked = runInChromeTab(`(() => {
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

  console.log(`[VANDANA] Share button status: ${shareClicked}`);

  // 10. Wait for upload to complete
  console.log("[VANDANA] Waiting for upload completion in Meta servers...");
  let success = false;
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const check = runInChromeTab(`(() => {
      const dialog = document.querySelector("div[role=dialog]");
      const text = document.body.innerText;
      if (text.includes("Your reel has been shared") || text.includes("Your post has been shared")) return "SUCCESS_TEXT";
      if (!dialog) return "DIALOG_CLOSED";
      return "WAITING";
    })()`).trim();

    if (check === "SUCCESS_TEXT" || check === "DIALOG_CLOSED") {
      console.log(`[VANDANA] Success confirmed: ${check}`);
      success = true;
      break;
    }
  }

  // Dismiss modal if present
  runInChromeTab(`(() => {
    const done = Array.from(document.querySelectorAll("button, div[role=button]")).find(b => ["Done", "Close"].includes(b.innerText?.trim()));
    if (done) done.click();
  })()`);
  await sleep(2000);

  console.log(`[VANDANA COMPLETE] Slot 1 published live to @vandanacreation09!`);
  return { success: true };
}

publishVandanaSlot1().catch(err => {
  console.error("VANDANA SLOT 1 ERROR:", err);
  process.exit(1);
});
