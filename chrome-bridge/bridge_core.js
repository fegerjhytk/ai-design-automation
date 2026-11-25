/**
 * Shared Core Logic for the AI Design Workflow Local Bridge
 *
 * Handles:
 * - Secure local token creation/loading (~/.gemini/config/ai-design-bridge.token, mode 0600)
 * - Origin validation (allows chrome-extension:// or non-browser CLI clients only)
 * - Direct deterministic dispatch to ai-design-workflow/lib/*
 * - Safe Antigravity dispatch via documented agentapi CLI
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { runAntiSamenessAudit } from "../ai-design-workflow/lib/anti_sameness.js";
import { buildBrandIdentity } from "../ai-design-workflow/lib/illustrator.js";
import { auditTypographicKerning } from "../ai-design-workflow/lib/kerning.js";
import { generateMotionSyncTimeline } from "../ai-design-workflow/lib/motion.js";
import { stageEnvironmentalMockup } from "../ai-design-workflow/lib/stage.js";
import {
  getDesignWorkflowStatus,
  runDesignWorkflowAction,
  runDesignWorkflowPreflight
} from "../ai-design-workflow/lib/workflow.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = Number(process.env.DESIGN_BRIDGE_PORT || 4815);
export const DEFAULT_TOKEN_PATH = path.join(os.homedir(), ".gemini/config/ai-design-bridge.token");
export const DEFAULT_AGENTAPI_BIN = path.join(os.homedir(), ".gemini/antigravity/bin/agentapi");

export function loadOrCreateBridgeToken(tokenPath = DEFAULT_TOKEN_PATH) {
  if (process.env.DESIGN_BRIDGE_TOKEN && process.env.DESIGN_BRIDGE_TOKEN.trim()) {
    return process.env.DESIGN_BRIDGE_TOKEN.trim();
  }
  if (fs.existsSync(tokenPath)) {
    const existing = fs.readFileSync(tokenPath, "utf8").trim();
    if (existing.length >= 32) {
      return existing;
    }
  }
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(tokenPath, `${generated}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(tokenPath, 0o600);
  } catch {
    // Ignore chmod failures on filesystems that ignore POSIX modes
  }
  return generated;
}

export function isAllowedOrigin(origin) {
  if (!origin) return true; // Non-browser local CLI / curl clients send no Origin header
  if (typeof origin !== "string") return false;
  return origin.startsWith("chrome-extension://");
}

export function verifyBridgeToken(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (!provided || provided.length !== expected.length) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function dispatchWorkflowTool(tool, args = {}) {
  switch (tool) {
    case "design_workflow_status":
      return getDesignWorkflowStatus();

    case "design_workflow_run_action":
      return runDesignWorkflowAction(args);

    case "design_workflow_preflight":
      return runDesignWorkflowPreflight(args);

    case "brand_anti_sameness_audit":
      if (!args.category) throw new Error("category is required");
      return runAntiSamenessAudit(args.category, args.audience, args.brand_name);

    case "audit_typographic_kerning":
      if (!args.wordmark) throw new Error("wordmark is required");
      return auditTypographicKerning(args.wordmark, args.font_name);

    case "illustrator_build_identity":
      if (!args.project_name || !args.wordmark) {
        throw new Error("project_name and wordmark are required");
      }
      return buildBrandIdentity({
        projectName: args.project_name,
        wordmark: args.wordmark,
        fontName: args.font_name,
        tracking: args.tracking,
        primaryColorHex: args.primary_color_hex,
        secondarySealName: args.secondary_seal_name
      });

    case "stage_environmental_mockup":
      if (!args.brand_name) throw new Error("brand_name is required");
      return stageEnvironmentalMockup({
        brandName: args.brand_name,
        containerType: args.container_type,
        primaryColor: args.primary_color,
        lightingPreset: args.lighting_preset,
        aspectRatio: args.aspect_ratio
      });

    case "motion_sync_timeline":
      if (!args.text) throw new Error("text is required");
      return generateMotionSyncTimeline({
        text: args.text,
        bpm: args.bpm,
        durationSeconds: args.duration_seconds,
        easing: args.easing
      });

    case "codex_review_dispatch":
      if (!args.image_path || !args.category) {
        throw new Error("image_path and category are required");
      }
      return {
        target_image: args.image_path,
        category: args.category,
        codex_system_rubric:
          "You are OpenAI Codex acting as Lead Brand Director. Evaluate this brand artwork on a scale of 1-10 for distinctiveness. Flag any category cliches (predictable colors, cliche icons, generic fonts), confirm whether the primary wordmark stands alone powerfully without relying on an icon crutch, and propose 2 unconventional material/texture pivots.",
        suggested_slash_command: `/ask-codex "Critique this ${args.category} design at ${args.image_path} against category cliches."`
      };

    default:
      throw new Error(`Unknown tool: ${String(tool)}`);
  }
}

export function formatPromptWithTabContext(prompt, tab = null) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("prompt must be a non-empty string");
  }
  const cleanPrompt = prompt.trim();
  if (!tab || (!tab.url && !tab.title && !tab.selection && !(tab.images && tab.images.length))) {
    return cleanPrompt;
  }

  const lines = [cleanPrompt, "", "--- Browser Context ---"];
  if (tab.title) lines.push(`Page Title: ${String(tab.title)}`);
  if (tab.url) lines.push(`Page URL: ${String(tab.url)}`);
  if (tab.selection) {
    lines.push(`Selected Text:\n${String(tab.selection).slice(0, 4000)}`);
  }
  if (Array.isArray(tab.images) && tab.images.length > 0) {
    const imgs = tab.images.slice(0, 10).map((u) => `- ${String(u)}`);
    lines.push(`Captured Image URLs:\n${imgs.join("\n")}`);
  }
  return lines.join("\n");
}

const ALLOWED_MODELS = new Set(["flash_lite", "flash", "pro"]);

export function buildAgentApiArgv(payload = {}) {
  const mode = payload.mode || "new-conversation";
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "";

  if (mode === "new-conversation") {
    const fullPrompt = formatPromptWithTabContext(payload.prompt, payload.tab);
    const argv = ["new-conversation"];
    if (typeof payload.model === "string" && payload.model.trim()) {
      const m = payload.model.trim();
      if (!ALLOWED_MODELS.has(m) && !/^[a-zA-Z0-9._-]+$/.test(m)) {
        throw new Error("Invalid model identifier");
      }
      argv.push(`--model=${m}`);
    }
    if (title) {
      argv.push(`--title=${title}`);
    }
    argv.push(fullPrompt);
    return argv;
  }

  if (mode === "send-message") {
    const recipient = typeof payload.conversation_id === "string" ? payload.conversation_id.trim() : "";
    if (!recipient || !/^[a-zA-Z0-9_-]+$/.test(recipient)) {
      throw new Error("Valid conversation_id is required for send-message");
    }
    const fullContent = formatPromptWithTabContext(payload.prompt, payload.tab);
    const argv = ["send-message"];
    if (title) {
      argv.push(`--title=${title}`);
    }
    argv.push(recipient, fullContent);
    return argv;
  }

  if (mode === "metadata") {
    const id = typeof payload.conversation_id === "string" ? payload.conversation_id.trim() : "";
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error("Valid conversation_id is required for metadata");
    }
    return ["get-conversation-metadata", id];
  }

  throw new Error(`Unsupported Antigravity bridge mode: ${String(mode)}`);
}

export async function dispatchToAntigravity(payload = {}, options = {}) {
  const agentapiBin = options.agentapiBin || DEFAULT_AGENTAPI_BIN;
  const execImpl = options.execImpl || execFileAsync;

  if (!options.execImpl && !fs.existsSync(agentapiBin)) {
    throw new Error(`agentapi binary not found at ${agentapiBin}`);
  }

  const argv = buildAgentApiArgv(payload);
  const { stdout, stderr } = await execImpl(agentapiBin, argv, {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024
  });

  const outText = (stdout || "").trim();
  let parsed = null;
  try {
    parsed = JSON.parse(outText);
  } catch {
    parsed = null;
  }

  return {
    status: "ok",
    mode: payload.mode || "new-conversation",
    argv_summary: argv.slice(0, -1),
    stdout: outText,
    stderr: (stderr || "").trim(),
    data: parsed
  };
}
