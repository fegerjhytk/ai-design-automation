/**
 * Unified Design Workflow Orchestrator
 * Bridges AI-Design-Automation (core-engine, Illustrator, Photoshop, InDesign, After Effects)
 * into the unified MCP server with strict argument validation.
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_DIR = process.env.DESIGN_REPO_DIR || path.resolve(__dirname, "../..");
export const CORE_ENGINE_DIR = path.join(REPO_DIR, "core-engine");
export const PIPELINE_RUNNER_PATH = path.join(
  REPO_DIR,
  "illustrator/skills/design-automation/scripts/pipeline_runner.js"
);
export const INDESIGN_BATCH_EXPORT_PATH = path.join(
  REPO_DIR,
  "indesign/skills/indesign-batch-export/scripts/indesign_batch_export.js"
);
export const INDESIGN_DOC_DIFF_PATH = path.join(
  REPO_DIR,
  "indesign/skills/indesign-doc-diff/scripts/indesign-doc-diff.js"
);

export const ALLOWED_PIPELINE_ACTIONS = new Set([
  "audit",
  "cleanup",
  "fit",
  "export",
  "qc",
  "qc-markers",
  "diff",
  "ps-status",
  "ps-crop",
  "ps-mask",
  "ps-report",
  "ps-slice",
  "ps-csv",
  "ae-status",
  "ai-video-status",
  "animate",
  "motion-clone",
  "comp-to-gif",
  "video-ad",
  "chrome-status"
]);

function isAppRunning(pattern) {
  try {
    const out = execFileSync("pgrep", ["-il", pattern], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function collectSkillInventory() {
  const groups = {
    illustrator: path.join(REPO_DIR, "illustrator/skills"),
    indesign: path.join(REPO_DIR, "indesign/skills"),
    after_effects: path.join(REPO_DIR, "after-effects/skills")
  };
  const inventory = {};
  for (const [group, dir] of Object.entries(groups)) {
    if (!fs.existsSync(dir)) {
      inventory[group] = [];
      continue;
    }
    inventory[group] = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }
  return inventory;
}

function safeFileCheck(targetPath) {
  return Boolean(targetPath && fs.existsSync(targetPath));
}

export function getDesignWorkflowStatus() {
  const adobeApps = {
    illustrator: {
      installed: safeFileCheck("/Applications/Adobe Illustrator 2026/Adobe Illustrator.app") ||
        safeFileCheck("/Applications/Adobe Illustrator CC/Adobe Illustrator.app") ||
        fs.readdirSync("/Applications").some((name) => name.startsWith("Adobe Illustrator")),
      running: isAppRunning("illustrator")
    },
    photoshop: {
      installed: safeFileCheck("/Applications/Adobe Photoshop 2026/Adobe Photoshop 2026.app") ||
        fs.readdirSync("/Applications").some((name) => name.startsWith("Adobe Photoshop")),
      running: isAppRunning("photoshop")
    },
    after_effects: {
      installed: safeFileCheck("/Applications/Adobe After Effects 2027/Adobe After Effects 2027.app") ||
        safeFileCheck("/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app") ||
        fs.readdirSync("/Applications").some((name) => name.startsWith("Adobe After Effects")),
      aerender_available: safeFileCheck("/Applications/Adobe After Effects 2027/aerender") ||
        safeFileCheck("/Applications/Adobe After Effects 2026/aerender"),
      running: isAppRunning("after effects")
    },
    indesign: {
      installed: fs.readdirSync("/Applications").some((name) => name.startsWith("Adobe InDesign")),
      running: isAppRunning("indesign")
    },
    chrome: {
      running: isAppRunning("Google Chrome")
    }
  };

  const pluginLinkPath = path.join(os.homedir(), ".gemini/config/plugins/ai-design-workflow");
  const masterSkillLinkPath = path.join(os.homedir(), ".gemini/config/skills/ai-design-workflow");

  return {
    status: "ok",
    repo_dir: REPO_DIR,
    core_engine_present: safeFileCheck(path.join(CORE_ENGINE_DIR, "pipeline.py")),
    pipeline_runner_present: safeFileCheck(PIPELINE_RUNNER_PATH),
    indesign_tools_present: {
      batch_export: safeFileCheck(INDESIGN_BATCH_EXPORT_PATH),
      doc_diff: safeFileCheck(INDESIGN_DOC_DIFF_PATH)
    },
    global_symlinks: {
      plugin_linked: safeFileCheck(pluginLinkPath) && fs.realpathSync(pluginLinkPath) === path.resolve(REPO_DIR, "ai-design-workflow"),
      master_skill_linked: safeFileCheck(masterSkillLinkPath) && fs.realpathSync(masterSkillLinkPath) === path.resolve(REPO_DIR, "ai-design-workflow/skills/ai-design-workflow")
    },
    adobe_and_browser: adobeApps,
    skills_inventory: collectSkillInventory()
  };
}

function appendOpt(argv, flag, value) {
  if (value !== undefined && value !== null && value !== "") {
    argv.push(flag, String(value));
  }
}

export function runDesignWorkflowAction(options = {}) {
  const { action } = options;
  if (typeof action !== "string" || !ALLOWED_PIPELINE_ACTIONS.has(action)) {
    throw new Error(`Unsupported or disallowed pipeline action: ${String(action)}`);
  }
  if (!fs.existsSync(PIPELINE_RUNNER_PATH)) {
    throw new Error(`pipeline_runner.js not found at ${PIPELINE_RUNNER_PATH}`);
  }

  const argv = [PIPELINE_RUNNER_PATH, "--action", action];
  appendOpt(argv, "--project", options.project);
  appendOpt(argv, "--ratio", options.ratio);
  appendOpt(argv, "--ae-mode", options.ae_mode);
  appendOpt(argv, "--flow", options.flow);
  appendOpt(argv, "--duration", options.duration);
  appendOpt(argv, "--fps", options.fps);
  appendOpt(argv, "--ref", options.ref);
  appendOpt(argv, "--comp", options.comp);
  appendOpt(argv, "--archetype", options.archetype);
  appendOpt(argv, "--layout", options.layout);
  if (options.elements_only === true) argv.push("--elements-only");
  if (options.elements_only === false) argv.push("--include-text");
  if (options.skip_web === true) argv.push("--skip-web");
  appendOpt(argv, "--csv", options.csv);
  appendOpt(argv, "--psd", options.psd);
  appendOpt(argv, "--before", options.before);
  appendOpt(argv, "--after", options.after);
  appendOpt(argv, "--diff-mode", options.diff_mode);
  appendOpt(argv, "--video", options.video);
  appendOpt(argv, "--domain", options.domain);

  try {
    const stdout = execFileSync(process.execPath, argv, {
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024
    });
    return {
      status: "ok",
      action,
      argv,
      stdout: stdout.trim()
    };
  } catch (err) {
    return {
      status: "error",
      action,
      argv,
      exit_code: err.status ?? 1,
      stdout: (err.stdout || "").toString().trim(),
      stderr: (err.stderr || err.message || "").toString().trim()
    };
  }
}

export function runDesignWorkflowPreflight(options = {}) {
  const { mode = "core_engine_tests", job_json_path, indd_path, file_a, file_b, input_dir, output_dir } = options;

  switch (mode) {
    case "core_engine_tests": {
      const res = spawnSync(
        "python3",
        ["-m", "unittest", "discover", "-s", CORE_ENGINE_DIR, "-p", "test_*.py", "-v"],
        { encoding: "utf8", timeout: 60_000 }
      );
      const output = [res.stdout, res.stderr].filter(Boolean).join("\n").trim();
      if (res.status !== 0) {
        throw new Error(`core_engine_tests failed (exit ${res.status}): ${output}`);
      }
      return { status: "ok", mode, output };
    }

    case "core_engine_run": {
      if (!job_json_path || !fs.existsSync(job_json_path)) {
        throw new Error("job_json_path must point to an existing JSON job file.");
      }
      const stdout = execFileSync("python3", [path.join(CORE_ENGINE_DIR, "run.py"), job_json_path], {
        encoding: "utf8",
        timeout: 140_000
      });
      return { status: "ok", mode, output: stdout.trim() };
    }

    case "indesign_typo_inspect": {
      if (!indd_path || !fs.existsSync(indd_path)) {
        throw new Error("indd_path must point to an existing .indd file.");
      }
      const stdout = execFileSync(
        process.execPath,
        [INDESIGN_DOC_DIFF_PATH, "--inspect-typo", indd_path, "--json"],
        { encoding: "utf8", timeout: 120_000 }
      );
      return { status: "ok", mode, output: stdout.trim() };
    }

    case "indesign_doc_diff": {
      if (!file_a || !fs.existsSync(file_a) || !file_b || !fs.existsSync(file_b)) {
        throw new Error("file_a and file_b must both point to existing .indd files.");
      }
      const stdout = execFileSync(
        process.execPath,
        [INDESIGN_DOC_DIFF_PATH, "--compare", file_a, file_b, "--json"],
        { encoding: "utf8", timeout: 120_000 }
      );
      return { status: "ok", mode, output: stdout.trim() };
    }

    case "indesign_batch_export": {
      if (!input_dir || !output_dir) {
        throw new Error("input_dir and output_dir are required for indesign_batch_export.");
      }
      const stdout = execFileSync(
        process.execPath,
        [INDESIGN_BATCH_EXPORT_PATH, "--input", input_dir, "--output", output_dir],
        { encoding: "utf8", timeout: 180_000 }
      );
      return { status: "ok", mode, output: stdout.trim() };
    }

    case "illustrator_qc": {
      return runDesignWorkflowAction({ action: "qc" });
    }

    default:
      throw new Error(`Unknown preflight mode: ${mode}`);
  }
}
