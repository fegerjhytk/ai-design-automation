#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { execFileSync, spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import {
  authManager,
  normalizeUsername,
  hydrateIgFromWebCookies,
  saveSession,
} from "./src/auth.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    status: false,
    list: false,
    gui: false,
    defaultAccount: null,
    removeAccount: null,
    username: null,
    password: null,
    code: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--status" || arg === "-s") {
      opts.status = true;
    } else if (arg === "--list" || arg === "-l") {
      opts.list = true;
    } else if (arg === "--gui" || arg === "-g") {
      opts.gui = true;
    } else if (arg === "--default" && args[i + 1]) {
      opts.defaultAccount = args[++i];
    } else if (arg === "--remove" && args[i + 1]) {
      opts.removeAccount = args[++i];
    } else if ((arg === "--username" || arg === "-u") && args[i + 1]) {
      opts.username = args[++i];
    } else if ((arg === "--password" || arg === "-p") && args[i + 1]) {
      opts.password = args[++i];
    } else if ((arg === "--code" || arg === "-c") && args[i + 1]) {
      opts.code = args[++i];
    }
  }
  return opts;
}

function promptMacDialog(promptText, { hidden = false, defaultAnswer = "" } = {}) {
  const script = `
    on run argv
      set promptMsg to item 1 of argv
      set defAns to item 2 of argv
      set isHidden to item 3 of argv
      tell application "System Events"
        activate
        if isHidden is "true" then
          set res to display dialog promptMsg default answer defAns with title "Instagram MCP Secure Login" with hidden answer buttons {"Cancel", "Browser Login", "Continue"} default button "Continue"
        else
          set res to display dialog promptMsg default answer defAns with title "Instagram MCP Secure Login" buttons {"Cancel", "Continue"} default button "Continue"
        end if
        return (button returned of res) & "|" & (text returned of res)
      end tell
    end run
  `;
  try {
    const raw = execFileSync(
      "osascript",
      ["-e", script, promptText, defaultAnswer, hidden ? "true" : "false"],
      { encoding: "utf8" }
    ).trim();
    const sep = raw.indexOf("|");
    if (sep === -1) return null;
    return {
      button: raw.slice(0, sep),
      text: raw.slice(sep + 1),
    };
  } catch {
    return null;
  }
}

function askMacMoreAccounts(message) {
  const script = `
    on run argv
      set msg to item 1 of argv
      tell application "System Events"
        activate
        set res to display dialog msg with title "Instagram MCP Secure Login" buttons {"Done", "Add Another Account"} default button "Done"
        return button returned of res
      end tell
    end run
  `;
  try {
    const btn = execFileSync("osascript", ["-e", script, message], {
      encoding: "utf8",
    }).trim();
    return btn === "Add Another Account";
  } catch {
    return false;
  }
}

function showMacAlert(message) {
  const script = `
    on run argv
      set msg to item 1 of argv
      tell application "System Events"
        activate
        set res to display dialog msg with title "Instagram MCP Secure Login" buttons {"Cancel", "Browser Login", "Try Again"} default button "Browser Login"
        return button returned of res
      end tell
    end run
  `;
  try {
    return execFileSync("osascript", ["-e", script, message], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "Cancel";
  }
}

async function runBrowserWindowLogin(username, setDefault = false) {
  const chromePath =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), "ig-gui-browser-"));
  const port = 9250 + Math.floor(Math.random() * 400);

  console.log(`Opening Instagram login window for @${username}...`);
  const proc = spawn(
    chromePath,
    [
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=520,740",
      `--user-data-dir=${tmpProfile}`,
      `--remote-debugging-port=${port}`,
      "--app=https://www.instagram.com/accounts/login/",
    ],
    { stdio: "ignore" }
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(
          (r) => r.json()
        );
        const page = list.find((t) => t.type === "page");
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // Wait for debug port
      }
    }
    if (!wsUrl) {
      throw new Error("Could not connect to Chrome login window.");
    }

    try {
      execFileSync("osascript", [
        "-e",
        `tell application "System Events" to set frontmost of (first process whose unix id is ${proc.pid}) to true`,
      ]);
    } catch {
      // Ignore focus errors
    }

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener("open", resolve));
    let msgId = 1;
    const sendCdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        const listener = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener("message", listener);
            if (data.error) reject(new Error(data.error.message));
            else resolve(data.result);
          }
        };
        ws.addEventListener("message", listener);
        ws.send(JSON.stringify({ id, method, params }));
      });

    for (let i = 0; i < 180; i++) {
      if (proc.exitCode !== null) {
        throw new Error("Browser login window was closed before login finished.");
      }
      await new Promise((r) => setTimeout(r, 1000));
      const { cookies } = await sendCdp("Storage.getCookies");
      const sessionCookie = cookies.find(
        (c) => c.name === "sessionid" && c.value
      );
      if (sessionCookie) {
        const cookieMap = {};
        for (const c of cookies) {
          if (c.domain.includes("instagram.com")) {
            cookieMap[c.name] = c.value;
          }
        }
        const ig = authManager.createWiredClient(username);
        ig.state.generateDevice(username);
        await hydrateIgFromWebCookies(
          ig,
          cookieMap,
          cookieMap.ds_user_id || ""
        );
        const currentUser = await ig.account.currentUser().catch(() => ({
          pk: String(cookieMap.ds_user_id || ""),
          username,
          full_name: username,
          is_private: false,
        }));
        const { sessionPath } = authManager.getPaths(username);
        await saveSession(ig, sessionPath);
        const registry = authManager.registerAccount(username, currentUser, {
          setDefault,
          saveCredentials: true,
        });
        authManager.clients.set(username, ig);
        ws.close();
        proc.kill("SIGKILL");
        return {
          status: "authenticated",
          account: normalizeUsername(currentUser.username || username),
          default_account: registry.defaultAccount,
          user: currentUser,
        };
      }
    }
    throw new Error("Timed out waiting for Instagram browser login.");
  } finally {
    try {
      proc.kill("SIGKILL");
    } catch {
      // Ignore
    }
  }
}

async function runGuiLogin() {
  let keepGoing = true;
  let lastUsername = "deepans.designstudio";
  while (keepGoing) {
    const existing = authManager.listAccounts();
    const existingNote =
      existing.total_accounts > 0
        ? `\nConnected accounts: ${existing.accounts.map((a) => "@" + a.username).join(", ")}\n\n`
        : "\n\n";

    const userDialog = promptMacDialog(
      `Enter your Instagram Username:${existingNote}(Your password will be hidden and never shared in chat)`,
      { defaultAnswer: lastUsername }
    );
    if (!userDialog || !userDialog.text) {
      console.log("Login cancelled by user.");
      return;
    }
    const username = normalizeUsername(userDialog.text);
    lastUsername = username;
    const setDefault = existing.total_accounts === 0;

    const pwDialog = promptMacDialog(
      `Enter Instagram Password for @${username} (or click "Browser Login" to sign in via Chrome):`,
      { hidden: true }
    );
    if (!pwDialog || pwDialog.button === "Cancel") {
      console.log("Login cancelled by user.");
      return;
    }

    try {
      let result;
      if (pwDialog.button === "Browser Login" || !pwDialog.text) {
        result = await runBrowserWindowLogin(username, setDefault);
      } else {
        const password = pwDialog.text;
        console.log(`Authenticating @${username} with Instagram...`);
        result = await authManager.login({
          username,
          password,
          setDefault,
        });

        if (
          result.status === "two_factor_required" ||
          result.status === "checkpoint_required"
        ) {
          const codeDialog = promptMacDialog(
            `${result.message}\n\nEnter the verification code for @${username}:`
          );
          if (!codeDialog || !codeDialog.text) {
            console.log("2FA/Checkpoint verification cancelled.");
            return;
          }
          result = await authManager.login({
            username,
            password,
            verificationCode: codeDialog.text.trim(),
            setDefault,
          });
        }
      }

      if (result.status === "authenticated") {
        console.log(
          `Successfully authenticated @${result.account} (default: @${result.default_account}).`
        );
        lastUsername = "";
        keepGoing = askMacMoreAccounts(
          `✅ Logged in as @${result.account}!\nSession saved securely (mode 0600).\n\nWould you like to log in to another Instagram account?`
        );
      } else {
        throw new Error(result.message || "Unexpected login status");
      }
    } catch (err) {
      console.error(`Login attempt failed for @${username}: ${err.message}`);
      const choice = showMacAlert(
        `⚠️ Could not log in to @${username}:\n\n${err.message}\n\nClick "Browser Login" to sign in directly in Chrome, or "Try Again".`
      );
      if (choice === "Browser Login") {
        try {
          const result = await runBrowserWindowLogin(username, setDefault);
          console.log(
            `Successfully authenticated @${result.account} (default: @${result.default_account}).`
          );
          keepGoing = false;
        } catch (browserErr) {
          console.error("Browser login failed:", browserErr.message);
          keepGoing = false;
        }
      } else {
        keepGoing = choice === "Try Again";
      }
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.gui) {
    await runGuiLogin();
    return;
  }

  if (opts.defaultAccount) {
    const res = authManager.setDefaultAccount(opts.defaultAccount);
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (opts.removeAccount) {
    const res = authManager.removeAccount(opts.removeAccount);
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (opts.list) {
    const res = authManager.listAccounts();
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (opts.status) {
    const status = await authManager.getStatus({ account: opts.username });
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const rl = readline.createInterface({ input, output });
  try {
    console.log("=== Instagram MCP Multi-Account Login ===");
    const existing = authManager.listAccounts();
    if (existing.total_accounts > 0) {
      console.log(
        `Registered accounts (${existing.total_accounts}): ${existing.accounts
          .map((a) => `@${a.username}${a.is_default ? " [default]" : ""}`)
          .join(", ")}`
      );
    }

    const rawUsername =
      opts.username ||
      process.env.IG_USERNAME ||
      (await rl.question("Instagram Username: "));
    const username = normalizeUsername(rawUsername);
    if (!username) {
      console.error("Error: Username is required.");
      process.exitCode = 1;
      return;
    }

    const password =
      opts.password ||
      process.env.IG_PASSWORD ||
      (await rl.question(`Password for @${username}: `));

    let setDefault = false;
    if (existing.total_accounts > 0 && existing.default_account !== username) {
      const ans = await rl.question(
        `Set @${username} as default account? (y/N): `
      );
      setDefault = /^y(es)?$/i.test(ans.trim());
    } else {
      setDefault = true;
    }

    console.log(`Logging in as @${username}...`);
    let result = await authManager.login({
      username,
      password,
      verificationCode: opts.code,
      setDefault,
    });

    if (
      result.status === "two_factor_required" ||
      result.status === "checkpoint_required"
    ) {
      console.log(`\n${result.message}`);
      const verificationCode = await rl.question("Enter verification code: ");
      result = await authManager.login({
        username,
        password,
        verificationCode: verificationCode.trim(),
        setDefault,
      });
    }

    if (result.status === "authenticated") {
      console.log(
        `\nSuccessfully authenticated @${result.account} (default account: @${result.default_account}).`
      );
      console.log(
        `Session saved to auth_info/sessions/${result.account}.json (mode 0600).`
      );
    } else {
      console.error("Login did not complete:", JSON.stringify(result, null, 2));
      process.exitCode = 1;
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Instagram login failed:", err.message || err);
  process.exit(1);
});
