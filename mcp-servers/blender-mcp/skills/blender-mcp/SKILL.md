---
name: blender-mcp
description: Live two-way control and headless automation of Blender (/Applications/Blender.app) via the Blender MCP plugin and TCP socket add-on. Use whenever the user asks to create, edit, texture, light, inspect, or render 3D scenes, objects, shaders, Geometry Nodes, or animations in Blender.
---

# Blender MCP Skill (`blender-mcp`)

Connects Google Antigravity directly to **Blender 5.2.2 LTS** (`/Applications/Blender.app/Contents/MacOS/Blender`) in two modes:

1. **Live Viewport Mode (`127.0.0.1:9876`)** — Real-time two-way control of an open Blender session via the pre-installed `blender_mcp_addon.py` add-on.
2. **Headless CLI Mode (`blender_run_headless`)** — Background `bpy` execution and rendering even when the Blender GUI app is closed.

---

## Quick Start: Enabling Live Control in Blender

The add-on is already installed in Blender 5.2's add-ons folder and saved in `~/Downloads`:
- **Blender Add-ons Path:** `/Users/admin/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp_addon.py`
- **Downloads Copy:** `/Users/admin/Downloads/blender_mcp_addon.py`

To turn on the live listener inside Blender:
1. Open `/Applications/Blender.app`.
2. Go to **Edit > Preferences > Add-ons**, search for **Blender MCP (Antigravity Bridge)**, and enable the checkbox (or click **Install from Disk...** and select `/Users/admin/Downloads/blender_mcp_addon.py`).
3. In the 3D Viewport, press **`N`** to open the right-hand Sidebar, click the **`BlenderMCP`** tab, and click **Start MCP Server** (listens on `127.0.0.1:9876`).

---

## Available MCP Tools

| Tool Name | Purpose |
|-----------|---------|
| `blender_status` | Check if live Blender TCP server (`127.0.0.1:9876`) is connected and verify `/Applications/Blender.app` binary |
| `blender_get_scene_info` | List all objects, active camera, render engine, resolution, and world info in the open scene |
| `blender_get_object_info` | Inspect transform, vertex/polygon counts, modifiers, and materials on a named object |
| `blender_create_object` | Create `CUBE`, `SPHERE`, `ICO_SPHERE`, `CYLINDER`, `CONE`, `TORUS`, `PLANE`, `MONKEY`, `EMPTY`, `CAMERA`, or `LIGHT` |
| `blender_modify_object` | Move, rotate, scale, rename, or toggle visibility of an object |
| `blender_delete_object` | Remove an object from the scene |
| `blender_set_material` | Create/update a Blender 4.x/5.x Principled BSDF material (`Base Color`, `Metallic`, `Roughness`, `IOR`, `Transmission Weight`, `Emission Color`) |
| `blender_execute_code` | Run arbitrary `bpy` / `bmesh` / `mathutils` Python code on Blender's main thread |
| `blender_capture_viewport` | Save a viewport/camera render to `/Users/admin/Downloads` and return the `file://` path for visual inspection |
| `blender_polyhaven_search` | Search free Poly Haven HDRIs, PBR textures, and models |
| `blender_polyhaven_download` | Download a Poly Haven HDRI or PBR texture and wire it directly into the scene |
| `blender_run_headless` | Run any `bpy` Python script in `/Applications/Blender.app/Contents/MacOS/Blender --background` |

---

## Blender 5.2 Python (`bpy`) Guidelines

- **Principled BSDF Sockets:** Always use Blender 4.x/5.x socket names:
  - `"Base Color"`, `"Metallic"`, `"Roughness"`, `"IOR"`, `"Alpha"`
  - `"Emission Color"`, `"Emission Strength"`
  - `"Transmission Weight"` (replaces old `"Transmission"`)
  - `"Coat Weight"` (replaces old `"Clearcoat"`)
- **Render Engines:** Use `'BLENDER_EEVEE'` for fast EEVEE renders or `'CYCLES'` for raytraced renders.
- **Saves & Exports:** Save rendered previews and `.blend` outputs to `/Users/admin/Downloads` and provide clickable `file:///Users/admin/Downloads/...` links.
