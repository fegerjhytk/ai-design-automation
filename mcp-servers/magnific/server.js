#!/usr/bin/env node
/**
 * Magnific & Freepik Asset Search and Downloader MCP Server
 *
 * Implements the Model Context Protocol (MCP) over stdio.
 * Provides 100% headless asset search, download, and Illustrator placement
 * using the official Magnific REST API. Never touches or opens Google Chrome.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";

const API_KEY = process.env.MAGNIFIC_API_KEY || "YOUR_MAGNIFIC_API_KEY";
const BASE_URL = "https://api.magnific.com";
const DOWNLOADS_DIR = process.env.MAGNIFIC_DOWNLOAD_DIR || "/Users/admin/Downloads";

function log(msg) {
  process.stderr.write(`[magnific-mcp] ${msg}\n`);
}

const TOOLS = [
  {
    name: "magnific_search_and_download",
    description: "Search and download high-resolution stock photos, vectors, and graphics headlessly via Magnific/Freepik API using your API key. Automatically downloads directly to ~/Downloads. Never opens or touches Chrome.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords (e.g. 'dubai skyline', 'luxury modern architecture', 'minimal sports car')."
        },
        orientation: {
          type: "string",
          description: "Orientation filter. Options: 'horizontal' (or 'h'), 'vertical' (or 'v'), 'square' (or 's'), 'panoramic' (or 'p').",
          enum: ["horizontal", "vertical", "square", "panoramic", "h", "v", "s", "p"]
        },
        content_type: {
          type: "string",
          description: "Asset format. Options: 'photo' (or 'p'), 'vector' (or 'v'), 'psd', 'all'. Default is 'photo'.",
          enum: ["photo", "vector", "psd", "all", "p", "v"],
          default: "photo"
        },
        license: {
          type: "string",
          description: "License filter. Options: 'premium' (or 'p'), 'free' (or 'f'), 'all'. Default is 'premium'.",
          enum: ["premium", "free", "all", "p", "f"],
          default: "premium"
        },
        exclude_ai: {
          type: "boolean",
          description: "Whether to exclude AI-generated content (default: true).",
          default: true
        },
        limit: {
          type: "integer",
          description: "Number of images to download (1-10, default: 1).",
          default: 1
        }
      },
      required: ["query"]
    }
  },
  {
    name: "magnific_place_in_illustrator",
    description: "Context-aware smart asset placement directly into the active Adobe Illustrator document artboard or selection using pure headless vectors/renders.",
    inputSchema: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "What to place (e.g. 'phone icon', 'dubai background', 'instagram logo', 'luxury tower')."
        },
        mode: {
          type: "string",
          description: "Placement mode: 'icon' (flat 2D vector path matching artboard swatch), 'photo' (artboard-sized photo), or 'cutout' (transparent object).",
          enum: ["icon", "photo", "cutout"]
        },
        swap: {
          type: "boolean",
          description: "Set to true to cycle/replace currently selected object in-place ('try another').",
          default: false
        }
      },
      required: ["request"]
    }
  }
];

const orientationMap = { h: "horizontal", v: "vertical", s: "square", p: "panoramic" };
const typeMap = { p: "photo", v: "vector", psd: "psd" };
const licenseMap = { p: "premium", f: "free" };

async function downloadFileFromUrl(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return buffer.length;
}

async function searchAndDownload(args) {
  const query = args.query;
  const limit = Math.min(Math.max(args.limit || 1, 1), 10);
  const rawType = args.content_type || "photo";
  const contentType = typeMap[rawType] || rawType;
  const rawLicense = args.license || "premium";
  const license = licenseMap[rawLicense] || rawLicense;
  const excludeAI = args.exclude_ai !== false;
  const rawOri = args.orientation;
  const orientation = orientationMap[rawOri] || rawOri;

  const params = new URLSearchParams();
  params.append("term", query);
  params.append("limit", String(limit));

  if (contentType && contentType !== "all") {
    params.append(`filters[content_type][${contentType}]`, "1");
  }
  if (license === "premium") {
    params.append("filters[premium]", "1");
  } else if (license === "free") {
    params.append("filters[free]", "1");
  }
  if (excludeAI) {
    params.append("filters[ai][excluded]", "1");
  }
  if (orientation) {
    params.append(`filters[orientation][${orientation}]`, "1");
  }

  log(`Searching: "${query}" (Type: ${contentType}, License: ${license}, Orientation: ${orientation || "any"}, Exclude AI: ${excludeAI})`);

  const searchRes = await fetch(`${BASE_URL}/v1/resources?${params.toString()}`, {
    headers: {
      "x-magnific-api-key": API_KEY,
      "Accept": "application/json"
    }
  });

  if (!searchRes.ok) {
    throw new Error(`Magnific API search error ${searchRes.status}: ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  const items = searchData?.data || [];
  if (items.length === 0) {
    return {
      message: `No assets found matching query: "${query}" with specified filters.`,
      downloaded: []
    };
  }

  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    log(`Processing #${item.id}: "${item.title}"`);

    let downloadUrl = null;
    let originalFilename = item.filename || `${item.id}.jpg`;

    // 1. Check official download endpoint
    try {
      const dlRes = await fetch(`${BASE_URL}/v1/resources/${item.id}/download`, {
        headers: {
          "x-magnific-api-key": API_KEY,
          "Accept": "application/json"
        }
      });
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        downloadUrl = dlData?.data?.url;
        if (dlData?.data?.filename) originalFilename = dlData.data.filename;
      }
    } catch(e) {}

    // 2. High-res source URL fallback
    if (!downloadUrl && item?.image?.source?.url) {
      downloadUrl = item.image.source.url;
    }

    if (!downloadUrl) continue;

    const cleanFilename = `magnific_${item.id}_${originalFilename}`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const destPath = path.join(DOWNLOADS_DIR, cleanFilename);

    try {
      const bytes = await downloadFileFromUrl(downloadUrl, destPath);
      const sizeKb = Math.round(bytes / 1024);
      results.push({
        id: item.id,
        title: item.title,
        file_path: destPath,
        file_url: `file://${destPath}`,
        size_kb: sizeKb
      });
    } catch(dlErr) {
      log(`Download error for #${item.id}: ${dlErr.message}`);
    }
  }

  return {
    success: true,
    count: results.length,
    downloaded: results
  };
}

function placeInIllustrator(args) {
  const req = args.request;
  const scriptPath = path.join(path.dirname(new URL(import.meta.url).pathname), "smart_illustrator_placer.js");
  const cliArgs = [scriptPath, req];
  if (args.mode) cliArgs.push("--mode", args.mode);
  if (args.swap) cliArgs.push("--swap");

  log(`Invoking smart_illustrator_placer for "${req}"`);
  const output = execFileSync("node", cliArgs, { encoding: "utf-8", timeout: 30000 });
  return {
    success: true,
    output: output.trim()
  };
}

async function handleToolCall(name, args) {
  if (name === "magnific_search_and_download") {
    return await searchAndDownload(args);
  } else if (name === "magnific_place_in_illustrator") {
    return placeInIllustrator(args);
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req;
    try {
      req = JSON.parse(trimmed);
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
            name: "magnific",
            version: "2.0.0"
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

  log("Magnific MCP server running on stdio transport.");
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
