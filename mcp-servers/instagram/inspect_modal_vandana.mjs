import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { runInChromeTab, activateChrome, sleep } from "./schedule_runner.mjs";

async function inspectModal() {
  console.log("=== INSPECTING UPLOAD MODAL FOR VANDANA CREATION ===");
  const videoPath = "/Users/admin/Desktop/Brut_Iron_Product_Video_NoBranding.mp4";

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
  console.log("Video injected, waiting 5s for preview...");
  await sleep(5000);

  // Dismiss Reels OK if present
  runInChromeTab(`(() => {
    const ok = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "OK");
    if (ok) ok.click();
  })()`);
  await sleep(1000);

  // Take screenshot of step 1 (Media preview)
  execFileSync("screencapture", ["-x", "/tmp/modal_step1.png"]);
  console.log("Captured /tmp/modal_step1.png");

  // Inspect SVGs and buttons on dialog
  const step1Info = runInChromeTab(`(() => {
    const dialog = document.querySelector("div[role=dialog]");
    if (!dialog) return "NO_DIALOG";
    const svgs = Array.from(dialog.querySelectorAll("svg")).map(s => ({
      aria: s.getAttribute("aria-label"),
      rect: s.getBoundingClientRect()
    }));
    const buttons = Array.from(dialog.querySelectorAll("button, div[role=button]")).map(b => ({
      text: b.innerText?.trim(),
      rect: b.getBoundingClientRect()
    }));
    return JSON.stringify({ svgs, buttons });
  })()`);
  console.log("Step 1 info:", step1Info);
}

inspectModal().catch(console.error);
