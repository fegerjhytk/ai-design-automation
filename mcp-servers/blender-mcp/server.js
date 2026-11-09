#!/usr/bin/env node
/**
 * Blender MCP Server for Google Antigravity
 *
 * Implements Model Context Protocol (MCP) JSON-RPC 2.0 over stdio.
 * Connects to the Blender MCP Add-on TCP socket (127.0.0.1:9876 by default)
 * for live two-way viewport control, and also provides a headless Blender CLI
 * runner (/Applications/Blender.app/Contents/MacOS/Blender --background) when
 * Blender is closed or batch rendering is desired.
 */

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BLENDER_BIN =
  process.env.BLENDER_BIN || "/Applications/Blender.app/Contents/MacOS/Blender";
const DEFAULT_HOST = process.env.BLENDER_MCP_HOST || "127.0.0.1";
const DEFAULT_PORT = Number(process.env.BLENDER_MCP_PORT || 9876);

function log(msg) {
  process.stderr.write(`[blender-mcp] ${msg}\n`);
}

let nextCmdId = 1;

/**
 * Send a single JSON command to the running Blender MCP Add-on over TCP.
 */
function sendBlenderSocketCommand(type, params = {}, options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const timeoutMs = Number(options.timeoutMs || 30000);
  const id = nextCmdId++;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(
          new Error(
            `Timed out after ${timeoutMs}ms waiting for Blender MCP Add-on on ${host}:${port}`
          )
        );
      }
    }, timeoutMs);

    socket.on("connect", () => {
      const payload = JSON.stringify({ id, type, params }) + "\n";
      socket.write(payload, "utf8");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        settled = true;
        clearTimeout(timer);
        socket.end();
        try {
          const parsed = JSON.parse(line);
          if (parsed.status === "error") {
            reject(new Error(parsed.message || "Blender command failed"));
          } else {
            resolve(parsed.result ?? parsed);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON from Blender add-on: ${err.message}`));
        }
      }
    });

    socket.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(
          new Error(
            `Could not connect to live Blender MCP server at ${host}:${port} (${err.code || err.message}). ` +
              `Make sure Blender is open with the "Blender MCP (Antigravity Bridge)" add-on enabled and "Start MCP Server" clicked in View3D > Sidebar (N) > BlenderMCP, or use blender_run_headless for background execution.`
          )
        );
      }
    });

    socket.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Connection closed by Blender before response was received.`));
      }
    });
  });
}

const TOOLS = [
  {
    name: "blender_status",
    description:
      "Check whether the live Blender MCP TCP server (127.0.0.1:9876) is reachable and whether /Applications/Blender.app is installed for headless execution.",
    inputSchema: {
      type: "object",
      properties: {
        port: {
          type: "integer",
          description: "Optional TCP port (defaults to 9876).",
          default: 9876,
        },
      },
    },
  },
  {
    name: "blender_get_scene_info",
    description:
      "Get detailed information about the active scene in the open Blender session (objects, materials count, render engine, resolution, camera, world).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "blender_get_object_info",
    description:
      "Get detailed transform, mesh (vertices/edges/polygons), material, and modifier info for a specific object in the open Blender scene.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Exact name of the Blender object (e.g. 'Cube', 'Camera').",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "blender_create_object",
    description:
      "Create a new 3D object (CUBE, SPHERE, ICO_SPHERE, CYLINDER, CONE, TORUS, PLANE, MONKEY, EMPTY, CAMERA, LIGHT) live in the open Blender scene.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Object primitive type: CUBE, SPHERE, ICO_SPHERE, CYLINDER, CONE, TORUS, PLANE, MONKEY, EMPTY, CAMERA, LIGHT.",
          enum: [
            "CUBE",
            "SPHERE",
            "ICO_SPHERE",
            "CYLINDER",
            "CONE",
            "TORUS",
            "PLANE",
            "MONKEY",
            "EMPTY",
            "CAMERA",
            "LIGHT",
          ],
          default: "CUBE",
        },
        name: {
          type: "string",
          description: "Optional name to assign to the created object.",
        },
        location: {
          type: "array",
          items: { type: "number" },
          description: "[x, y, z] location in Blender world units.",
        },
        rotation: {
          type: "array",
          items: { type: "number" },
          description: "[rx, ry, rz] Euler rotation in radians.",
        },
        scale: {
          type: "array",
          items: { type: "number" },
          description: "[sx, sy, sz] scale factors.",
        },
        size: {
          type: "number",
          description: "Base size/diameter for mesh primitives (default 2.0).",
          default: 2.0,
        },
        color: {
          type: "array",
          items: { type: "number" },
          description: "Optional [r, g, b, a] (0.0-1.0) Base Color for mesh or light.",
        },
        metallic: {
          type: "number",
          description: "Optional metallic value (0.0-1.0) if color is provided.",
        },
        roughness: {
          type: "number",
          description: "Optional roughness value (0.0-1.0) if color is provided.",
        },
        light_type: {
          type: "string",
          description: "For type=LIGHT: POINT, SUN, SPOT, or AREA.",
          enum: ["POINT", "SUN", "SPOT", "AREA"],
        },
        energy: {
          type: "number",
          description: "For type=LIGHT: light power/energy in Watts.",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "blender_modify_object",
    description:
      "Modify an existing object's location, rotation, scale, visibility, or name in the open Blender scene.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the existing object to modify.",
        },
        new_name: {
          type: "string",
          description: "Optional new name for the object.",
        },
        location: {
          type: "array",
          items: { type: "number" },
          description: "New [x, y, z] location.",
        },
        rotation: {
          type: "array",
          items: { type: "number" },
          description: "New [rx, ry, rz] Euler rotation in radians.",
        },
        scale: {
          type: "array",
          items: { type: "number" },
          description: "New [sx, sy, sz] scale.",
        },
        visible: {
          type: "boolean",
          description: "Whether the object is visible in viewport and render.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "blender_delete_object",
    description: "Delete a named object from the open Blender scene.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the object to delete.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "blender_set_material",
    description:
      "Create or update a Principled BSDF material (Blender 4.x/5.x compatible) and assign it to an object in the open Blender scene.",
    inputSchema: {
      type: "object",
      properties: {
        object_name: {
          type: "string",
          description: "Target object name.",
        },
        material_name: {
          type: "string",
          description: "Optional material name.",
        },
        color: {
          type: "array",
          items: { type: "number" },
          description: "[r, g, b, a] Base Color (0.0 to 1.0).",
        },
        metallic: {
          type: "number",
          description: "Metallic value (0.0 to 1.0).",
        },
        roughness: {
          type: "number",
          description: "Roughness value (0.0 to 1.0).",
        },
        ior: {
          type: "number",
          description: "Index of refraction (e.g. 1.45).",
        },
        transmission: {
          type: "number",
          description: "Transmission Weight for glass/water (0.0 to 1.0).",
        },
        emission_color: {
          type: "array",
          items: { type: "number" },
          description: "[r, g, b, a] Emission Color.",
        },
        emission_strength: {
          type: "number",
          description: "Emission Strength.",
        },
      },
      required: ["object_name"],
    },
  },
  {
    name: "blender_execute_code",
    description:
      "Execute arbitrary Python (bpy) code live inside the open Blender session on the main thread. Assign any return data to the variable `result`.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Python code using bpy, bmesh, math, mathutils. Set `result = ...` to return structured data.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "blender_capture_viewport",
    description:
      "Capture a screenshot or still render from the open Blender session and save it to disk (defaults to ~/Downloads) so the agent can inspect it visually.",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Optional output filename (e.g. 'viewport_check.png').",
        },
        save_directory: {
          type: "string",
          description: "Directory to save screenshot (defaults to /Users/admin/Downloads).",
          default: "/Users/admin/Downloads",
        },
        width: {
          type: "integer",
          description: "Optional render width in pixels.",
        },
        height: {
          type: "integer",
          description: "Optional render height in pixels.",
        },
      },
    },
  },
  {
    name: "blender_polyhaven_search",
    description:
      "Search free Poly Haven assets (HDRIs, PBR textures, 3D models) by type and optional category.",
    inputSchema: {
      type: "object",
      properties: {
        asset_type: {
          type: "string",
          description: "Asset type: 'hdris', 'textures', or 'models'.",
          enum: ["hdris", "textures", "models"],
          default: "hdris",
        },
        categories: {
          type: "string",
          description: "Optional comma-separated category filter (e.g. 'studio', 'outdoor', 'wood', 'metal').",
        },
        limit: {
          type: "integer",
          description: "Maximum number of results to return (default 20).",
          default: 20,
        },
      },
    },
  },
  {
    name: "blender_polyhaven_download",
    description:
      "Download a free Poly Haven HDRI or PBR texture and automatically wire it into the open Blender scene's World shader or object material.",
    inputSchema: {
      type: "object",
      properties: {
        asset_id: {
          type: "string",
          description: "Poly Haven asset ID (e.g. 'studio_small_09', 'aerial_rocks_02').",
        },
        asset_type: {
          type: "string",
          description: "'hdris' or 'textures'.",
          enum: ["hdris", "textures"],
          default: "hdris",
        },
        resolution: {
          type: "string",
          description: "Resolution ('1k', '2k', '4k'). Default '1k'.",
          default: "1k",
        },
        object_name: {
          type: "string",
          description: "For textures: optional object name to assign the generated PBR material to.",
        },
        strength: {
          type: "number",
          description: "For HDRIs: world environment light strength (default 1.0).",
          default: 1.0,
        },
      },
      required: ["asset_id"],
    },
  },
  {
    name: "blender_run_headless",
    description:
      "Run a Python (bpy) script headlessly via /Applications/Blender.app/Contents/MacOS/Blender --background. Works even when the Blender GUI app is not open.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Python (bpy) script content to execute in headless Blender.",
        },
        blend_file: {
          type: "string",
          description: "Optional path to an existing .blend file to open before running the script.",
        },
        timeout_ms: {
          type: "integer",
          description: "Timeout in milliseconds (default 120000).",
          default: 120000,
        },
      },
      required: ["code"],
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case "blender_status": {
      const port = Number(args.port || DEFAULT_PORT);
      const blenderInstalled = fs.existsSync(BLENDER_BIN);
      let liveConnected = false;
      let liveInfo = null;
      let liveError = null;
      try {
        liveInfo = await sendBlenderSocketCommand("ping", {}, { port, timeoutMs: 2500 });
        liveConnected = true;
      } catch (err) {
        liveError = err.message;
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                blender_binary: BLENDER_BIN,
                blender_installed: blenderInstalled,
                live_viewport_connected: liveConnected,
                live_port: port,
                live_info: liveInfo,
                live_note: liveConnected
                  ? "Connected to open Blender session."
                  : liveError,
                addon_locations: {
                  downloads: "/Users/admin/Downloads/blender_mcp_addon.py",
                  blender_addons:
                    "/Users/admin/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp_addon.py",
                },
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }

    case "blender_get_scene_info": {
      const res = await sendBlenderSocketCommand("get_scene_info", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_get_object_info": {
      const res = await sendBlenderSocketCommand("get_object_info", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_create_object": {
      const res = await sendBlenderSocketCommand("create_object", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_modify_object": {
      const res = await sendBlenderSocketCommand("modify_object", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_delete_object": {
      const res = await sendBlenderSocketCommand("delete_object", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_set_material": {
      const res = await sendBlenderSocketCommand("set_material", args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_execute_code": {
      const res = await sendBlenderSocketCommand("execute_code", args, { timeoutMs: 60000 });
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_capture_viewport": {
      const res = await sendBlenderSocketCommand("get_viewport_screenshot", args, {
        timeoutMs: 60000,
      });
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_polyhaven_search": {
      const assetType = args.asset_type || "hdris";
      const limit = Number(args.limit || 20);
      let url = `https://api.polyhaven.com/assets?t=${encodeURIComponent(assetType)}`;
      if (args.categories) {
        url += `&c=${encodeURIComponent(args.categories)}`;
      }
      const resp = await fetch(url, {
        headers: { "User-Agent": "Antigravity-Blender-MCP/1.2" },
      });
      if (!resp.ok) {
        throw new Error(`Poly Haven API returned ${resp.status}`);
      }
      const data = await resp.json();
      const entries = Object.entries(data)
        .slice(0, limit)
        .map(([id, meta]) => ({
          asset_id: id,
          name: meta.name,
          categories: meta.categories,
          tags: meta.tags?.slice(0, 8),
          max_resolution: meta.max_resolution,
        }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                asset_type: assetType,
                total_matches: Object.keys(data).length,
                returned: entries.length,
                assets: entries,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }

    case "blender_polyhaven_download": {
      const res = await sendBlenderSocketCommand("polyhaven_download", args, {
        timeoutMs: 120000,
      });
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }], isError: false };
    }

    case "blender_run_headless": {
      if (!args.code || typeof args.code !== "string") {
        throw new Error("Missing required 'code' string parameter.");
      }
      const tmpScript = path.join(
        os.tmpdir(),
        `ag_blender_headless_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.py`
      );
      fs.writeFileSync(tmpScript, args.code, "utf8");
      const cliArgs = ["--background"];
      if (args.blend_file) {
        cliArgs.push(args.blend_file);
      }
      cliArgs.push("--python", tmpScript);

      try {
        const { stdout, stderr } = await execFileAsync(BLENDER_BIN, cliArgs, {
          timeout: Number(args.timeout_ms || 120000),
          maxBuffer: 10 * 1024 * 1024,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "success",
                  command: `${BLENDER_BIN} ${cliArgs.join(" ")}`,
                  stdout: stdout.trim(),
                  stderr: stderr.trim(),
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      } finally {
        try {
          fs.unlinkSync(tmpScript);
        } catch {}
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function processMessage(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "blender-mcp", version: "1.2.0" },
      },
    });
  } else if (method === "notifications/initialized") {
    log("Client initialized.");
  } else if (method === "ping") {
    sendResponse({ jsonrpc: "2.0", id, result: {} });
  } else if (method === "tools/list") {
    sendResponse({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    handleToolCall(params?.name, params?.arguments || {})
      .then((res) => sendResponse({ jsonrpc: "2.0", id, result: res }))
      .catch((err) =>
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          },
        })
      );
  } else if (id !== undefined) {
    sendResponse({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    processMessage(msg);
  } catch (e) {
    log("Failed to parse JSON: " + e.message);
  }
});

log("Blender MCP server started on stdio.");
