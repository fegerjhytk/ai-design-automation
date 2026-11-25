#!/usr/bin/env node

/**
 * chrome_active_tab_controller.js
 * 
 * Automates, inspects, and interacts with live, active Google Chrome tabs on macOS
 * using AppleScript, injected JavaScript, and native OS events without third-party browser drivers.
 * 
 * Capabilities:
 * 1. Execute JavaScript inside active/matching Chrome tab (runInChromeTab)
 * 2. Check tab open state across windows (isChromeTabOpen)
 * 3. System clipboard & Command+V keystroke injection for React / Lexical editors (typeViaSystemPaste)
 * 4. In-memory base64 chunked file injection to <input type="file"> (uploadFileToChrome)
 * 5. Low-level CoreGraphics / Swift hardware click injection (hardwareClick)
 * 6. Health & environment checks (checkChromeAutomationHealth)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

/**
 * Checks if Google Chrome is running and if AppleScript automation is accessible.
 */
function checkChromeAutomationHealth(matchDomain = null) {
  const result = {
    chromeRunning: false,
    appleEventsAllowed: false,
    matchingTabFound: false,
    domain: matchDomain,
    error: null
  };

  try {
    const pgrep = spawnSync('pgrep', ['-il', 'Google Chrome'], { encoding: 'utf8' });
    result.chromeRunning = (pgrep.stdout && pgrep.stdout.trim().length > 0);
  } catch (_) {
    result.chromeRunning = false;
  }

  if (!result.chromeRunning) {
    return result;
  }

  try {
    const probeScript = `tell application "Google Chrome" to get count of windows`;
    execFileSync("osascript", ["-e", probeScript], { encoding: "utf8", timeout: 4000 }).trim();
    result.appleEventsAllowed = true;
  } catch (err) {
    result.error = err.message;
    return result;
  }

  if (matchDomain) {
    result.matchingTabFound = isChromeTabOpen(matchDomain);
  }

  return result;
}

/**
 * Checks if a tab matching the target domain is currently open in Chrome.
 */
function isChromeTabOpen(matchDomain = "google.com") {
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "${matchDomain}" then
          return "YES"
        end if
      end repeat
    end repeat
  end tell
  return "NO"`;
  try {
    const res = execFileSync("osascript", ["-e", script], { encoding: "utf8", timeout: 5000 }).trim();
    return res === "YES";
  } catch {
    return false;
  }
}

/**
 * Executes a snippet of JavaScript inside the active or matching Chrome tab
 * and returns the string result.
 */
function runInChromeTab(code, matchDomain = "google.com") {
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "${matchDomain}" then
          tell t to execute javascript ${JSON.stringify(code)}
          return result
        end if
      end repeat
    end repeat
  end tell`;
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8", timeout: 30000 }).trim();
  } catch (err) {
    throw new Error(`Chrome execute javascript failed: ${err.message}`);
  }
}

/**
 * Rich-Text & React Input Injection (Bypassing isTrusted: false)
 * Meta Lexical, Draft.js, Notion, Slack ignore synthetic JS input events.
 * Uses OS clipboard and native keystrokes.
 */
function typeViaSystemPaste(targetSelector, text, matchDomain = "google.com") {
  // 1. Copy text to system clipboard
  spawnSync("pbcopy", { input: text, encoding: "utf8" });

  // 2. Focus the input or contenteditable element in the page
  const focusCode = `(() => {
    const el = document.querySelector(${JSON.stringify(targetSelector)});
    if (el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return "FOCUSED";
    }
    return "NOT_FOUND";
  })()`;
  runInChromeTab(focusCode, matchDomain);

  // 3. Fire real macOS Command+V keystroke via System Events
  const pasteScript = `tell application "Google Chrome" to activate
  delay 0.15
  tell application "System Events"
    keystroke "a" using command down
    delay 0.05
    keystroke "v" using command down
  end tell`;
  execFileSync("osascript", ["-e", pasteScript], { encoding: "utf8", timeout: 10000 });
  return { success: true, selector: targetSelector };
}

/**
 * Attaching Local Files to <input type="file"> via chunked base64 memory transfer.
 */
function uploadFileToChrome(filePath, inputSelector = "input[type=file]", matchDomain = "google.com") {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found for Chrome upload: ${filePath}`);
  }

  const fileB64 = fs.readFileSync(filePath).toString("base64");
  const fileName = path.basename(filePath);
  const chunkSize = 400000; // 400KB chunks avoid OS command-line ARG_MAX buffer errors

  runInChromeTab("window.__b64_chunks = [];", matchDomain);
  for (let i = 0; i < fileB64.length; i += chunkSize) {
    const slice = fileB64.slice(i, i + chunkSize);
    runInChromeTab(`window.__b64_chunks.push(${JSON.stringify(slice)});`, matchDomain);
  }

  const injectCode = `(() => {
    const full = window.__b64_chunks.join("");
    window.__b64_chunks = null;
    const chars = atob(full);
    const nums = new Uint8Array(chars.length);
    for (let i = 0; i < chars.length; i++) nums[i] = chars.charCodeAt(i);
    const blob = new Blob([nums], { type: "application/octet-stream" });
    const file = new File([blob], ${JSON.stringify(fileName)}, { type: "application/octet-stream" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const inp = document.querySelector(${JSON.stringify(inputSelector)});
    if (inp) {
      inp.files = dt.files;
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      return "UPLOAD_INJECTED";
    }
    return "INPUT_NOT_FOUND";
  })()`;

  const res = runInChromeTab(injectCode, matchDomain);
  return { success: res === "UPLOAD_INJECTED", result: res, file: fileName };
}

/**
 * Low-Level Hardware Click (CoreGraphics / Swift)
 */
function hardwareClick(screenX, screenY) {
  execFileSync("osascript", ["-e", 'tell application "Google Chrome" to activate']);
  const swiftCode = `
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
  execFileSync("swift", ["-e", swiftCode], { encoding: "utf8", timeout: 10000 });
  return { success: true, x: screenX, y: screenY };
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let action = 'status';
  let domain = 'google.com';
  let code = '';
  let selector = '';
  let text = '';
  let file = '';
  let x = 0;
  let y = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && args[i + 1]) action = args[++i];
    else if (args[i] === '--domain' && args[i + 1]) domain = args[++i];
    else if (args[i] === '--eval' && args[i + 1]) { action = 'eval'; code = args[++i]; }
    else if (args[i] === '--paste') action = 'paste';
    else if (args[i] === '--upload') action = 'upload';
    else if (args[i] === '--click') action = 'click';
    else if (args[i] === '--selector' && args[i + 1]) selector = args[++i];
    else if (args[i] === '--text' && args[i + 1]) text = args[++i];
    else if (args[i] === '--file' && args[i + 1]) file = args[++i];
    else if (args[i] === '--x' && args[i + 1]) x = Number(args[++i]);
    else if (args[i] === '--y' && args[i + 1]) y = Number(args[++i]);
  }

  switch (action) {
    case 'status':
      console.log(JSON.stringify(checkChromeAutomationHealth(domain), null, 2));
      break;
    case 'eval':
      try {
        const out = runInChromeTab(code, domain);
        console.log(out);
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      break;
    case 'paste':
      if (!selector || !text) {
        console.error("Error: --selector and --text are required for paste action");
        process.exit(1);
      }
      try {
        const out = typeViaSystemPaste(selector, text, domain);
        console.log(JSON.stringify(out, null, 2));
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      break;
    case 'upload':
      if (!file) {
        console.error("Error: --file is required for upload action");
        process.exit(1);
      }
      try {
        const out = uploadFileToChrome(file, selector || "input[type=file]", domain);
        console.log(JSON.stringify(out, null, 2));
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      break;
    case 'click':
      try {
        const out = hardwareClick(x, y);
        console.log(JSON.stringify(out, null, 2));
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      break;
    default:
      console.log(`Unknown action: ${action}. Available: status, eval, paste, upload, click`);
  }
}

module.exports = {
  checkChromeAutomationHealth,
  isChromeTabOpen,
  runInChromeTab,
  typeViaSystemPaste,
  uploadFileToChrome,
  hardwareClick
};
