#!/usr/bin/env node
/**
 * Unified AI Design Workflow & Brand-Motion Engine MCP Server
 *
 * Implements JSON-RPC 2.0 Model Context Protocol (MCP) over stdio.
 * Consolidates Brand & Motion Engine MCP tools and AI-Design-Automation
 * multi-app pipeline dispatch/preflight into a single server.
 */

import readline from "node:readline";
import { runAntiSamenessAudit } from "./lib/anti_sameness.js";
import { auditTypographicKerning } from "./lib/kerning.js";
import { buildBrandIdentity } from "./lib/illustrator.js";
import { generateMotionSyncTimeline } from "./lib/motion.js";
import { stageEnvironmentalMockup } from "./lib/stage.js";
import {
  ALLOWED_PIPELINE_ACTIONS,
  getDesignWorkflowStatus,
  runDesignWorkflowAction,
  runDesignWorkflowPreflight
} from "./lib/workflow.js";

function log(msg) {
  process.stderr.write(`[ai-design-workflow] ${msg}\n`);
}

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

const TOOLS = [
  {
    name: "design_workflow_status",
    description:
      "Inspects the unified AI Design Workflow environment: repo integrity, core-engine, global symlinks, sub-skill inventory, and running/installed status of Illustrator, Photoshop, After Effects, InDesign, and Google Chrome.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "design_workflow_run_action",
    description:
      "Executes a validated action through the AI-Design-Automation pipeline_runner.js (Illustrator audit/cleanup/fit/export/QC/diff, Photoshop Mars conditioning, After Effects motion/GIF, and Chrome status).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Validated pipeline_runner.js action to execute.",
          enum: Array.from(ALLOWED_PIPELINE_ACTIONS)
        },
        project: { type: "string", description: "Project folder name on Desktop." },
        ratio: { type: "string", description: "Aspect ratio ('1:1', '16:9', '9:16', '4:3', '3:4')." },
        ae_mode: { type: "string", description: "After Effects mode ('puppet', 'promo', 'product', 'buoyancy', 'motion-clone')." },
        flow: { type: "string", description: "Reading flow ('columns', 'top-bottom', 'left-right')." },
        duration: { type: "number", description: "Animation duration in seconds." },
        fps: { type: "number", description: "Frame rate." },
        ref: { type: "string", description: "Reference URL or file for motion-clone." },
        comp: { type: "string", description: "Target After Effects composition name." },
        archetype: { type: "string", description: "Motion archetype ('cascade_drop', 'carousel_scroll', 'elastic_pop')." },
        layout: { type: "string", description: "Layout mode ('as-is', 'stacked')." },
        elements_only: { type: "boolean", description: "Animate graphic elements only while locking text/background." },
        skip_web: { type: "boolean", description: "Skip web-optimized GIF output." },
        csv: { type: "string", description: "CSV file path for variable graphics." },
        psd: { type: "string", description: "PSD template or layered file path." },
        before: { type: "string", description: "Before artwork path for visual diff." },
        after: { type: "string", description: "After artwork path for visual diff." },
        diff_mode: { type: "string", description: "Diff mode ('image', 'marked', 'all')." },
        video: { type: "string", description: "Hero video file path." },
        domain: { type: "string", description: "Target Chrome tab domain." }
      },
      required: ["action"]
    }
  },
  {
    name: "design_workflow_preflight",
    description:
      "Runs deterministic preflight checks and verification tools across core-engine unit tests, core-engine job runner, Illustrator QC, InDesign typography inspection, InDesign doc diff, or InDesign batch export.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description: "Preflight/verification mode.",
          enum: [
            "core_engine_tests",
            "core_engine_run",
            "illustrator_qc",
            "indesign_typo_inspect",
            "indesign_doc_diff",
            "indesign_batch_export"
          ],
          default: "core_engine_tests"
        },
        job_json_path: { type: "string", description: "Path to JSON job spec for core_engine_run." },
        indd_path: { type: "string", description: "Path to .indd document for indesign_typo_inspect." },
        file_a: { type: "string", description: "Baseline .indd file for indesign_doc_diff." },
        file_b: { type: "string", description: "Updated .indd file for indesign_doc_diff." },
        input_dir: { type: "string", description: "Input folder for indesign_batch_export." },
        output_dir: { type: "string", description: "Output folder for indesign_batch_export." }
      },
      required: ["mode"]
    }
  },
  {
    name: "brand_anti_sameness_audit",
    description:
      "Deconstructs an industry niche to surface category cliches (colors, typography, symbols, buzzwords), derives an authentic historical/material counter-anchor, and outputs an automated negative prompt string for AI visual generation.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Target industry category (e.g. 'matcha', 'coffee', 'luxury_real_estate', 'clean_beauty', 'tech_saas')."
        },
        audience: {
          type: "string",
          description: "Target demographic description."
        },
        brand_name: {
          type: "string",
          description: "The name of the brand."
        }
      },
      required: ["category"]
    }
  },
  {
    name: "audit_typographic_kerning",
    description:
      "Audits letter pairs in brand wordmarks for optical white-space gap traps (e.g. R-A, A-V, T-o) and returns recommended tracking offsets and ExtendScript snippets.",
    inputSchema: {
      type: "object",
      properties: {
        wordmark: {
          type: "string",
          description: "The text string of the wordmark (e.g. 'MIRAI', 'AVENUE')."
        },
        font_name: {
          type: "string",
          description: "PostScript font name (default: 'Display-Serif')."
        }
      },
      required: ["wordmark"]
    }
  },
  {
    name: "illustrator_build_identity",
    description:
      "Runs ExtendScript in macOS Adobe Illustrator to build an editable master .ai file with separate wordmark, secondary seal, background and placeholder dieline layers.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Project folder name under the configured output directory (Desktop by default)."
        },
        wordmark: {
          type: "string",
          description: "Hero wordmark text."
        },
        font_name: {
          type: "string",
          description: "PostScript font name installed in Illustrator (e.g. 'IvyPrestoDisplay-SemiBold')."
        },
        tracking: {
          type: "number",
          description: "Tracking offset to apply (e.g. -20)."
        },
        primary_color_hex: {
          type: "string",
          description: "Primary pigment hex code (e.g. '#4A0E17')."
        },
        secondary_seal_name: {
          type: "string",
          description: "Label for the secondary modular seal graphic."
        }
      },
      required: ["project_name", "wordmark"]
    }
  },
  {
    name: "stage_environmental_mockup",
    description:
      "Assembles directorial Google Flow / Nano Banana 2.1 scene prompts for testing brand packaging across retail shelves, harsh direct daylight, or moody ambient interiors.",
    inputSchema: {
      type: "object",
      properties: {
        brand_name: {
          type: "string",
          description: "Brand name."
        },
        container_type: {
          type: "string",
          description: "Physical packaging shape (e.g. 'cylindrical tin can with chrome lid', 'rigid cardboard box')."
        },
        primary_color: {
          type: "string",
          description: "Dominant color name/hex."
        },
        lighting_preset: {
          type: "string",
          description: "Lighting stress test: 'retail_shelf', 'direct_daylight', or 'moody_ambient'.",
          enum: ["retail_shelf", "direct_daylight", "moody_ambient"]
        },
        aspect_ratio: {
          type: "string",
          description: "Aspect ratio for Google Flow: '16:9', '9:16', '1:1', '4:3', '3:4'.",
          enum: ["16:9", "9:16", "1:1", "4:3", "3:4"]
        }
      },
      required: ["brand_name"]
    }
  },
  {
    name: "motion_sync_timeline",
    description:
      "Schedules kinetic typography on a BPM grid and returns GSAP code for HyperFrames plus an editable After Effects composition script.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Headline or phrase to animate."
        },
        bpm: {
          type: "number",
          description: "Audio tempo in beats per minute (default: 120)."
        },
        duration_seconds: {
          type: "number",
          description: "Total animation duration in seconds."
        },
        easing: {
          type: "string",
          description: "GSAP easing formula (e.g. 'power3.out', 'elastic.out(1, 0.3)', 'expo.inOut')."
        }
      },
      required: ["text"]
    }
  },
  {
    name: "codex_review_dispatch",
    description:
      "Prepares a structured design critique payload to evaluate artwork distinctiveness against the Anti-Sameness criteria via OpenAI Codex.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: {
          type: "string",
          description: "Local path to the exported artwork screenshot or mockup."
        },
        category: {
          type: "string",
          description: "Industry category."
        }
      },
      required: ["image_path", "category"]
    }
  }
];

async function handleToolCall(name, args) {
  switch (name) {
    case "design_workflow_status":
      return getDesignWorkflowStatus();

    case "design_workflow_run_action":
      return runDesignWorkflowAction(args);

    case "design_workflow_preflight":
      return runDesignWorkflowPreflight(args);

    case "brand_anti_sameness_audit":
      return runAntiSamenessAudit(args.category, args.audience, args.brand_name);

    case "audit_typographic_kerning":
      return auditTypographicKerning(args.wordmark, args.font_name);

    case "illustrator_build_identity":
      return buildBrandIdentity({
        projectName: args.project_name,
        wordmark: args.wordmark,
        fontName: args.font_name,
        tracking: args.tracking,
        primaryColorHex: args.primary_color_hex,
        secondarySealName: args.secondary_seal_name
      });

    case "stage_environmental_mockup":
      return stageEnvironmentalMockup({
        brandName: args.brand_name,
        containerType: args.container_type,
        primaryColor: args.primary_color,
        lightingPreset: args.lighting_preset,
        aspectRatio: args.aspect_ratio
      });

    case "motion_sync_timeline":
      return generateMotionSyncTimeline({
        text: args.text,
        bpm: args.bpm,
        durationSeconds: args.duration_seconds,
        easing: args.easing
      });

    case "codex_review_dispatch":
      return {
        target_image: args.image_path,
        category: args.category,
        codex_system_rubric:
          "You are OpenAI Codex acting as Lead Brand Director. Evaluate this brand artwork on a scale of 1-10 for distinctiveness. Flag any category cliches (predictable colors, cliche icons, generic fonts), confirm whether the primary wordmark stands alone powerfully without relying on an icon crutch, and propose 2 unconventional material/texture pivots.",
        suggested_slash_command: `/ask-codex "Critique this ${args.category} design at ${args.image_path} against category cliches."`
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function processMessage(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "ai-design-workflow",
          version: "2.0.0"
        }
      }
    });
  } else if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
    // JSON-RPC notifications do not expect a response
  } else if (method === "ping") {
    sendResponse({ jsonrpc: "2.0", id, result: {} });
  } else if (method === "tools/list") {
    sendResponse({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    handleToolCall(toolName, toolArgs)
      .then((result) =>
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          }
        })
      )
      .catch((err) => {
        log(`Error calling ${toolName}: ${err.message}`);
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `Error: ${err.message}`
              }
            ],
            isError: true
          }
        });
      });
  } else if (id !== undefined) {
    sendResponse({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    });
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed);
      processMessage(req);
    } catch (e) {
      log(`JSON parse error: ${e.message}`);
    }
  });

  log("Unified AI Design Workflow & Brand-Motion Engine MCP server running on stdio.");
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
