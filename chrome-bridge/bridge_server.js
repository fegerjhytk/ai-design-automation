#!/usr/bin/env node
/**
 * Token-Secured Local HTTP Bridge for Chrome Extension -> AI Design Workflow + Antigravity
 *
 * Binds strictly to 127.0.0.1 and validates chrome-extension:// Origin + X-Bridge-Token.
 */

import http from "node:http";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_TOKEN_PATH,
  dispatchToAntigravity,
  dispatchWorkflowTool,
  isAllowedOrigin,
  loadOrCreateBridgeToken,
  verifyBridgeToken
} from "./bridge_core.js";
import { getDesignWorkflowStatus } from "../ai-design-workflow/lib/workflow.js";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body exceeds 1 MB limit"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });
    req.on("error", reject);
  });
}

export function createBridgeServer(options = {}) {
  const token = options.token || loadOrCreateBridgeToken(options.tokenPath || DEFAULT_TOKEN_PATH);

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);

    if (!isAllowedOrigin(req.headers.origin)) {
      sendJson(res, 403, { error: "Forbidden origin: only Chrome extensions or local CLI allowed." });
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${DEFAULT_HOST}`);

    // Unauthenticated liveness probe (exposes no paths or secrets)
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, service: "ai-design-workflow-bridge", version: "1.0.0" });
      return;
    }

    // All operational endpoints require X-Bridge-Token
    const providedToken = req.headers["x-bridge-token"];
    if (!verifyBridgeToken(typeof providedToken === "string" ? providedToken : "", token)) {
      sendJson(res, 401, { error: "Unauthorized: invalid or missing X-Bridge-Token." });
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/status") {
        sendJson(res, 200, getDesignWorkflowStatus());
        return;
      }

      if (req.method === "POST" && url.pathname === "/tool") {
        const body = await readJsonBody(req);
        const result = await dispatchWorkflowTool(body.tool, body.arguments || {});
        sendJson(res, 200, { ok: true, tool: body.tool, result });
        return;
      }

      if (req.method === "POST" && url.pathname === "/antigravity") {
        const body = await readJsonBody(req);
        const result = await dispatchToAntigravity(body, {
          agentapiBin: options.agentapiBin,
          execImpl: options.execImpl
        });
        sendJson(res, 200, { ok: true, ...result });
        return;
      }

      sendJson(res, 404, { error: `Not found: ${req.method} ${url.pathname}` });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
  });

  return { server, token };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const token = loadOrCreateBridgeToken();

  if (args.includes("--print-token")) {
    process.stdout.write(`${token}\n`);
    process.exit(0);
  }

  const portArgIdx = args.indexOf("--port");
  const port = portArgIdx !== -1 && args[portArgIdx + 1] ? Number(args[portArgIdx + 1]) : DEFAULT_PORT;

  const { server } = createBridgeServer({ token });
  server.listen(port, DEFAULT_HOST, () => {
    console.log(`[ai-design-bridge] Listening on http://${DEFAULT_HOST}:${port}`);
    console.log(`[ai-design-bridge] Token file: ${DEFAULT_TOKEN_PATH}`);
    console.log(`[ai-design-bridge] Run with --print-token to display the extension token.`);
  });
}
