---
name: magnific
description: Context-aware Magnific AI + Adobe Illustrator integration. Automatically inspects the open Illustrator document (artboard size, aspect ratio, color swatches, selection) to place plain 2D editable vector icons (SVG), cutout objects, or photorealistic assets, and saves all assets to ~/Downloads.
---

# Magnific AI + Smart Illustrator Skill

Use this skill when generating assets with Magnific AI or placing icons, graphic elements, cutouts, and textures directly into Adobe Illustrator without requiring the user to specify detailed style prompts.

## Smart Context-Aware Illustrator Placement (Primary Workflow)

Whenever the user asks to place an icon, object, element, or image into Illustrator (e.g., *"place phone icon to illustrator /magnific"*, *"add instagram icon"*, *"try another"*, *"make it outline"*), run:

```bash
node /Users/admin/.gemini/config/plugins/magnific/smart_illustrator_placer.js "<user_request>"
```

### How It Automatically Adapts to the User:
1. **Reads Open Illustrator Context First**:
   - Inspects the active document name, artboard dimensions (`width × height`), aspect ratio, and extracts the dominant RGB/HEX color swatch directly from the artboard's text/paths.
2. **Smart Routing by Asset Type**:
   - **Icons & Symbols (`--mode icon`)**: Always delivers **plain, flat 2D editable vector paths (SVG)** via `doc.groupItems.createFromFile()`, colored to match the artboard's exact swatch (never a 3D raster box).
   - **Objects & Cutouts (`--mode cutout`)**: Enriches the prompt with the artboard's color palette, generates via Magnific Mystic, and places scaled to the artboard.
   - **Photos & Backgrounds (`--mode photo`)**: Matches the active artboard's aspect ratio (`square_1_1`, `portrait_2_3`, `traditional_3_4`, `widescreen_16_9`, `social_story_9_16`) and color palette.
3. **Auto-Scaling & In-Place Swapping**:
   - Scales icons proportionally to the artboard (e.g., `16pt` on a `50x85mm` hang tag vs larger on a carousel).
   - If the user says *"try another"*, *"next"*, *"make it outline/thin"*, or *"make it solid/bold"*, run with `--swap` (or pass the phrase directly) to replace the currently selected item in-place at the exact same coordinates and size.

### Supported CLI Flags for `smart_illustrator_placer.js`:
- `--mode icon|cutout|photo`: Force a specific asset pipeline.
- `--style filled|outline`: Switch between solid flat vectors and thin line vectors.
- `--swap`: Cycle to the next candidate variant and replace the selected item in-place.
- `--color "#HEX"`: Override the auto-detected artboard swatch color.
- `--size <pt>`: Override the auto-calculated point size.

---

## Standalone Magnific API Tools

1. **`magnific_generate_image`**: Generates high-resolution images using Mystic AI (`1k` fast default, `2k`, `4k`).
2. **`magnific_upscale_image`**: Upscales and enhances images (`2x`, `4x`, `8x`, `16x`).
3. **`magnific_remove_background`**: Removes background for clean transparent cutouts.
4. **`magnific_download_asset`**: Downloads assets to `/Users/admin/Downloads`.

## Headless API & Prohibited Chrome Automation (MANDATORY)

- **NEVER use Google Chrome or any web browser** to search, browse, scrape, or download assets.
- **ALWAYS use the headless REST API** directly with `MAGNIFIC_API_KEY`:
  - Search endpoint: `GET https://api.magnific.com/v1/resources`
  - Direct download endpoint: `GET https://api.magnific.com/v1/resources/{id}/download`
  - Exact headless query parameters supported:
    - `term=<search_terms>`
    - `filters[content_type][photo]=1`
    - `filters[premium]=1`
    - `filters[ai][excluded]=1`
    - `limit=<count>`

## Mandatory Rule
- All generated or downloaded assets are saved to `/Users/admin/Downloads`. Always provide the clickable local path (`file:///Users/admin/Downloads/...`).
