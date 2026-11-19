#!/usr/bin/env node
/**
 * Brand & Motion Engine MCP Server
 *
 * Implements the Model Context Protocol (MCP) over stdio.
 * Provides deterministic brand strategy, typography kerning, unflattened
 * Adobe Illustrator CC master artboard generation, Google Flow retail staging,
 * and GSAP kinetic motion sync.
 */

import readline from "node:readline";
import { runAntiSamenessAudit } from "./lib/anti_sameness.js";
import { auditTypographicKerning } from "./lib/kerning.js";
import { buildBrandIdentity } from "./lib/illustrator.js";
import { generateMotionSyncTimeline } from "./lib/motion.js";
import { stageEnvironmentalMockup } from "./lib/stage.js";

function log(msg) {
  process.stderr.write(`[brand-engine-mcp] ${msg}\n`);
}

const TOOLS = [
  {
    name: "brand_anti_sameness_audit",
    description: "Deconstructs an industry niche to surface category cliches (colors, typography, symbols, buzzwords), derives an authentic historical/material counter-anchor, and outputs an automated negative prompt string for AI visual generation.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Target industry category (e.g. 'matcha', 'coffee', 'luxury_real_estate', 'clean_beauty', 'tech_saas')."
        },
        audience: {
          type: "string",
          description: "Target demographic description (e.g. 'Design-conscious Gen Z and Millennials')."
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
    description: "Audits letter pairs in brand wordmarks for optical white-space gap traps (e.g. R-A, A-V, T-o) and returns recommended tracking offsets and ExtendScript snippets.",
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
    description: "Runs ExtendScript in macOS Adobe Illustrator to build an editable master .ai file with separate wordmark, secondary seal, background and placeholder dieline layers.",
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
    description: "Assembles directorial Google Flow / Nano Banana 2.1 scene prompts for testing brand packaging across retail shelves, harsh direct daylight, or moody ambient interiors.",
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
    description: "Schedules kinetic typography on a BPM grid and returns GSAP code for HyperFrames plus an editable After Effects composition script.",
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
    description: "Prepares a structured design critique payload to evaluate artwork distinctiveness against the Anti-Sameness criteria via OpenAI Codex.",
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
        codex_system_rubric: "You are OpenAI Codex acting as Lead Brand Director. Evaluate this brand artwork on a scale of 1-10 for distinctiveness. Flag any category clichés (predictable colors, cliché icons, generic fonts), confirm whether the primary wordmark stands alone powerfully without relying on an icon crutch, and propose 2 unconventional material/texture pivots.",
        suggested_slash_command: `/ask-codex "Critique this ${args.category} design at ${args.image_path} against category cliches."`
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", async (line) => {
    line = line.trim();
    if (!line) return;

    let req;
    try {
      req = JSON.parse(line);
    } catch (e) {
      log(`JSON parse error: ${e.message}`);
      return;
    }

    const { id, method, params } = req;

    if (method === "initialize") {
      const resp = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "brand-engine-mcp",
            version: "1.0.0"
          },
          capabilities: {
            tools: {}
          }
        }
      };
      process.stdout.write(JSON.stringify(resp) + "\n");
    } else if (method === "notifications/initialized") {
      // client notification
    } else if (method === "tools/list") {
      const resp = {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS
        }
      };
      process.stdout.write(JSON.stringify(resp) + "\n");
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await handleToolCall(toolName, toolArgs);
        const resp = {
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
        };
        process.stdout.write(JSON.stringify(resp) + "\n");
      } catch (err) {
        log(`Error calling ${toolName}: ${err.message}`);
        const resp = {
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
        };
        process.stdout.write(JSON.stringify(resp) + "\n");
      }
    }
  });

  log("Brand & Motion Engine MCP server running on stdio transport.");
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
