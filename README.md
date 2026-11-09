# AI Design Automation Engine
> Autonomous, spec-driven multi-platform creative production pipeline orchestrating **Adobe Illustrator CC**, **Adobe After Effects**, **Adobe Photoshop**, and **Model Context Protocol (MCP)** servers.

---

## Architecture Overview

```
AI-Design-Automation/
├── core-engine/               # Multi-ratio layout engine & Python orchestration
│   ├── pipeline.py            # Primary pipeline coordinator
│   ├── layout.py              # Geometric bounds and aspect ratio solver (1:1, 9:16, 16:9)
│   ├── preflight.py           # Preflight checks (bleed, DPI, missing fonts, overflows)
│   ├── run.py                 # Multi-task runner
│   └── test_pipeline.js       # End-to-end pipeline validator
├── illustrator/               # Adobe Illustrator CC vector engine
│   ├── scripts/
│   │   ├── TypeFlow.jsx       # Automated typography layout & text frame constraints
│   │   ├── Image Export_v2.jsx# Batch multi-format export (PNG, SVG, PDF)
│   │   ├── Print_PDF_Main_v2.jsx # High-res CMYK/RGB print plate generator
│   │   └── smart_illustrator_placer.js # Context-aware artboard inspector & vector placer
│   └── skills/                # Antigravity & Agent skill definitions
│       ├── design-automation/
│       ├── vector-first-aid-illustrator/
│       ├── recreate-image-in-illustrator/
│       └── canva-illustrator-uploader/
├── after-effects/             # Adobe After Effects CC motion & video pipeline
│   └── skills/
│       ├── after-effects-puppet-animations/ # Illustrator artwork to puppet animation
│       ├── zigma-commercial-video-production/ # Commercial ad sequences
│       ├── zigma-start-opener-video/       # Dynamic 9:16 openers & product video loops
│       └── pub-perk-animation/              # Keyframe & kinetic animation rigs
├── photoshop/                 # Adobe Photoshop batch processing
│   └── scripts/
│       └── photoshop-resize.cjs # Headless Smart Object & canvas asset normalizer
├── mcp-servers/               # Model Context Protocol (MCP) server ecosystem
│   ├── mcp_config.example.json# Unified MCP server configuration template
│   ├── google-flow/           # Veo 2 / Omni 1.1 video & Nano Banana 2.1 generation
│   ├── magnific/              # Headless vector upscaling & artboard asset placement
│   ├── blender-mcp/           # Live 3D scene inspection, texturing, & headless rendering
│   ├── canva/                 # Multi-account Canva design creation & brand kit sync
│   ├── figma/                 # Figma Code Connect & design tokens integration
│   ├── instagram/             # Multi-account publishing, Reels & Story video delivery
│   └── whatsapp/              # Direct asset sharing & design approval notifications
└── .planning/                 # Project governance, creative matrix & phase roadmap
    ├── PROJECT.md             # Vision, constraints, and requirements
    ├── ROADMAP.md             # Multi-phase milestone progression
    ├── STATE.md               # Active workflow state
    └── specs/                 # Creative specifications & bounding matrices
```

---

## 1. Illustrator Vector Engine
- **TypeFlow (`TypeFlow.jsx`)**: Calculates text frame bounding boxes, preventing truncation, glyph overlaps, or unconstrained point-text overflow across arbitrary localized copy.
- **Plate Export (`Print_PDF_Main_v2.jsx`, `Image Export_v2.jsx`)**: Automates 300 PPI CMYK PDF print-plate creation with bleed markers and genuine transparent 32-bit PNG web deliverables.
- **Smart Placer (`smart_illustrator_placer.js`)**: Inspects open artboards in real-time, extracts dominant palette swatches, and embeds editable vector `GroupItem` elements formatted to match the canvas.

## 2. After Effects Motion Pipeline
- **Vector Rigging (`after-effects-puppet-animations`)**: Decomposes complex Illustrator layers into rigged puppet meshes with parent hierarchies, automated secondary motion, and loop markers.
- **Commercial Video (`zigma-commercial-video-production`)**: Standardized 9:16 vertical motion templates tailored for social media advertising (Meta Ads, TikTok, Instagram Reels).

## 3. Photoshop Image Pipeline
- **Smart Asset Normalization (`photoshop-resize.cjs`)**: Headless Node.js script communicating with Adobe Photoshop via ExtendScript DOM to normalize raster backdrops, isolate subject layers, and enforce standardized canvas bounds.

## 4. MCP Server Ecosystem
- **Google Flow MCP**: Direct bridge to Google Flow (`flow.google`) generating cinematic videos (Veo / Omni) and photorealistic image variants (Nano Banana).
- **Magnific MCP**: Contextual vector asset enhancement and 2D icon generation directly into Illustrator.
- **Blender MCP**: Live TCP socket integration (`127.0.0.1:9876`) for 3D product staging, EEVEE/Cycles studio lighting, and camera tracking.
- **Instagram MCP**: Multi-account publisher handling Reels aspect ratio clamps, Lexical editor keystroke injection, and live stream broadcasts.
- **Canva MCP**: Multi-account template synchronization, brand kit population, and cloud asset exports.

---

## Setup & Getting Started

### Prerequisites
- macOS Sonoma / Sequoia
- Adobe Creative Cloud (Adobe Illustrator CC, Adobe Photoshop 2026, Adobe After Effects)
- Node.js 18+ & Python 3.10+

### MCP Server Registration
Copy `mcp-servers/mcp_config.example.json` to your local MCP configuration (e.g., `~/.gemini/config/mcp_config.json`) and populate required API keys:
```bash
cp mcp-servers/mcp_config.example.json ~/.gemini/config/mcp_config.json
```

### Running the Test Pipeline
```bash
node core-engine/test_pipeline.js
```

---

## License & Ownership
Proprietary design automation pipeline developed for internal agency and client creative workflows.
