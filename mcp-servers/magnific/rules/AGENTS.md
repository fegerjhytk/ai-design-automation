# Magnific & Smart Illustrator Guidelines

When the Magnific plugin or `/magnific` is used:
- **Context-First Illustrator Placement**: When the user asks to place an icon, symbol, object, or image into Illustrator, ALWAYS run `/Users/admin/.gemini/config/plugins/magnific/smart_illustrator_placer.js` so it automatically inspects the open Illustrator document's artboard size, aspect ratio, and dominant color swatches first.
- **Icons Must Be Plain 2D Editable Vectors**: Never generate 3D raster images for icons. Always use the vector SVG pipeline (`--mode icon`) so icons are placed into Illustrator as true editable vector paths (`GroupItem`) colored to match the active artboard's swatch.
- **In-Place Swapping**: If the user says *"try another"*, *"next"*, *"make it outline/thin"*, or *"make it solid/bold"*, run `smart_illustrator_placer.js` to replace the selected item in-place on the artboard.
- **Strict Headless API Operations (NEVER USE CHROME)**:
  - NEVER use Google Chrome, browser automation, AppleScript tab scripting, or browser clicks to search, scrape, or download assets.
  - ALWAYS use the headless Magnific REST API (`https://api.magnific.com/v1/resources` and `https://api.magnific.com/v1/resources/{id}/download`) using `MAGNIFIC_API_KEY` (configured in `mcp_config.json`).
  - Supports headless filters: `filters[content_type][photo]=1`, `filters[premium]=1`, `filters[ai][excluded]=1`.
- **Downloads Rule**: All generated or downloaded assets are saved directly to `/Users/admin/Downloads`. Always provide the clickable local path (`file:///Users/admin/Downloads/...`).
