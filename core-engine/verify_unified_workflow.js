#!/usr/bin/env node
/**
 * End-to-End Verification Suite for the Unified AI Design Workflow
 *
 * Verifies:
 * 1. Single-source symlink wiring & deduplication
 * 2. JSON configuration & manifest validity
 * 3. Node.js & Python syntax/compile checks across all modules
 * 4. MCP stdio JSON-RPC handshake, ping, unknown-method handling, and tool execution
 * 5. Core-engine Python tests, GSD test_pipeline.js, and sub-skill CLI smoke checks
 */

import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(REPO_DIR, "ai-design-workflow");
const SERVER_PATH = path.join(PLUGIN_DIR, "server.js");
const LEGACY_SERVER_PATH = path.join(REPO_DIR, "mcp-servers/brand-engine-mcp/server.js");
const HOME_CFG = path.join(os.homedir(), ".gemini/config");

let passed = 0;
let failed = 0;

function check(condition, label, detail = "") {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}${detail ? ` -> ${detail}` : ""}`);
    failed++;
  }
}

function listFiles(dir, extFilter) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "cache") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, extFilter));
    } else if (extFilter(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function testMcpServer(entryPath, label) {
  console.log(`\n--- Suite 4 (${label}): MCP JSON-RPC Protocol & Tools ---`);
  const child = spawn(process.execPath, [entryPath], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdoutBuf = "";
  let stderrBuf = "";
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString("utf8");
    let idx;
    while ((idx = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, idx).trim();
      stdoutBuf = stdoutBuf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve, timer } = pending.get(msg.id);
          clearTimeout(timer);
          pending.delete(msg.id);
          resolve(msg);
        }
      } catch (err) {
        stderrBuf += `Invalid JSON line from server: ${line}\n`;
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString("utf8");
  });

  function sendReq(id, method, params = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
      }, 15000);
      pending.set(id, { resolve, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  function sendNotify(method, params = {}) {
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  try {
    const init = await sendReq(1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "unified-verifier", version: "1.0" }
    });
    check(
      init?.result?.serverInfo?.name === "ai-design-workflow" &&
        init?.result?.protocolVersion === "2024-11-05",
      `${label}: initialize handshake`,
      JSON.stringify(init)
    );

    sendNotify("notifications/initialized", {});

    const pingResp = await sendReq(2, "ping", {});
    check(
      pingResp?.result && typeof pingResp.result === "object" && !pingResp.error,
      `${label}: ping returns empty result (unblocks MCP mounting)`,
      JSON.stringify(pingResp)
    );

    const unknownResp = await sendReq(3, "resources/list", {});
    check(
      unknownResp?.error?.code === -32601,
      `${label}: unknown method returns JSON-RPC -32601 instead of hanging`,
      JSON.stringify(unknownResp)
    );

    const listResp = await sendReq(4, "tools/list", {});
    const toolNames = (listResp?.result?.tools || []).map((t) => t.name);
    const expectedTools = [
      "design_workflow_status",
      "design_workflow_run_action",
      "design_workflow_preflight",
      "brand_anti_sameness_audit",
      "audit_typographic_kerning",
      "illustrator_build_identity",
      "stage_environmental_mockup",
      "motion_sync_timeline",
      "codex_review_dispatch"
    ];
    check(
      expectedTools.every((name) => toolNames.includes(name)) && toolNames.length === 9,
      `${label}: tools/list exposes all 9 unified tools`,
      `got ${toolNames.join(", ")}`
    );

    if (label === "primary") {
      const parseTool = (resp) => JSON.parse(resp.result.content[0].text);

      const statusCall = await sendReq(5, "tools/call", { name: "design_workflow_status", arguments: {} });
      const statusJson = parseTool(statusCall);
      check(
        !statusCall.result.isError &&
          statusJson.status === "ok" &&
          statusJson.global_symlinks?.plugin_linked === true &&
          statusJson.global_symlinks?.master_skill_linked === true,
        "tool design_workflow_status verifies repo, symlinks, and Adobe environment"
      );

      const auditCall = await sendReq(6, "tools/call", {
        name: "brand_anti_sameness_audit",
        arguments: { category: "matcha", brand_name: "MIRAI" }
      });
      const auditJson = parseTool(auditCall);
      check(
        !auditCall.result.isError &&
          Boolean(auditJson.negative_prompt_injection) &&
          auditJson.matched_profile === "matcha",
        "tool brand_anti_sameness_audit returns counter-anchor & negative prompt"
      );

      const kernCall = await sendReq(7, "tools/call", {
        name: "audit_typographic_kerning",
        arguments: { wordmark: "AVENUE", font_name: "IvyPrestoDisplay-SemiBold" }
      });
      const kernJson = parseTool(kernCall);
      check(
        !kernCall.result.isError && kernJson.traps_detected >= 1 && kernJson.recommended_global_tracking <= -35,
        "tool audit_typographic_kerning detects AV optical trap"
      );

      const stageCall = await sendReq(8, "tools/call", {
        name: "stage_environmental_mockup",
        arguments: { brand_name: "MIRAI", lighting_preset: "retail_shelf", aspect_ratio: "16:9" }
      });
      const stageJson = parseTool(stageCall);
      check(
        !stageCall.result.isError &&
          stageJson.flow_tool_call_payload?.tool === "flow_generate_image" &&
          stageJson.aspect_ratio === "16:9",
        "tool stage_environmental_mockup returns Google Flow payload"
      );

      const motionCall = await sendReq(9, "tools/call", {
        name: "motion_sync_timeline",
        arguments: { text: "BOLD PURE DESIGN", bpm: 120, duration_seconds: 4 }
      });
      const motionJson = parseTool(motionCall);
      check(
        !motionCall.result.isError &&
          motionJson.gsap_timeline_schedule?.length === 3 &&
          motionJson.after_effects_jsx.includes("#target aftereffects"),
        "tool motion_sync_timeline returns 3 word keyframes + AE JSX"
      );

      const codexCall = await sendReq(10, "tools/call", {
        name: "codex_review_dispatch",
        arguments: { image_path: "/tmp/sample.png", category: "matcha" }
      });
      const codexJson = parseTool(codexCall);
      check(
        !codexCall.result.isError && codexJson.suggested_slash_command.includes("/ask-codex"),
        "tool codex_review_dispatch returns structured critique payload"
      );

      const preflightCall = await sendReq(11, "tools/call", {
        name: "design_workflow_preflight",
        arguments: { mode: "core_engine_tests" }
      });
      const preflightJson = parseTool(preflightCall);
      check(
        !preflightCall.result.isError && preflightJson.status === "ok" && preflightJson.output.includes("OK"),
        "tool design_workflow_preflight runs core-engine Python unittest suite"
      );

      for (const [idx, action] of ["ps-status", "ae-status", "ai-video-status", "chrome-status"].entries()) {
        const actCall = await sendReq(12 + idx, "tools/call", {
          name: "design_workflow_run_action",
          arguments: { action }
        });
        const actJson = parseTool(actCall);
        check(
          !actCall.result.isError && actJson.status === "ok",
          `tool design_workflow_run_action --action ${action}`
        );
      }
    }
  } catch (err) {
    check(false, `${label}: MCP stdio test error`, err.message);
  } finally {
    child.stdin.end();
    child.kill("SIGTERM");
  }
}

async function main() {
  console.log("=== UNIFIED AI DESIGN WORKFLOW VERIFICATION ===");

  console.log("\n--- Suite 1: Single-Source Symlinks & Deduplication ---");
  const pluginLink = path.join(HOME_CFG, "plugins/ai-design-workflow");
  check(
    fs.existsSync(pluginLink) &&
      fs.lstatSync(pluginLink).isSymbolicLink() &&
      fs.realpathSync(pluginLink) === fs.realpathSync(PLUGIN_DIR),
    "Plugin symlink ~/.gemini/config/plugins/ai-design-workflow -> repo"
  );
  check(
    !fs.existsSync(path.join(HOME_CFG, "plugins/brand-engine-mcp")),
    "Legacy duplicate ~/.gemini/config/plugins/brand-engine-mcp removed"
  );
  check(
    !fs.existsSync(path.join(HOME_CFG, "rules/brand-engine-mcp.md")),
    "Redundant ~/.gemini/config/rules/brand-engine-mcp.md consolidated into plugin AGENTS.md"
  );

  const skillPairs = [
    ["ai-design-workflow", path.join(PLUGIN_DIR, "skills/ai-design-workflow")],
    ["anti-sameness-branding", path.join(PLUGIN_DIR, "skills/anti-sameness-branding")],
    ...["illustrator", "indesign", "after-effects"].flatMap((app) => {
      const dir = path.join(REPO_DIR, app, "skills");
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => [d.name, path.join(dir, d.name)]);
    })
  ];
  for (const [name, target] of skillPairs) {
    const linkPath = path.join(HOME_CFG, "skills", name);
    const ok =
      fs.existsSync(linkPath) &&
      fs.lstatSync(linkPath).isSymbolicLink() &&
      fs.realpathSync(linkPath) === fs.realpathSync(target);
    check(ok, `Skill symlink ${name} -> ${path.relative(REPO_DIR, target)}`);
  }

  console.log("\n--- Suite 2: JSON & Config Schema Validation ---");
  const jsonPaths = [
    path.join(PLUGIN_DIR, "plugin.json"),
    path.join(PLUGIN_DIR, "mcp_config.json"),
    path.join(PLUGIN_DIR, "package.json"),
    path.join(HOME_CFG, "mcp_config.json"),
    path.join(REPO_DIR, "mcp-servers/mcp_config.example.json"),
    path.join(REPO_DIR, ".planning/specs/layout-bounds.json"),
    path.join(REPO_DIR, ".planning/specs/creative-matrix.json"),
    path.join(REPO_DIR, "core-engine/square-v1.json"),
    path.join(REPO_DIR, "core-engine/story-v1.json"),
    path.join(REPO_DIR, "core-engine/landscape-v1.json")
  ];
  for (const jp of jsonPaths) {
    try {
      JSON.parse(fs.readFileSync(jp, "utf8"));
      check(true, `Valid JSON: ${path.relative(REPO_DIR, jp)}`);
    } catch (e) {
      check(false, `Valid JSON: ${path.relative(REPO_DIR, jp)}`, e.message);
    }
  }
  const globalMcp = JSON.parse(fs.readFileSync(path.join(HOME_CFG, "mcp_config.json"), "utf8"));
  check(
    Boolean(globalMcp.mcpServers["ai-design-workflow"]) &&
      !globalMcp.mcpServers["brand-engine"] &&
      globalMcp.mcpServers["ai-design-workflow"].command === "/Users/admin/.gemini/antigravity/bin/node" &&
      globalMcp.mcpServers["ai-design-workflow"].args[0] === SERVER_PATH,
    "~/.gemini/config/mcp_config.json registered cleanly to unified ai-design-workflow server"
  );

  console.log("\n--- Suite 3: Syntax & Compile Verification ---");
  const jsFiles = [
    SERVER_PATH,
    LEGACY_SERVER_PATH,
    ...listFiles(path.join(PLUGIN_DIR, "lib"), (f) => f.endsWith(".js")),
    ...listFiles(path.join(REPO_DIR, "chrome-bridge"), (f) => f.endsWith(".js")),
    ...listFiles(path.join(REPO_DIR, "illustrator/skills"), (f) => f.endsWith(".js")),
    ...listFiles(path.join(REPO_DIR, "indesign/skills"), (f) => f.endsWith(".js")),
    ...listFiles(path.join(REPO_DIR, "after-effects/skills"), (f) => f.endsWith(".js"))
  ];
  let jsFail = 0;
  for (const jf of jsFiles) {
    try {
      execFileSync(process.execPath, ["--check", jf], { stdio: "pipe" });
    } catch (e) {
      jsFail++;
      check(false, `node --check ${path.relative(REPO_DIR, jf)}`, e.stderr?.toString() || e.message);
    }
  }
  check(jsFail === 0, `All ${jsFiles.length} JavaScript files pass node --check`);

  const pyFiles = [
    ...listFiles(path.join(REPO_DIR, "core-engine"), (f) => f.endsWith(".py")),
    ...listFiles(path.join(REPO_DIR, "illustrator/skills"), (f) => f.endsWith(".py")),
    ...listFiles(path.join(REPO_DIR, "indesign/skills"), (f) => f.endsWith(".py")),
    ...listFiles(path.join(REPO_DIR, "after-effects/skills"), (f) => f.endsWith(".py"))
  ];
  let pyFail = 0;
  for (const pf of pyFiles) {
    try {
      execFileSync("python3", ["-m", "py_compile", pf], { stdio: "pipe" });
    } catch (e) {
      pyFail++;
      check(false, `py_compile ${path.relative(REPO_DIR, pf)}`, e.stderr?.toString() || e.message);
    }
  }
  check(pyFail === 0, `All ${pyFiles.length} Python files pass py_compile`);

  await testMcpServer(SERVER_PATH, "primary");
  await testMcpServer(LEGACY_SERVER_PATH, "legacy-forwarder");

  console.log("\n--- Suite 5: Core-Engine & Sub-Skill CLI Smoke Checks ---");
  try {
    const res = spawnSync(
      "python3",
      ["-m", "unittest", "discover", "-s", __dirname, "-p", "test_*.py", "-v"],
      { encoding: "utf8" }
    );
    const out = [res.stdout, res.stderr].filter(Boolean).join("\n");
    check(res.status === 0 && out.includes("OK"), "core-engine Python unittest suite passes", out);
  } catch (e) {
    check(false, "core-engine Python unittest suite passes", e.stderr?.toString() || e.message);
  }

  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, "test_pipeline.js")], { encoding: "utf8" });
    check(out.includes("tests passed successfully"), "core-engine/test_pipeline.js GSD suite passes");
  } catch (e) {
    check(false, "core-engine/test_pipeline.js GSD suite passes", e.stderr?.toString() || e.message);
  }

  try {
    const out = execFileSync(process.execPath, [path.join(REPO_DIR, "chrome-bridge/test_bridge.js")], { encoding: "utf8" });
    check(out.includes("checks passed (0 failed)"), "chrome-bridge/test_bridge.js suite passes");
  } catch (e) {
    check(false, "chrome-bridge/test_bridge.js suite passes", e.stderr?.toString() || e.message);
  }

  const uvBin = fs.existsSync("/Users/admin/.local/bin/uv") ? "/Users/admin/.local/bin/uv" : "uv";
  const helpCmds = [
    [process.execPath, [path.join(REPO_DIR, "illustrator/skills/design-automation/scripts/pipeline_runner.js"), "--help"]],
    [process.execPath, [path.join(REPO_DIR, "indesign/skills/indesign-batch-export/scripts/indesign_batch_export.js"), "--help"]],
    [process.execPath, [path.join(REPO_DIR, "indesign/skills/indesign-doc-diff/scripts/indesign-doc-diff.js"), "--help"]],
    [uvBin, ["run", "--offline", "--with", "pillow", "--with", "pymupdf", "python3", path.join(REPO_DIR, "illustrator/skills/design-qc-visual-diff/scripts/visual_diff_engine.py"), "--help"]],
    ["python3", [path.join(REPO_DIR, "indesign/skills/klm-aggrea-xlsx-to-indesign/scripts/matrix_parser.py"), "--help"]]
  ];
  for (const [bin, args] of helpCmds) {
    try {
      execFileSync(bin, args, { stdio: "pipe" });
      check(true, `CLI --help check: ${path.basename(args[0])}`);
    } catch (e) {
      check(false, `CLI --help check: ${path.basename(args[0])}`, e.stderr?.toString() || e.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`FINAL RESULT: ${passed}/${passed + failed} checks passed (${failed} failed)`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

main();
