---
name: canva-illustrator-uploader
description: >-
  Automatically optimizes Adobe Illustrator (.ai) files using headless Canva_Optimizer_v2,
  extracts live typography manifests, verifies zero text loss, uploads native .ai files
  directly to Canva via Canva MCP, and aligns typography/kerning.
triggers:
  - "upload to canva"
  - "illustrator to canva"
  - "canva uploader"
  - "/canva-uploader"
  - "optimize and upload to canva"
---

# Canva Illustrator Uploader Skill

This skill automates the full pipeline from an open Adobe Illustrator (`.ai`) file to a published, typography-aligned Canva design document.

## Pipeline Architecture

```
[1. Safety Duplicate]
  • Master file is never modified.
  • Cloned to ~/Desktop/<Name>_CanvaReady.ai and opened in Illustrator.

[2. Pre-Raster Typography Manifest]
  • Scans every live TextFrame in the document.
  • Records font family, size, tracking (kerning in 1/1000 em), leading (line height), and coordinates.
  • Stored in ~/Desktop/<Name>_typography_manifest.json for later Canva matching.

[3. Headless Canva Optimizer]
  • Runs Canva_Optimizer_v2.jsx headless via ExtendScript (30-min timeout).
  • Protects all groups containing text frames.
  • Releases edge clipping masks (2pt tolerance).
  • Clusters small vector fragments (<100pt) within 40pt via Disjoint Set Union (DSU).
  • Rasterizes non-text artwork at 300 PPI with alpha transparency.
  • Cleans pasteboard items completely outside artboards.
  • Performs a final ungrouping pass.

[4. Strict Text Integrity Verification Gate]
  • Asserts: postTextCount === preTextCount.
  • Halts immediately if any live text frame was accidentally rasterized or removed.

[5. Direct Native .AI Upload to Canva]
  • Calls Canva MCP `create-upload-url` to obtain a single-use signed ingress URL.
  • Streams raw `.ai` file bytes directly with `Content-Type: application/octet-stream`.
  • Never converts to PDF first — Canva's cloud parser ingests native .ai files directly.

[6. Design Discovery & Polling]
  • Polls Canva `list-folder-items` (folder: "uploads") until the newly created design is detected.
  • Captures the Canva design ID, page count, and direct edit link (`https://www.canva.com/d/...`).

[7. Typography & Kerning Sync]
  • Inspects Canva rich text elements via Canva MCP `get-design-content`.
  • Cross-references against the Step 2 typography manifest.
  • Compares and aligns font sizing, tracking, and line height.
```

---

## Command Usage

Run directly from the terminal or have Antigravity execute it:

```bash
# Run the complete end-to-end pipeline on the active Illustrator document:
canva-uploader

# Run on a specific file path:
canva-uploader --file ~/Desktop/MyDesign_CanvaReady.ai

# Run only the Illustrator optimization & typography manifest:
canva-uploader --step optimize

# Run only the Canva upload and design discovery:
canva-uploader --step upload

# Run only typography inspection and kerning alignment:
canva-uploader --step sync
```

---

## Key Files & Locations

* **Skill Root**: `~/.gemini/config/skills/canva-illustrator-uploader/`
* **CLI Binary**: `~/.gemini/antigravity/bin/canva-uploader` (symlinked)
* **Pipeline Script**: `~/.gemini/config/skills/canva-illustrator-uploader/scripts/canva_uploader.js`
* **ExtendScript Optimizer**: `~/.gemini/config/skills/canva-illustrator-uploader/scripts/optimize_headless.jsx`
* **Typography Extractor**: `~/.gemini/config/skills/canva-illustrator-uploader/scripts/extract_typography.jsx`
* **Canva MCP Client**: `~/.gemini/config/skills/canva-illustrator-uploader/scripts/canva_client.js`
* **Account Sessions**: `~/.mcp-auth/accounts/personal/` (active) and `company/`
