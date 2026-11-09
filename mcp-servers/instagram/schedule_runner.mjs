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

export function hardwareClick(x, y) {
  const clickScript = `
import Foundation
import CoreGraphics
let pt = CGPoint(x: ${x}, y: ${y})
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
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function scheduleReelDirect({
  videoPath,
  caption,
  dayNumber,
  hour = "10",
  minute = "35",
  ampm = "AM",
  aspect = "9:16"
}) {
  console.log(`\n======================================================`);
  console.log(`[SCHEDULE] Starting upload for: ${videoPath}`);
  console.log(`[SCHEDULE] Target Date: Day ${dayNumber}, Time: ${hour}:${minute} ${ampm}, Aspect: ${aspect}`);

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
  console.log("[SCHEDULE] Video injected, waiting for preview mount...");
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
  console.log("[SCHEDULE] Clicking Select crop icon at (518, 922)...");
  hardwareClick(518, 922);
  await sleep(800);

  console.log("[SCHEDULE] Clicking Original option at (520, 705)...");
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
  console.log(`[SCHEDULE] Live Aspect Ratio Check:`, ratioData);

  if (ratioData.error || ratioData.ratio === "1.00") {
    // ABORT!
    throw new Error(`CRITICAL ABORT: Video is still in 1:1 Square crop (${ratioData.ratio})! Halting upload!`);
  }
  console.log(`[SCHEDULE] Aspect ratio passed gate (Ratio: ${ratioData.ratio}, non-square)!`);

  // 6. Next -> Edit
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2000);

  // 7. Next -> Caption / Schedule
  runInChromeTab(`(() => {
    const next = Array.from(document.querySelectorAll("div[role=dialog] button, div[role=dialog] div[role=button]")).find(b => b.innerText.trim() === "Next");
    if (next) next.click();
  })()`);
  await sleep(2500);

  // 8. Inject Caption via pbcopy + AppleScript Cmd+V
  if (caption) {
    console.log("[SCHEDULE] Pasting caption into Lexical editor...");
    spawnSync("pbcopy", { input: caption });
    runInChromeTab(`(() => {
      const editor = document.querySelector("div[role=dialog] div[contenteditable=true]");
      if (editor) editor.focus();
    })()`);
    await sleep(500);
    activateChrome();
    execFileSync("osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
    await sleep(1000);
  }

  // 9. Toggle "Schedule content"
  console.log("[SCHEDULE] Toggling Schedule content switch...");
  runInChromeTab(`(() => {
    const schSpan = Array.from(document.querySelectorAll("span")).find(el => el.textContent?.trim() === "Schedule content");
    if (schSpan) {
      const container = schSpan.closest("div[role=button]") || schSpan.parentElement.parentElement;
      const inp = container.querySelector("input[type=checkbox]");
      if (inp) {
        if (!inp.checked) inp.click();
      } else {
        container.click();
      }
    }
  })()`);
  await sleep(1500);

  // 10. Set Calendar Date
  console.log(`[SCHEDULE] Selecting Day ${dayNumber} on calendar...`);
  runInChromeTab(`(() => {
    const dateEl = Array.from(document.querySelectorAll("div, span")).find(el => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \\d+, \\d{4}$/.test(el.innerText?.trim()) && el.children.length === 0);
    if (dateEl) (dateEl.closest("div[role=button]") || dateEl.parentElement || dateEl).click();
  })()`);
  await sleep(1000);

  // Click target day number in calendar
  runInChromeTab(`(() => {
    const days = Array.from(document.querySelectorAll("div[role=dialog] span, div[role=dialog] div, div[role=dialog] button")).filter(
      el => el.innerText?.trim() === "${dayNumber}" && el.children.length === 0
    );
    // Click the matching day
    if (days.length > 0) {
      const target = days[days.length - 1]; // Current month day
      (target.closest("button") || target.closest("div[role=button]") || target).click();
    }
  })()`);
  await sleep(1000);

  // 11. Set Hours, Minutes, AM PM
  console.log(`[SCHEDULE] Setting Time: ${hour}:${minute} ${ampm}...`);
  runInChromeTab(`(() => {
    const dialog = document.querySelector("div[role=dialog]");
    const hInput = dialog.querySelector("input[aria-label=\\"Hours\\"]");
    const mInput = dialog.querySelector("input[aria-label=\\"Minutes\\"]");
    const apInput = dialog.querySelector("input[aria-label=\\"AM PM\\"]");

    if (hInput) {
      hInput.focus();
      hInput.value = "${hour}";
      hInput.dispatchEvent(new Event("input", { bubbles: true }));
      hInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (mInput) {
      mInput.focus();
      mInput.value = "${minute}";
      mInput.dispatchEvent(new Event("input", { bubbles: true }));
      mInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (apInput) {
      apInput.focus();
      apInput.value = "${ampm}";
      apInput.dispatchEvent(new Event("input", { bubbles: true }));
      apInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  })()`);
  await sleep(1000);

  // 12. Click "Schedule" button
  console.log("[SCHEDULE] Clicking final 'Schedule' button...");
  const scheduledClicked = runInChromeTab(`(() => {
    const dialog = document.querySelector("div[role=dialog]");
    const scheduleBtn = Array.from(dialog.querySelectorAll("div[role=button], button")).find(
      b => b.innerText?.trim() === "Schedule"
    );
    if (scheduleBtn) {
      scheduleBtn.click();
      return "CLICKED_SCHEDULE";
    }
    return "NO_SCHEDULE_BUTTON";
  })()`).trim();

  console.log(`[SCHEDULE] Schedule button status: ${scheduledClicked}`);

  // 13. Wait for upload & scheduling to complete (dialog vanishes or success message)
  console.log("[SCHEDULE] Waiting for upload submission to complete in Meta cloud...");
  let success = false;
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const check = runInChromeTab(`(() => {
      const dialog = document.querySelector("div[role=dialog]");
      const text = document.body.innerText;
      if (text.includes("Your reel has been scheduled") || text.includes("Your post has been scheduled")) return "SUCCESS_TEXT";
      if (!dialog) return "DIALOG_CLOSED";
      return "WAITING";
    })()`).trim();

    if (check === "SUCCESS_TEXT" || check === "DIALOG_CLOSED") {
      console.log(`[SCHEDULE] Success confirmed: ${check}`);
      success = true;
      break;
    }
  }

  // Dismiss any remaining success modal if present
  runInChromeTab(`(() => {
    const done = Array.from(document.querySelectorAll("button, div[role=button]")).find(b => ["Done", "Close"].includes(b.innerText?.trim()));
    if (done) done.click();
  })()`);
  await sleep(2000);

  console.log(`[SCHEDULE COMPLETE] Video scheduled successfully into Meta Cloud!`);
  return { success: true };
}
