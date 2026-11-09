#!/usr/bin/env python3
"""Magnific MCP Server for Antigravity Plugin

A Model Context Protocol (MCP) server exposing Magnific API tools over stdio
transport. Compatible with Antigravity, Claude Desktop, Cursor, and other MCP clients.
Supports image generation, upscaling, background removal, and downloading assets locally.
"""

import json
import os
import sys
from typing import Any, Dict, Optional

# Ensure plugin directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from magnific_client import MagnificClient

# Initialize Magnific client
client: Optional[MagnificClient] = None


def log(msg: str):
    """Log to stderr so stdout remains clean for MCP JSON-RPC protocol."""
    sys.stderr.write(f"[magnific-mcp] {msg}\n")
    sys.stderr.flush()


def get_client() -> MagnificClient:
    global client
    if client is None:
        client = MagnificClient()
    return client


# Available Tools Definitions
TOOLS = [
    {
        "name": "magnific_test_connection",
        "description": "Test connection to the Magnific API and retrieve available resources.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "magnific_generate_image",
        "description": "Generate ultra-realistic, high-resolution images using Magnific's exclusive Mystic AI workflow. Automatically downloads the generated asset locally to ~/Downloads.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Descriptive text prompt for the desired image.",
                },
                "aspect_ratio": {
                    "type": "string",
                    "description": "Aspect ratio of the image. Options: 'square_1_1', 'classic_4_3', 'traditional_3_4', 'widescreen_16_9', 'social_story_9_16', 'standard_3_2', 'portrait_2_3'.",
                    "default": "square_1_1",
                },
                "resolution": {
                    "type": "string",
                    "description": "Resolution of the generated image: '1k' (fastest, default), '2k', or '4k'.",
                    "default": "1k",
                },
                "wait": {
                    "type": "boolean",
                    "description": "Whether to wait and poll until generation finishes before returning (default: true).",
                    "default": True,
                },
                "download": {
                    "type": "boolean",
                    "description": "Whether to automatically download the generated image asset locally (default: true).",
                    "default": True,
                },
                "output_dir": {
                    "type": "string",
                    "description": "Optional local directory where downloaded assets should be saved. Defaults to your Downloads folder (~/Downloads).",
                },
            },
            "required": ["prompt"],
        },
    },
    {
        "name": "magnific_upscale_image",
        "description": "Upscale and enhance an image (2x, 4x, etc.) using Magnific's AI image upscaler. Automatically downloads the upscaled asset locally to ~/Downloads.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "Direct public URL of the image to upscale.",
                },
                "scale_factor": {
                    "type": "integer",
                    "description": "Upscaling multiplier: 2, 4, 8, or 16.",
                    "default": 2,
                },
                "prompt": {
                    "type": "string",
                    "description": "Optional prompt to guide new details and styling during creative upscaling.",
                },
                "creativity": {
                    "type": "integer",
                    "description": "Creativity level (0 to 100). Higher values add more hallucinated details.",
                },
                "wait": {
                    "type": "boolean",
                    "description": "Whether to wait and poll until upscaling finishes before returning (default: true).",
                    "default": True,
                },
                "download": {
                    "type": "boolean",
                    "description": "Whether to automatically download the upscaled image asset locally (default: true).",
                    "default": True,
                },
                "output_dir": {
                    "type": "string",
                    "description": "Optional local directory where downloaded assets should be saved. Defaults to your Downloads folder (~/Downloads).",
                },
            },
            "required": ["image_url"],
        },
    },
    {
        "name": "magnific_remove_background",
        "description": "Remove the background from an image using Magnific AI cutout. Automatically downloads the result locally to ~/Downloads.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "Direct public URL of the image.",
                },
                "wait": {
                    "type": "boolean",
                    "description": "Whether to wait and poll until the task finishes (default: true).",
                    "default": True,
                },
                "download": {
                    "type": "boolean",
                    "description": "Whether to automatically download the resulting asset locally (default: true).",
                    "default": True,
                },
                "output_dir": {
                    "type": "string",
                    "description": "Optional local directory where downloaded assets should be saved. Defaults to your Downloads folder (~/Downloads).",
                },
            },
            "required": ["image_url"],
        },
    },
    {
        "name": "magnific_download_asset",
        "description": "Download an asset (image/video) to a local directory, given an image URL or task ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Direct URL of the image or asset to download.",
                },
                "task_id": {
                    "type": "string",
                    "description": "Task ID of an existing completed generation or upscaling task.",
                },
                "endpoint": {
                    "type": "string",
                    "description": "Endpoint for task_id lookup (e.g. 'v1/ai/mystic' or 'v1/ai/image-upscaler'). Required if task_id is given.",
                    "default": "v1/ai/mystic",
                },
                "output_dir": {
                    "type": "string",
                    "description": "Directory to save the downloaded asset(s). Defaults to your Downloads folder (~/Downloads).",
                },
                "output_path": {
                    "type": "string",
                    "description": "Specific local file path to save a single downloaded asset.",
                },
            },
        },
    },
    {
        "name": "magnific_check_task",
        "description": "Check the status of an ongoing generation or upscaling task by ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "endpoint": {
                    "type": "string",
                    "description": "Endpoint path (e.g., 'v1/ai/mystic' or 'v1/ai/image-upscaler').",
                },
                "task_id": {
                    "type": "string",
                    "description": "Task identifier returned by an earlier call.",
                },
            },
            "required": ["endpoint", "task_id"],
        },
    },
]


def handle_tool_call(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Execute tool and return MCP result."""
    cli = get_client()

    if name == "magnific_test_connection":
        res = cli.test_connection()
        return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}], "isError": False}

    elif name == "magnific_generate_image":
        prompt = args["prompt"]
        aspect_ratio = args.get("aspect_ratio", "square_1_1")
        resolution = args.get("resolution", "1k")
        wait = args.get("wait", True)
        download = args.get("download", True)
        output_dir = args.get("output_dir")

        res = cli.create_mystic_image(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            wait=wait,
            download=download,
            output_dir=output_dir,
        )
        return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}], "isError": False}

    elif name == "magnific_upscale_image":
        image_url = args["image_url"]
        scale_factor = args.get("scale_factor", 2)
        prompt = args.get("prompt")
        creativity = args.get("creativity")
        wait = args.get("wait", True)
        download = args.get("download", True)
        output_dir = args.get("output_dir")

        res = cli.upscale_image(
            image_url=image_url,
            upscale_factor=scale_factor,
            prompt=prompt,
            creativity=creativity,
            wait=wait,
            download=download,
            output_dir=output_dir,
        )
        return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}], "isError": False}

    elif name == "magnific_remove_background":
        image_url = args["image_url"]
        wait = args.get("wait", True)
        download = args.get("download", True)
        output_dir = args.get("output_dir")

        res = cli.remove_background(
            image_url=image_url,
            wait=wait,
            download=download,
            output_dir=output_dir,
        )
        return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}], "isError": False}

    elif name == "magnific_download_asset":
        url = args.get("url")
        task_id = args.get("task_id")
        endpoint = args.get("endpoint", "v1/ai/mystic")
        output_dir = args.get("output_dir")
        output_path = args.get("output_path")

        if url:
            saved_path = cli.download_asset(url, output_path=output_path, output_dir=output_dir)
            result = {
                "status": "SUCCESS",
                "downloaded_files": [saved_path],
                "source_url": url,
            }
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}], "isError": False}

        elif task_id:
            task_data = cli.get_task_status(endpoint, task_id)
            saved_paths = cli.download_task_assets(task_data, output_dir=output_dir)
            result = {
                "status": "SUCCESS",
                "task_id": task_id,
                "downloaded_files": saved_paths,
            }
            return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}], "isError": False}

        else:
            raise ValueError("Either 'url' or 'task_id' must be provided to download an asset.")

    elif name == "magnific_check_task":
        endpoint = args["endpoint"]
        task_id = args["task_id"]
        res = cli.get_task_status(endpoint, task_id)
        return {"content": [{"type": "text", "text": json.dumps(res, indent=2)}], "isError": False}

    else:
        return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}


def send_response(response: Dict[str, Any]):
    """Write newline-delimited JSON-RPC response to stdout."""
    line = json.dumps(response, separators=(",", ":"))
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def process_message(msg: Dict[str, Any]):
    """Process a single JSON-RPC message."""
    method = msg.get("method")
    msg_id = msg.get("id")
    params = msg.get("params", {})

    log(f"Handling request: {method} (id={msg_id})")

    # 1. Initialize
    if method == "initialize":
        result = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
            },
            "serverInfo": {
                "name": "magnific-mcp",
                "version": "1.0.0",
            },
        }
        send_response({"jsonrpc": "2.0", "id": msg_id, "result": result})

    # 2. Initialized notification
    elif method == "notifications/initialized":
        log("Client initialized successfully.")

    # 3. Ping
    elif method == "ping":
        send_response({"jsonrpc": "2.0", "id": msg_id, "result": {}})

    # 4. List Tools
    elif method == "tools/list":
        send_response({"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}})

    # 5. Call Tool
    elif method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        try:
            res = handle_tool_call(tool_name, tool_args)
            send_response({"jsonrpc": "2.0", "id": msg_id, "result": res})
        except Exception as e:
            log(f"Error executing tool {tool_name}: {e}")
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                    "isError": True,
                },
            })

    # Unknown Method
    else:
        if msg_id is not None:
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}",
                },
            })


def main():
    log("Starting Magnific MCP server...")
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue

        # Handle optional Content-Length headers for clients using LSP framing
        if line.lower().startswith("content-length:"):
            try:
                length = int(line.split(":", 1)[1].strip())
                # Read empty line
                sys.stdin.readline()
                content = sys.stdin.read(length)
                msg = json.loads(content)
                process_message(msg)
            except Exception as e:
                log(f"Error parsing framed message: {e}")
            continue

        try:
            msg = json.loads(line)
            process_message(msg)
        except json.JSONDecodeError as e:
            log(f"Failed to parse JSON line: {e}")
        except Exception as e:
            log(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
