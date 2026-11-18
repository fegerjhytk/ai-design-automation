# Brand & Motion Engine MCP Plugin

Deterministic Model Context Protocol (MCP) server for autonomous brand strategy, typographic kerning, unflattened Adobe Illustrator CC master artboard generation, Google Flow retail staging, and GSAP kinetic motion sync.

## Tools Overview

1. `brand_anti_sameness_audit`: Deconstructs industry categories, surfaces cliches, and generates counter-anchor palettes and negative prompts.
2. `audit_typographic_kerning`: Scans character pairs for optical white-space traps and calculates tracking offsets.
3. `illustrator_build_identity`: Headlessly generates unflattened `.ai` master documents with 4-tier layer isolation.
4. `stage_environmental_mockup`: Prepares Google Flow / Nano Banana 2.1 scene prompts for testing packaging under retail shelf and daylight conditions.
5. `motion_sync_timeline`: Calculates frame-accurate GSAP kinetic typography schedules for HyperFrames and After Effects.
6. `codex_review_dispatch`: Prepares structured distinctiveness critique payloads for `/ask-codex`.

## Installation & Running

The server runs headlessly over stdio via Node.js v18+:
```bash
node /Users/admin/.gemini/config/plugins/brand-engine-mcp/server.js
```
Registered automatically in Antigravity via `mcp_config.json`.
