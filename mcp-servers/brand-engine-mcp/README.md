# Brand & Motion Engine MCP Plugin

Deterministic Model Context Protocol (MCP) server for autonomous brand strategy, typographic kerning, unflattened Adobe Illustrator CC master artboard generation, Google Flow retail staging, and GSAP kinetic motion sync.

## Tools Overview

1. `brand_anti_sameness_audit`: Deconstructs industry categories, surfaces cliches, and generates counter-anchor palettes and negative prompts.
2. `audit_typographic_kerning`: Scans character pairs for optical white-space traps and calculates tracking offsets.
3. `illustrator_build_identity`: Uses desktop Illustrator on macOS to generate editable four-layer `.ai` starter files. Uses `OUTPUT_DIR` when set and Desktop otherwise.
4. `stage_environmental_mockup`: Prepares Google Flow / Nano Banana 2.1 scene prompts for testing packaging under retail shelf and daylight conditions.
5. `motion_sync_timeline`: Returns a frame-aligned word schedule, GSAP for HyperFrames, and JSX that adds an editable 1920 × 1080 composition to the current After Effects project. Word starts follow the beat grid or subdivisions when the requested cadence needs them. The JSX uses native position and opacity keyframes. After Effects project saves and renders are separate steps.
6. `codex_review_dispatch`: Prepares structured distinctiveness critique payloads for `/ask-codex`.

## Installation & Running

The server runs headlessly over stdio via Node.js v18+:
```bash
node /Users/admin/.gemini/config/plugins/brand-engine-mcp/server.js
```
Registered automatically in Antigravity via `mcp_config.json`.

## Core Pipeline & Workflow Rules

- **Footage / Fotage Asset Staging**: Any unpacked `.ai` files prepared for After Effects animation must strictly be placed inside a dedicated `<Project>/Footage/` or `<Project>/Fotage/` folder, never left loose in root.
- **Multi-Software Coordination**: When using 2 or more software applications simultaneously (Illustrator, After Effects, etc.), keep all apps and projects open throughout the work.
- **No Export Required / Keep Open**: Do not produce final output video files (`.mp4`, `.mov`) unless explicitly requested. Simply save native `.aep`/`.ai` files and keep the projects open in the software for the user.
