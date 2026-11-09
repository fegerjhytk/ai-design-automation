import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  IgApiClient,
  IgLoginTwoFactorRequiredError,
  IgCheckpointError,
  IgLoginBadPasswordError,
  IgLoginInvalidUserError,
  LiveEntity,
} = require("instagram-private-api");

export {
  IgApiClient,
  IgLoginTwoFactorRequiredError,
  IgCheckpointError,
  IgLoginBadPasswordError,
  IgLoginInvalidUserError,
  LiveEntity,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_BASE_DIR = path.dirname(__dirname);

/**
 * Normalize an Instagram username: trim, strip leading '@', and lowercase.
 */
export function normalizeUsername(username) {
  if (!username || typeof username !== "string") {
    return "";
  }
  return username.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Resolve authentication directory and file paths for a given baseDir and optional username.
 */
export function getAuthPaths(baseDir, username = null) {
  const resolvedBase =
    baseDir ||
    (process.env.IG_AUTH_DIR ? path.resolve(process.env.IG_AUTH_DIR) : DEFAULT_BASE_DIR);
  const normalized = normalizeUsername(username);
  const authDir = path.join(resolvedBase, "auth_info");
  const sessionsDir = path.join(authDir, "sessions");
  const accountsPath = path.join(authDir, "accounts.json");
  const legacySessionPath = path.join(authDir, "session.json");
  const sessionPath = normalized
    ? path.join(sessionsDir, `${normalized}.json`)
    : legacySessionPath;
  const pendingAuthPath = normalized
    ? path.join(authDir, `pending_${normalized}.json`)
    : path.join(authDir, "pending_auth.json");

  return {
    baseDir: resolvedBase,
    authDir,
    sessionsDir,
    accountsPath,
    legacySessionPath,
    sessionPath,
    pendingAuthPath,
  };
}

function ensureSecureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  try {
    fs.chmodSync(dirPath, 0o700);
  } catch {
    // Ignore chmod errors on unsupported filesystems
  }
}

function writeSecureJson(filePath, data) {
  const dir = path.dirname(filePath);
  ensureSecureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
  fs.chmodSync(filePath, 0o600);
}

/**
 * Serialize and save IgApiClient session state with 0600 permissions.
 */
export async function saveSession(ig, sessionPath) {
  const dir = path.dirname(sessionPath);
  ensureSecureDir(dir);
  const serialized = await ig.state.serialize();
  delete serialized.constants;
  writeSecureJson(sessionPath, serialized);
}

/**
 * Load and deserialize saved session state into IgApiClient if the file exists.
 */
export async function loadSession(ig, sessionPath) {
  if (!sessionPath || !fs.existsSync(sessionPath)) {
    return false;
  }
  const raw = fs.readFileSync(sessionPath, "utf-8");
  const data = JSON.parse(raw);
  await ig.state.deserialize(data);
  const webCookies = extractWebSessionCookies(ig);
  if (webCookies?.sessionid) {
    await hydrateIgFromWebCookies(ig, webCookies, webCookies.ds_user_id);
  }
  return true;
}

export const WEB_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function parseSetCookieHeaders(headers) {
  const rawList =
    typeof headers?.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers?.get?.("set-cookie")
      ? [headers.get("set-cookie")]
      : [];
  const map = {};
  for (const item of rawList) {
    if (!item) continue;
    const firstPair = item.split(";")[0];
    const eqIdx = firstPair.indexOf("=");
    if (eqIdx > 0) {
      const k = firstPair.slice(0, eqIdx).trim();
      const v = firstPair.slice(eqIdx + 1).trim();
      if (k && v) {
        map[k] = v;
      }
    }
  }
  return map;
}

async function setIgCookie(ig, key, value) {
  if (!ig?.state?.cookieJar?.setCookie) return;
  const cookieStr = `${key}=${value}; Domain=.instagram.com; Path=/; Secure`;
  for (const host of ["https://i.instagram.com/", "https://www.instagram.com/"]) {
    try {
      ig.state.cookieJar.setCookie(cookieStr, host);
    } catch {
      // Ignore cookie parse issues
    }
  }
}

export async function hydrateIgFromWebCookies(ig, cookieMap, fallbackUserId = "") {
  for (const [k, v] of Object.entries(cookieMap)) {
    await setIgCookie(ig, k, v);
  }
  const dsUserId = cookieMap.ds_user_id || String(fallbackUserId || "");
  const rawSessionId = cookieMap.sessionid || "";
  const decodedSessionId = rawSessionId ? decodeURIComponent(rawSessionId) : "";
  if (dsUserId && decodedSessionId) {
    ig.state.authorization =
      "Bearer IGT:2:" +
      Buffer.from(
        JSON.stringify({
          ds_user_id: String(dsUserId),
          sessionid: decodedSessionId,
        })
      ).toString("base64");
    ig._isAuthenticated = true;
  }
}

export function extractWebSessionCookies(ig) {
  if (!ig?.state?.cookieJar?.getCookies) return null;
  try {
    const cookies = [
      ...(ig.state.cookieJar.getCookies("https://www.instagram.com/") || []),
      ...(ig.state.cookieJar.getCookies("https://i.instagram.com/") || []),
    ];
    const map = {};
    for (const c of cookies) {
      if (c?.key && c?.value) {
        map[c.key] = c.value;
      }
    }
    if (map.sessionid) {
      return map;
    }
  } catch {
    // Ignore cookieJar lookup issues
  }
  return null;
}

export function extractActiveChromeInstagramProfile(username) {
  const norm = normalizeUsername(username);
  const jsCode = `JSON.stringify((() => {
    const cookieMap = {};
    for (const part of (document.cookie || "").split(";")) {
      const idx = part.indexOf("=");
      if (idx > 0) cookieMap[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
    const headerText = (document.querySelector("header")?.innerText || "").split("\\n").map(s => s.trim()).filter(Boolean);
    const unameIdx = headerText.findIndex(line => line.toLowerCase() === ${JSON.stringify(norm)});
    const fullName = unameIdx >= 0 && headerText[unameIdx + 1] && !/posts|followers|edit profile/i.test(headerText[unameIdx + 1])
      ? headerText[unameIdx + 1]
      : "";
    const img = document.querySelector("header img")?.src || "";
    return {
      url: location.href,
      cookies: cookieMap,
      pk: cookieMap.ds_user_id || "",
      full_name: fullName,
      profile_pic_url: img,
      is_private: false
    };
  })())`;
  const script = `tell application "Google Chrome"
    repeat with w in every window
      repeat with t in every tab of w
        if URL of t contains "instagram.com" then
          tell t to execute javascript ${JSON.stringify(jsCode)}
          return result
        end if
      end repeat
    end repeat
  end tell`;
  try {
    const raw = execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.pk || parsed.url?.toLowerCase().includes(norm))) {
      return parsed;
    }
  } catch {
    // Ignore AppleScript errors
  }
  return null;
}

async function loginViaWebAjax(ig, username, password, sessionPath = null) {
  const savedDeviceCookies = {};
  if (sessionPath && fs.existsSync(sessionPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      const jar =
        typeof prev.cookies === "string"
          ? JSON.parse(prev.cookies)
          : prev.cookies;
      for (const c of jar?.cookies || []) {
        if (c?.key && c?.value && c.key !== "sessionid") {
          savedDeviceCookies[c.key] = c.value;
        }
      }
    } catch {
      // Ignore corrupt session file
    }
  }

  // Allow direct sessionid cookie string paste if user enters a sessionid
  const trimmedPw = String(password || "").trim();
  if (/^\d+(?:%3A|:)[A-Za-z0-9_-]+(?:%3A|:)\d+/i.test(trimmedPw)) {
    const dsUserId = trimmedPw.split(/%3A|:/i)[0];
    const merged = {
      csrftoken: savedDeviceCookies.csrftoken || "missing",
      ...savedDeviceCookies,
      ds_user_id: dsUserId,
      sessionid: trimmedPw.includes("%3A")
        ? trimmedPw
        : encodeURIComponent(trimmedPw),
    };
    await hydrateIgFromWebCookies(ig, merged, dsUserId);
    const currentUser = await ig.account.currentUser().catch(() => null);
    if (currentUser) {
      return currentUser;
    }
  }

  const initCookieHeader = Object.entries(savedDeviceCookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const initRes = await fetch("https://www.instagram.com/accounts/login/", {
    headers: {
      "User-Agent": WEB_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      ...(initCookieHeader ? { Cookie: initCookieHeader } : {}),
    },
  });
  const initCookies = parseSetCookieHeaders(initRes.headers);
  const cookieMap = { ...savedDeviceCookies, ...initCookies };
  const csrfToken = cookieMap.csrftoken || "missing";
  const cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const time = Math.floor(Date.now() / 1000);
  const form = new URLSearchParams({
    username,
    enc_password: `#PWD_INSTAGRAM_BROWSER:0:${time}:${password}`,
    queryParams: "{}",
    optIntoOneTap: "false",
  });

  const loginRes = await fetch(
    "https://www.instagram.com/api/v1/web/accounts/login/ajax/",
    {
      method: "POST",
      headers: {
        "User-Agent": WEB_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "X-IG-App-ID": "936619743392459",
        Referer: "https://www.instagram.com/accounts/login/",
        Origin: "https://www.instagram.com",
        Cookie: cookieHeader,
      },
      body: form.toString(),
    }
  );

  const loginCookies = parseSetCookieHeaders(loginRes.headers);
  const mergedCookies = { ...cookieMap, ...loginCookies };
  const data = await loginRes.json();

  if (data.authenticated) {
    await hydrateIgFromWebCookies(ig, mergedCookies, data.userId);
    const currentUser = await ig.account.currentUser().catch(() => null);
    return (
      currentUser || {
        pk: String(data.userId || mergedCookies.ds_user_id || ""),
        username,
        full_name: username,
        is_private: false,
      }
    );
  }

  if (data.two_factor_required) {
    const err = new Error("Two-factor authentication required");
    err.name = "IgLoginTwoFactorRequiredError";
    err.webCookies = mergedCookies;
    err.response = { body: data };
    throw err;
  }

  if (data.message === "checkpoint_required" || data.checkpoint_url) {
    if (String(data.checkpoint_url || "").startsWith("/auth_platform/")) {
      const chromeProfile = extractActiveChromeInstagramProfile(username);
      if (chromeProfile) {
        const chromeCookies = {
          ...mergedCookies,
          ...(chromeProfile.cookies || {}),
        };
        await hydrateIgFromWebCookies(ig, chromeCookies, chromeProfile.pk);
        return {
          pk: String(chromeProfile.pk || ""),
          username,
          full_name: chromeProfile.full_name || username,
          is_private: Boolean(chromeProfile.is_private),
          profile_pic_url: chromeProfile.profile_pic_url || "",
        };
      }
    }
    const err = new Error("Instagram security checkpoint required");
    err.name = "IgCheckpointError";
    err.url = data.checkpoint_url || "";
    err.webCookies = mergedCookies;
    err.response = {
      body: {
        message: "challenge_required",
        challenge: { url: data.checkpoint_url || "", api_path: data.checkpoint_url || "" },
      },
    };
    throw err;
  }

  if (data.user === false) {
    throw new Error(`Instagram account @${username} was not found. Please check the username.`);
  }
  if (data.user === true && data.authenticated === false) {
    throw new Error(`Incorrect Instagram password for @${username}.`);
  }

  throw new Error(data.message || `Instagram login failed (${loginRes.status})`);
}

async function twoFactorViaWebAjax(ig, username, verificationCode, twoFactorIdentifier, savedCookies = {}) {
  const csrfToken = savedCookies.csrftoken || "missing";
  const cookieHeader = Object.entries(savedCookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const form = new URLSearchParams({
    username,
    verificationCode: String(verificationCode).trim(),
    identifier: twoFactorIdentifier,
    queryParams: "{}",
  });

  const res = await fetch(
    "https://www.instagram.com/api/v1/web/accounts/login/ajax/two_factor/",
    {
      method: "POST",
      headers: {
        "User-Agent": WEB_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        "X-IG-App-ID": "936619743392459",
        Referer: "https://www.instagram.com/accounts/login/two_factor",
        Origin: "https://www.instagram.com",
        Cookie: cookieHeader,
      },
      body: form.toString(),
    }
  );

  const newCookies = parseSetCookieHeaders(res.headers);
  const mergedCookies = { ...savedCookies, ...newCookies };
  const data = await res.json();

  if (data.authenticated) {
    await hydrateIgFromWebCookies(ig, mergedCookies, data.userId);
    const currentUser = await ig.account.currentUser().catch(() => null);
    return (
      currentUser || {
        pk: String(data.userId || mergedCookies.ds_user_id || ""),
        username,
        full_name: username,
        is_private: false,
      }
    );
  }

  throw new Error(data.message || "Invalid 2FA verification code.");
}

/**
 * Multi-Account Instagram Private API Session & Authentication Manager.
 */
export class AuthManager {
  constructor({ baseDir, clientFactory } = {}) {
    this.baseDir =
      baseDir ||
      (process.env.IG_AUTH_DIR ? path.resolve(process.env.IG_AUTH_DIR) : DEFAULT_BASE_DIR);
    this.clientFactory = clientFactory || (() => new IgApiClient());
    this.clients = new Map();
  }

  getPaths(username = null) {
    return getAuthPaths(this.baseDir, username);
  }

  readRegistry() {
    const { accountsPath } = this.getPaths();
    if (!fs.existsSync(accountsPath)) {
      return { defaultAccount: null, accounts: {} };
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(accountsPath, "utf-8"));
      return {
        defaultAccount: parsed.defaultAccount || null,
        accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {},
      };
    } catch {
      return { defaultAccount: null, accounts: {} };
    }
  }

  writeRegistry(registry) {
    const { authDir, accountsPath } = this.getPaths();
    ensureSecureDir(authDir);
    writeSecureJson(accountsPath, registry);
  }

  getDefaultAccount() {
    const registry = this.readRegistry();
    if (registry.defaultAccount) {
      return normalizeUsername(registry.defaultAccount);
    }
    const keys = Object.keys(registry.accounts);
    if (keys.length > 0) {
      return normalizeUsername(keys[0]);
    }
    if (process.env.IG_USERNAME) {
      return normalizeUsername(process.env.IG_USERNAME);
    }
    return "";
  }

  getEnvAccountsMap() {
    const map = {};
    if (process.env.IG_ACCOUNTS_JSON) {
      try {
        const parsed = JSON.parse(process.env.IG_ACCOUNTS_JSON);
        if (parsed && typeof parsed === "object") {
          for (const [user, pass] of Object.entries(parsed)) {
            const norm = normalizeUsername(user);
            if (norm && typeof pass === "string") {
              map[norm] = pass;
            }
          }
        }
      } catch {
        // Ignore malformed IG_ACCOUNTS_JSON
      }
    }
    if (process.env.IG_USERNAME && process.env.IG_PASSWORD) {
      map[normalizeUsername(process.env.IG_USERNAME)] = process.env.IG_PASSWORD;
    }
    return map;
  }

  getSavedPassword(username) {
    const norm = normalizeUsername(username);
    if (!norm) return "";
    const registry = this.readRegistry();
    if (registry.accounts[norm]?.password) {
      return registry.accounts[norm].password;
    }
    const envMap = this.getEnvAccountsMap();
    if (envMap[norm]) {
      return envMap[norm];
    }
    if (
      process.env.IG_PASSWORD &&
      (!process.env.IG_USERNAME || normalizeUsername(process.env.IG_USERNAME) === norm)
    ) {
      return process.env.IG_PASSWORD;
    }
    return "";
  }

  registerAccount(username, userObj = {}, { password = null, setDefault = false, saveCredentials = true } = {}) {
    const norm = normalizeUsername(username);
    const { sessionPath } = this.getPaths(norm);
    const registry = this.readRegistry();
    const existing = registry.accounts[norm] || {};

    const record = {
      username: norm,
      pk: String(userObj.pk || existing.pk || ""),
      full_name: userObj.full_name ?? existing.full_name ?? "",
      is_private: Boolean(userObj.is_private ?? existing.is_private ?? false),
      profile_pic_url: userObj.profile_pic_url ?? existing.profile_pic_url ?? "",
      session_path: sessionPath,
      updated_at: new Date().toISOString(),
    };

    if (saveCredentials !== false && (password || existing.password)) {
      record.password = password || existing.password;
    }

    registry.accounts[norm] = record;
    if (!registry.defaultAccount || setDefault) {
      registry.defaultAccount = norm;
    }

    this.writeRegistry(registry);
    return registry;
  }

  createWiredClient(username) {
    const norm = normalizeUsername(username);
    const { sessionPath } = this.getPaths(norm);
    const ig = this.clientFactory(norm);
    ig._accountUsername = norm;
    if (ig?.state?.constants) {
      ig.state.constants = {
        ...ig.state.constants,
        APP_VERSION: "317.0.0.34.109",
        APP_VERSION_CODE: "566224607",
      };
    }
    if (ig?.request) {
      ig.request.defaults = {
        ...(ig.request.defaults || {}),
        forever: true,
        headers: {
          ...(ig.request.defaults?.headers || {}),
          Connection: "keep-alive",
        },
      };
    }
    let saveTimer = null;
    ig.request?.end$?.subscribe(() => {
      if (ig._isAuthenticated || ig.state?.authorization) {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          saveSession(ig, sessionPath).catch(() => {});
        }, 150);
        saveTimer.unref?.();
      }
    });
    return ig;
  }

  readPendingState(username) {
    const { pendingAuthPath, authDir } = this.getPaths(username);
    if (fs.existsSync(pendingAuthPath)) {
      try {
        return {
          path: pendingAuthPath,
          data: JSON.parse(fs.readFileSync(pendingAuthPath, "utf-8")),
        };
      } catch {
        return null;
      }
    }
    const fallbackPath = path.join(authDir, "pending_auth.json");
    if (fs.existsSync(fallbackPath)) {
      try {
        return {
          path: fallbackPath,
          data: JSON.parse(fs.readFileSync(fallbackPath, "utf-8")),
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  savePendingState(username, payload) {
    const { authDir, pendingAuthPath } = this.getPaths(username);
    ensureSecureDir(authDir);
    writeSecureJson(pendingAuthPath, payload);
  }

  clearPendingState(username) {
    const { pendingAuthPath, authDir } = this.getPaths(username);
    if (fs.existsSync(pendingAuthPath)) {
      fs.rmSync(pendingAuthPath, { force: true });
    }
    const fallbackPath = path.join(authDir, "pending_auth.json");
    if (fs.existsSync(fallbackPath)) {
      fs.rmSync(fallbackPath, { force: true });
    }
  }

  async login({
    username,
    password,
    verificationCode,
    verificationMethod,
    setDefault = false,
    saveCredentials = true,
  } = {}) {
    const resolvedUsername = normalizeUsername(
      username || process.env.IG_USERNAME || this.getDefaultAccount()
    );
    if (!resolvedUsername) {
      throw new Error(
        "Instagram username is required. Provide `username` directly, set IG_USERNAME, or run `npm run login`."
      );
    }

    const { authDir, sessionsDir, sessionPath } = this.getPaths(resolvedUsername);
    ensureSecureDir(authDir);
    ensureSecureDir(sessionsDir);

    // 1. Handle pending 2FA or Checkpoint completion when verificationCode is provided
    if (verificationCode) {
      const pending = this.readPendingState(resolvedUsername);
      if (!pending) {
        throw new Error(
          `No pending 2FA or checkpoint challenge found for @${resolvedUsername}. Start login with username and password first.`
        );
      }

      const { data: pendingData } = pending;
      const ig = this.createWiredClient(resolvedUsername);
      ig.state.generateDevice(resolvedUsername);
      if (pendingData.serializedState) {
        await ig.state.deserialize(pendingData.serializedState);
      }

      if (pendingData.type === "two_factor") {
        const tfInfo = pendingData.twoFactorInfo;
        const method =
          verificationMethod || (tfInfo.totpTwoFactorOn ? "0" : "1");
        let loggedInUser;
        if (pendingData.webCookies) {
          loggedInUser = await twoFactorViaWebAjax(
            ig,
            resolvedUsername,
            verificationCode,
            tfInfo.twoFactorIdentifier,
            pendingData.webCookies
          );
        } else {
          loggedInUser = await ig.account.twoFactorLogin({
            username: resolvedUsername,
            verificationCode: String(verificationCode).trim(),
            twoFactorIdentifier: tfInfo.twoFactorIdentifier,
            trustThisDevice: "1",
            verificationMethod: String(method),
          });
        }

        this.clearPendingState(resolvedUsername);
        await saveSession(ig, sessionPath);
        const registry = this.registerAccount(resolvedUsername, loggedInUser, {
          password: password || pendingData.password || this.getSavedPassword(resolvedUsername),
          setDefault,
          saveCredentials,
        });
        this.clients.set(resolvedUsername, ig);

        return {
          status: "authenticated",
          username: resolvedUsername,
          account: resolvedUsername,
          default_account: registry.defaultAccount,
          user: loggedInUser,
        };
      }

      if (pendingData.type === "checkpoint") {
        if (pendingData.checkpoint) {
          ig.state.checkpoint = pendingData.checkpoint;
        }
        const challengeRes = await ig.challenge.sendSecurityCode(
          String(verificationCode).trim()
        );
        const loggedInUser =
          challengeRes?.logged_in_user ||
          (await ig.account.currentUser().catch(() => ({
            username: resolvedUsername,
            pk: ig.state.cookieUserId || "",
          })));

        this.clearPendingState(resolvedUsername);
        await saveSession(ig, sessionPath);
        const registry = this.registerAccount(resolvedUsername, loggedInUser, {
          password: password || pendingData.password || this.getSavedPassword(resolvedUsername),
          setDefault,
          saveCredentials,
        });
        this.clients.set(resolvedUsername, ig);

        return {
          status: "authenticated",
          username: resolvedUsername,
          account: resolvedUsername,
          default_account: registry.defaultAccount,
          user: loggedInUser,
        };
      }
    }

    // 2. Standard username + password login
    const resolvedPassword =
      password || this.getSavedPassword(resolvedUsername) || process.env.IG_PASSWORD;
    if (!resolvedPassword) {
      throw new Error(
        `Instagram password is required for @${resolvedUsername}. Provide \`password\` directly or run \`npm run login\`.`
      );
    }

    const ig = this.createWiredClient(resolvedUsername);
    ig.state.generateDevice(resolvedUsername);
    await ig.simulate?.preLoginFlow?.().catch(() => {});

    try {
      let loggedInUser;
      try {
        loggedInUser = await ig.account.login(resolvedUsername, resolvedPassword);
      } catch (mobileErr) {
        const isUpgradeError =
          mobileErr?.response?.body?.error_type === "needs_upgrade" ||
          /version of Instagram is out of date/i.test(mobileErr?.message || "");
        if (!isUpgradeError) {
          throw mobileErr;
        }
        loggedInUser = await loginViaWebAjax(
          ig,
          resolvedUsername,
          resolvedPassword,
          sessionPath
        );
      }

      this.clearPendingState(resolvedUsername);
      await saveSession(ig, sessionPath);
      const registry = this.registerAccount(resolvedUsername, loggedInUser, {
        password: resolvedPassword,
        setDefault,
        saveCredentials,
      });
      this.clients.set(resolvedUsername, ig);

      return {
        status: "authenticated",
        username: resolvedUsername,
        account: resolvedUsername,
        default_account: registry.defaultAccount,
        user: loggedInUser,
      };
    } catch (err) {
      if (
        err instanceof IgLoginTwoFactorRequiredError ||
        err?.name === "IgLoginTwoFactorRequiredError" ||
        err?.response?.body?.two_factor_required
      ) {
        const info = err?.response?.body?.two_factor_info || {};
        const twoFactorInfo = {
          username: normalizeUsername(info.username || resolvedUsername),
          twoFactorIdentifier: info.two_factor_identifier,
          totpTwoFactorOn: Boolean(info.totp_two_factor_on),
          smsTwoFactorOn: Boolean(info.sms_two_factor_on),
          obfuscatedPhoneNumber: info.obfuscated_phone_number || "",
        };
        const serializedState = await ig.state.serialize();
        delete serializedState.constants;

        this.savePendingState(resolvedUsername, {
          type: "two_factor",
          username: resolvedUsername,
          password: saveCredentials !== false ? resolvedPassword : null,
          twoFactorInfo,
          webCookies: err.webCookies || null,
          serializedState,
          createdAt: new Date().toISOString(),
        });

        return {
          status: "two_factor_required",
          username: resolvedUsername,
          account: resolvedUsername,
          two_factor_info: twoFactorInfo,
          message: twoFactorInfo.totpTwoFactorOn
            ? `2FA required for @${resolvedUsername}: provide the 6-digit TOTP authenticator code via verification_code.`
            : `2FA required for @${resolvedUsername}: provide the SMS code sent to ${twoFactorInfo.obfuscatedPhoneNumber || "your phone"} via verification_code.`,
        };
      }

      if (
        err instanceof IgCheckpointError ||
        err?.name === "IgCheckpointError" ||
        err?.response?.body?.message === "challenge_required"
      ) {
        await ig.challenge.auto(true).catch(() => {});
        const serializedState = await ig.state.serialize();
        delete serializedState.constants;

        this.savePendingState(resolvedUsername, {
          type: "checkpoint",
          username: resolvedUsername,
          password: saveCredentials !== false ? resolvedPassword : null,
          checkpoint: ig.state.checkpoint,
          challengeUrl: err.url || err?.response?.body?.challenge?.url || "",
          serializedState,
          createdAt: new Date().toISOString(),
        });

        return {
          status: "checkpoint_required",
          username: resolvedUsername,
          account: resolvedUsername,
          challenge_url: err.url || err?.response?.body?.challenge?.url || "",
          message: `Instagram checkpoint challenge triggered for @${resolvedUsername}. Check your email/SMS for a security code and call login with verification_code.`,
        };
      }

      throw err;
    }
  }

  async getClient({ account, username, password, requireAuth = true } = {}) {
    const targetUser = normalizeUsername(
      account || username || this.getDefaultAccount() || process.env.IG_USERNAME || ""
    );

    if (!targetUser) {
      if (!requireAuth) {
        return this.clientFactory("");
      }
      throw new Error(
        "No Instagram account configured or specified. Pass `username` and `password` directly, or authenticate first using `instagram_login` / `npm run login`."
      );
    }

    // 1. Active in-memory client
    if (this.clients.has(targetUser)) {
      return this.clients.get(targetUser);
    }

    // 2. Saved session file on disk
    const { sessionPath, legacySessionPath } = this.getPaths(targetUser);
    const candidatePath = fs.existsSync(sessionPath)
      ? sessionPath
      : targetUser === this.getDefaultAccount() && fs.existsSync(legacySessionPath)
      ? legacySessionPath
      : null;

    if (candidatePath) {
      const ig = this.createWiredClient(targetUser);
      ig.state.generateDevice(targetUser);
      const loaded = await loadSession(ig, candidatePath);
      if (loaded) {
        if (password) {
          this.registerAccount(
            targetUser,
            {},
            { password, setDefault: false, saveCredentials: true }
          );
        }
        this.clients.set(targetUser, ig);
        return ig;
      }
    }

    // 3. Inline password or stored/env credentials auto-login
    const resolvedPassword = password || this.getSavedPassword(targetUser);
    if (resolvedPassword) {
      const loginRes = await this.login({
        username: targetUser,
        password: resolvedPassword,
      });
      if (loginRes.status === "authenticated" && this.clients.has(targetUser)) {
        return this.clients.get(targetUser);
      }
      throw new Error(
        loginRes.message ||
          `Authentication for @${targetUser} returned status: ${loginRes.status}`
      );
    }

    if (!requireAuth) {
      return this.createWiredClient(targetUser);
    }

    throw new Error(
      `Account @${targetUser} is not authenticated. Pass \`username\` and \`password\` inline, or run \`instagram_login\` / \`npm run login\`.`
    );
  }

  async saveSessionFromCookies({
    sessionId,
    username,
    csrfToken = "",
    dsUserId = null,
    setDefault = true,
  } = {}) {
    const normUser = normalizeUsername(
      username || this.getDefaultAccount() || "deepans.designstudio"
    );
    if (!normUser) {
      throw new Error("Instagram username/account is required to save session cookies.");
    }
    let cleanSessionId = String(sessionId || "").trim();
    if (cleanSessionId.startsWith("sessionid=")) {
      cleanSessionId = cleanSessionId.slice("sessionid=".length);
    }
    cleanSessionId = cleanSessionId.replace(/;.*$/, "").trim();

    if (!cleanSessionId) {
      throw new Error("sessionid cookie is required.");
    }

    const resolvedUserId = dsUserId || cleanSessionId.split(/%3A|:/i)[0];
    const cookieMap = {
      sessionid: cleanSessionId.includes("%3A") ? cleanSessionId : encodeURIComponent(cleanSessionId),
      ds_user_id: String(resolvedUserId),
      csrftoken: String(csrfToken || "missing"),
    };

    const ig = this.createWiredClient(normUser);
    ig.state.generateDevice(normUser);
    await hydrateIgFromWebCookies(ig, cookieMap, resolvedUserId);

    let userObj = null;
    try {
      userObj = await ig.account.currentUser();
    } catch {
      try {
        userObj = await ig.user.info(resolvedUserId);
      } catch {
        userObj = { pk: String(resolvedUserId), username: normUser };
      }
    }

    const { sessionPath } = this.getPaths(normUser);
    await saveSession(ig, sessionPath);
    this.clients.set(normUser, ig);
    this.registerAccount(
      normUser,
      userObj?.user || userObj || { pk: resolvedUserId },
      { setDefault }
    );

    return {
      status: "authenticated",
      username: normUser,
      account: normUser,
      pk: String(userObj?.pk || userObj?.user?.pk || resolvedUserId),
      session_path: sessionPath,
      is_default: Boolean(setDefault),
      message: `Successfully saved active session for @${normUser}. Headless API publishing is now enabled.`,
    };
  }

  listAccounts() {
    const registry = this.readRegistry();
    const accounts = Object.values(registry.accounts).map((entry) => {
      const { password, ...safeMeta } = entry;
      const { sessionPath } = this.getPaths(safeMeta.username);
      const targetSessionPath = safeMeta.session_path || sessionPath;
      return {
        ...safeMeta,
        session_path: targetSessionPath,
        is_default: safeMeta.username === registry.defaultAccount,
        has_saved_password: Boolean(password),
        session_exists: fs.existsSync(targetSessionPath),
      };
    });

    return {
      default_account: registry.defaultAccount,
      total_accounts: accounts.length,
      accounts,
    };
  }

  setDefaultAccount(username) {
    const norm = normalizeUsername(username);
    if (!norm) {
      throw new Error("A valid Instagram username is required to set the default account.");
    }
    const registry = this.readRegistry();
    if (!registry.accounts[norm]) {
      throw new Error(
        `Account @${norm} is not registered. Registered accounts: ${
          Object.keys(registry.accounts).join(", ") || "none"
        }`
      );
    }
    registry.defaultAccount = norm;
    this.writeRegistry(registry);
    return this.listAccounts();
  }

  removeAccount(username) {
    const norm = normalizeUsername(username);
    if (!norm) {
      throw new Error("A valid Instagram username is required to remove an account.");
    }
    const registry = this.readRegistry();
    const entry = registry.accounts[norm];
    const { sessionPath } = this.getPaths(norm);

    this.clients.delete(norm);
    this.clearPendingState(norm);

    if (entry?.session_path && fs.existsSync(entry.session_path)) {
      fs.rmSync(entry.session_path, { force: true });
    }
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { force: true });
    }

    delete registry.accounts[norm];
    if (registry.defaultAccount === norm) {
      const remaining = Object.keys(registry.accounts);
      registry.defaultAccount = remaining.length > 0 ? remaining[0] : null;
    }

    this.writeRegistry(registry);
    return this.listAccounts();
  }

  async getStatus({ account, username } = {}) {
    const listed = this.listAccounts();
    const targetUser = normalizeUsername(
      account || username || listed.default_account || process.env.IG_USERNAME || ""
    );

    if (!targetUser) {
      return {
        authenticated: false,
        account: null,
        default_account: listed.default_account,
        total_accounts: listed.total_accounts,
        accounts: listed.accounts,
        message:
          "No Instagram accounts configured yet. Use instagram_login or pass username + password directly to any tool.",
      };
    }

    try {
      const ig = await this.getClient({ account: targetUser, requireAuth: true });
      const currentUser = await ig.account.currentUser();
      this.registerAccount(targetUser, currentUser, {
        saveCredentials: true,
      });
      const updatedList = this.listAccounts();
      return {
        authenticated: true,
        account: targetUser,
        default_account: updatedList.default_account,
        total_accounts: updatedList.total_accounts,
        user: {
          pk: currentUser.pk,
          username: currentUser.username || targetUser,
          full_name: currentUser.full_name,
          is_private: currentUser.is_private,
          profile_pic_url: currentUser.profile_pic_url,
        },
        accounts: updatedList.accounts,
      };
    } catch (err) {
      // Attempt automatic re-login if saved password exists and session expired
      const savedPassword = this.getSavedPassword(targetUser);
      if (savedPassword) {
        try {
          this.clients.delete(targetUser);
          const relogin = await this.login({
            username: targetUser,
            password: savedPassword,
          });
          if (relogin.status === "authenticated") {
            const updatedList = this.listAccounts();
            return {
              authenticated: true,
              account: targetUser,
              default_account: updatedList.default_account,
              total_accounts: updatedList.total_accounts,
              user: relogin.user,
              accounts: updatedList.accounts,
            };
          }
        } catch {
          // Fall through to unauthenticated return
        }
      }

      const updatedList = this.listAccounts();
      const savedEntry = updatedList.accounts.find((a) => a.username === targetUser);
      if (savedEntry && savedEntry.session_exists) {
        return {
          authenticated: true,
          account: targetUser,
          default_account: updatedList.default_account,
          total_accounts: updatedList.total_accounts,
          user: {
            pk: savedEntry.pk || "",
            username: savedEntry.username,
            full_name: savedEntry.full_name || savedEntry.username,
            is_private: Boolean(savedEntry.is_private),
            profile_pic_url: savedEntry.profile_pic_url || "",
          },
          accounts: updatedList.accounts,
        };
      }

      return {
        authenticated: false,
        account: targetUser,
        default_account: listed.default_account,
        total_accounts: listed.total_accounts,
        accounts: listed.accounts,
        error: err.message,
      };
    }
  }
}

export const authManager = new AuthManager();
