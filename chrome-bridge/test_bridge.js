#!/usr/bin/env node
/**
 * Integration & Security Test Suite for Chrome Extension + Local Bridge
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_AGENTAPI_BIN,
  buildAgentApiArgv,
  loadOrCreateBridgeToken,
  verifyBridgeToken
} from "./bridge_core.js";
import { createBridgeServer } from "./bridge_server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log("=== CHROME BRIDGE & EXTENSION TEST SUITE ===\n");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-test-"));
  const tokenFile = path.join(tmpDir, "test.token");
  let server;

  try {
    await runCheck("generates 64-char token file with 0600 permissions", () => {
      const tok = loadOrCreateBridgeToken(tokenFile);
      assert.equal(tok.length, 64);
      const mode = fs.statSync(tokenFile).mode & 0o777;
      assert.equal(mode, 0o600);
      assert.equal(loadOrCreateBridgeToken(tokenFile), tok);
    });

    await runCheck("verifyBridgeToken enforces constant-time exact match", () => {
      assert.equal(verifyBridgeToken("abc", "abc"), true);
      assert.equal(verifyBridgeToken("abc", "abd"), false);
      assert.equal(verifyBridgeToken("", "abc"), false);
    });

    await runCheck("agentapi binary exists on host", () => {
      assert.equal(fs.existsSync(DEFAULT_AGENTAPI_BIN), true);
    });

    await runCheck("buildAgentApiArgv formats new-conversation, send-message, and rejects bad ids", () => {
      const argvNew = buildAgentApiArgv({
        mode: "new-conversation",
        model: "flash",
        title: "From Chrome",
        prompt: "Build ad",
        tab: { title: "Sample", url: "https://example.com", selection: "Headline copy", images: ["https://example.com/a.jpg"] }
      });
      assert.equal(argvNew[0], "new-conversation");
      assert.equal(argvNew[1], "--model=flash");
      assert.equal(argvNew[2], "--title=From Chrome");
      assert.ok(argvNew[3].includes("Page URL: https://example.com"));
      assert.ok(argvNew[3].includes("Headline copy"));

      const argvMsg = buildAgentApiArgv({
        mode: "send-message",
        conversation_id: "11073600-f47e-4102-9aa5-db6c626dcf82",
        prompt: "Follow up"
      });
      assert.deepEqual(argvMsg, ["send-message", "11073600-f47e-4102-9aa5-db6c626dcf82", "Follow up"]);

      assert.throws(() => buildAgentApiArgv({ mode: "send-message", conversation_id: "../bad", prompt: "x" }));
    });

    const mockAgentCalls = [];
    const created = createBridgeServer({
      tokenPath: tokenFile,
      execImpl: async (bin, argv) => {
        mockAgentCalls.push({ bin, argv });
        return { stdout: JSON.stringify({ conversationId: "mock-conv-123" }), stderr: "" };
      }
    });
    server = created.server;
    const token = created.token;

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    await runCheck("GET /health succeeds without token", async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
    });

    await runCheck("rejects web page origin with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/status`, {
        headers: { Origin: "https://untrusted.example.com", "X-Bridge-Token": token }
      });
      assert.equal(res.status, 403);
    });

    await runCheck("rejects missing or invalid X-Bridge-Token with 401", async () => {
      const r1 = await fetch(`${baseUrl}/status`);
      assert.equal(r1.status, 401);
      const r2 = await fetch(`${baseUrl}/status`, {
        headers: { Origin: "chrome-extension://abcdefghijklmnop", "X-Bridge-Token": "wrong" }
      });
      assert.equal(r2.status, 401);
    });

    await runCheck("allows chrome-extension:// origin with valid token on /status", async () => {
      const res = await fetch(`${baseUrl}/status`, {
        headers: { Origin: "chrome-extension://abcdefghijklmnop", "X-Bridge-Token": token }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, "ok");
      assert.equal(res.headers.get("access-control-allow-origin"), "chrome-extension://abcdefghijklmnop");
    });

    await runCheck("POST /tool executes brand_anti_sameness_audit and motion_sync_timeline", async () => {
      const r1 = await fetch(`${baseUrl}/tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "chrome-extension://abcdefghijklmnop",
          "X-Bridge-Token": token
        },
        body: JSON.stringify({ tool: "brand_anti_sameness_audit", arguments: { category: "matcha", brand_name: "MIRAI" } })
      });
      assert.equal(r1.status, 200);
      const d1 = await r1.json();
      assert.equal(d1.ok, true);
      assert.equal(d1.result.matched_profile, "matcha");

      const r2 = await fetch(`${baseUrl}/tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "chrome-extension://abcdefghijklmnop",
          "X-Bridge-Token": token
        },
        body: JSON.stringify({ tool: "motion_sync_timeline", arguments: { text: "BOLD PURE", bpm: 120, duration_seconds: 4 } })
      });
      assert.equal(r2.status, 200);
      const d2 = await r2.json();
      assert.equal(d2.result.gsap_timeline_schedule.length, 2);
    });

    await runCheck("POST /antigravity dispatches safely to agentapi with tab context", async () => {
      const res = await fetch(`${baseUrl}/antigravity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "chrome-extension://abcdefghijklmnop",
          "X-Bridge-Token": token
        },
        body: JSON.stringify({
          mode: "new-conversation",
          model: "flash",
          prompt: "Audit this brand",
          tab: { title: "Brand Page", url: "https://example.org", selection: "Tagline" }
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.data.conversationId, "mock-conv-123");
      assert.equal(mockAgentCalls.length, 1);
      assert.equal(mockAgentCalls[0].bin, DEFAULT_AGENTAPI_BIN);
      assert.ok(mockAgentCalls[0].argv[2].includes("Page URL: https://example.org"));
    });

    await runCheck("Manifest V3 Chrome extension files are valid and CSP-compliant", () => {
      const extDir = path.join(__dirname, "extension");
      const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
      assert.equal(manifest.manifest_version, 3);
      assert.ok(manifest.permissions.includes("sidePanel"));
      assert.ok(manifest.host_permissions.includes("http://127.0.0.1/*"));
      for (const rel of ["background.js", "sidepanel.html", "sidepanel.css", "sidepanel.js"]) {
        assert.equal(fs.existsSync(path.join(extDir, rel)), true, `Missing ${rel}`);
      }
      const html = fs.readFileSync(path.join(extDir, "sidepanel.html"), "utf8");
      assert.equal(/<script[^>]*>[^<]+<\/script>/i.test(html), false, "No inline scripts allowed in MV3");
    });
  } finally {
    if (server) server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\nRESULT: ${passed}/${passed + failed} checks passed (${failed} failed)`);
  if (failed > 0) process.exit(1);
}

main();
