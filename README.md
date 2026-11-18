# AI Design Automation Engine
> Autonomous, spec-driven multi-platform creative production pipeline orchestrating **Adobe Illustrator CC**, **Adobe InDesign CC**, **Adobe After Effects**, **Adobe Photoshop**, and **Model Context Protocol (MCP)** servers.

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
│       ├── design-automation/ # Master UI/UX and vector automation workflow
│       ├── design-qc-visual-diff/ # Deep document QC & pixel diff clustering engine
│       ├── illustrator-to-powerpoint/ # Export artboards into synchronized presentation decks
│       ├── autonomous-ad-designer/ # Multi-variant ad generation with Codex design critique
│       ├── vector-first-aid-illustrator/ # Automated path cleanup & repair
│       ├── recreate-image-in-illustrator/ # Faithful raster-to-vector reconstruction
│       └── canva-illustrator-uploader/ # Direct .ai to Canva cloud publishing
├── indesign/                  # Adobe InDesign CC editorial & print engine
│   └── skills/
│       ├── indesign-batch-export/ # Headless accelerated batch export (PDF, IDML, PNG)
│       ├── indesign-doc-diff/ # Document layout shift & typography token extractor
│       ├── klm-aggrea-xlsx-to-indesign/ # KLM & Air France XLSX matrix publisher & QA engine
│       └── excel-doc-crosscheck/ # Threaded comment extractor & document cross-check auditor
├── after-effects/             # Adobe After Effects CC motion & video pipeline
│   └── skills/
│       ├── ae-comp-to-gif/    # Butter-smooth GIF exporter with 50/25/20 FPS harmonics
│       ├── ae-motion-clone/   # Reference video motion & physics bounce/wobble cloner
│       ├── audio-video-sync-workflow/ # Kinetic typography & audio sync (Whisper/GSAP)
│       ├── after-effects-puppet-animations/ # Illustrator artwork to puppet rigged animation
│       ├── zigma-commercial-video-production/ # Commercial video ad sequences
│       ├── zigma-start-opener-video/ # Dynamic 9:16 vertical video opener sequences
│       └── pub-perk-animation/ # Keyframe rigs and motion presets
├── photoshop/                 # Adobe Photoshop batch processing
│   └── scripts/
│       └── photoshop-resize.cjs # Headless Smart Object & canvas asset normalizer
├── mcp-servers/               # Model Context Protocol (MCP) server ecosystem
│   ├── mcp_config.example.json# Unified MCP server configuration template
│   ├── brand-engine-mcp/      # Mirai Matcha anti-sameness brand strategy & ExtendScript builder
│   ├── google-flow/           # Veo 2 / Omni 1.1 video & Nano Banana 2.1 generation
│   ├── magnific/              # Headless vector upscaling & artboard asset placement
│   ├── blender-mcp/           # Live 3D scene inspection, texturing, & headless rendering
│   ├── canva/                 # Multi-account Canva design creation & brand kit sync
│   ├── figma/                 # Figma Code Connect & design tokens integration
│   ├── instagram/             # Multi-account publishing, Reels & Story video delivery
│   └── whatsapp/              # Direct asset sharing & design approval notifications
└── .planning/                 # Project governance, creative matrix & 10-phase roadmap
    ├── PROJECT.md             # Vision, constraints, and requirements
    ├── ROADMAP.md             # Multi-phase milestone progression (Phases 01-10)
    ├── REQUIREMENTS.md        # Comprehensive verification criteria
    ├── STATE.md               # Active workflow state
    ├── specs/                 # Creative specifications & bounding matrices
    └── phases/                # Phase execution contracts (01 through 10)
```

---

## 1. Illustrator Vector Engine
- **TypeFlow (`TypeFlow.jsx`)**: Calculates text frame bounding boxes, preventing truncation, glyph overlaps, or unconstrained point-text overflow across arbitrary localized copy.
- **Plate Export (`Print_PDF_Main_v2.jsx`, `Image Export_v2.jsx`)**: Automates 300 PPI CMYK PDF print-plate creation with bleed markers and genuine transparent 32-bit PNG web deliverables.
- **Design QC Visual Diff (`design-qc-visual-diff`)**: Autonomous preflight auditor detecting hex/palette mismatches, copy-paste artifacts, font variances, and generating interactive pixel-diff clustering reports with non-printing on-canvas marker pins.
- **Smart Placer (`smart_illustrator_placer.js`)**: Inspects open artboards in real-time, extracts dominant palette swatches, and embeds editable vector `GroupItem` elements formatted to match the canvas.

## 2. InDesign Editorial & Publishing Engine
- **Batch Export Engine (`indesign-batch-export`)**: Headless `app.open(file, false)` execution yielding 3x–5x export acceleration. Preflights missing links, fonts, and oversets while producing companion `.idml` archives and zero-padded single-page PDFs.
- **Document Diff & Typography Inspector (`indesign-doc-diff`)**: Deep AST inspection comparing page geometries, threaded story flow, parent master spreads, cell insets, and typography tokens (`--inspect-typo`).
- **Matrix-to-Document Publisher (`klm-aggrea-xlsx-to-indesign`)**: End-to-end multi-language Excel matrix ingestion, headless InDesign document generation, and 100% bi-directional dot matrix QA verification.
- **Excel Cross-Check Auditor (`excel-doc-crosscheck`)**: Inspects modern XML threaded comments from Excel spreadsheets and cross-verifies document claims under a strict approval gate.

## 3. After Effects Motion Pipeline
- **Harmonic GIF Exporter (`ae-comp-to-gif`)**: Converts compositions into butter-smooth, non-lagging GIFs using GIF89a 10ms integer clock rules (50, 25, or 20 FPS), seamless loop seam protection, and two-pass differential palette optimization.
- **Motion Cloner (`ae-motion-clone`)**: Reverse-engineers motion choreography from reference videos/URLs (gravity drop, air wobble, overshoot bounce, settle) and synthesizes native cubic bezier easing (`KeyframeEase`) onto target AE layers.
- **Audio-Video Kinetic Sync (`audio-video-sync-workflow`)**: Bridges Whisper/Demucs audio stem parsing with GSAP timelines and HyperFrames kinetic typography.
- **Vector Puppet Rigging (`after-effects-puppet-animations`)**: Decomposes complex Illustrator layers into rigged puppet meshes with parent hierarchies and secondary motion loops.

## 4. Brand & Motion Engine MCP (`brand-engine-mcp`)
- **Category Anti-Sameness Audit (`brand_anti_sameness_audit`)**: Deconstructs industry niches, flags cliché palettes and symbols, derives authentic counter-anchors, and injects automated negative prompts.
- **Typographic Wordmark Sovereignty & Kerning (`audit_typographic_kerning`)**: Enforces pure 100% vector typography logos and calibrates optical letter-pair gap traps (`R-A`, `A-V`, `T-O`).
- **The Bonsai Rule (`illustrator_build_identity`)**: Decouples secondary graphic emblems and wax seals onto dedicated layers, isolating hero wordmarks from graphic badges.
- **Environmental Staging (`stage_environmental_mockup`)**: Generates directorial scene prompts for Google Flow / Nano Banana 2.1 to test retail shelf contrast and daylight finishes.

## 5. Photoshop Image Pipeline
- **Smart Asset Normalization (`photoshop-resize.cjs`)**: Headless Node.js script communicating with Adobe Photoshop via ExtendScript DOM to normalize raster backdrops, isolate subject layers, and enforce standardized canvas bounds.

## 6. MCP Server Ecosystem
- **Google Flow MCP**: Direct bridge to Google Flow (`flow.google`) generating cinematic videos (Veo / Omni) and photorealistic image variants (Nano Banana).
- **Magnific MCP**: Contextual vector asset enhancement and 2D icon generation directly into Illustrator.
- **Blender MCP**: Live TCP socket integration (`127.0.0.1:9876`) for 3D product staging, EEVEE/Cycles studio lighting, and camera tracking.
- **Instagram MCP**: Multi-account publisher handling Reels aspect ratio clamps, Lexical editor keystroke injection, and live stream broadcasts.
- **Canva MCP**: Multi-account template synchronization, brand kit population, and cloud asset exports.
- **WhatsApp MCP**: Headless messaging engine with QR pairing and asset drop workflows for review notifications.

---

## 10-Phase Production Roadmap (`.planning/`)
- **Phase 01:** Royal Stacks Folio AE Project Generation (`01-royal-stacks-folio-ae`)
- **Phase 02:** Design QC & Visual Difference Engine Skill (`02-design-qc-visual-diff`)
- **Phase 03:** After Effects Composition to Butter-Smooth GIF (`03-ae-comp-to-gif`)
- **Phase 04:** Reference-Driven Motion Matcher Skill (`04-ae-motion-clone`)
- **Phase 05:** Brand & Motion Engine MCP Plugin (`05-brand-engine-mcp`)
- **Phase 06:** InDesign Document Diff & Typography Inspector (`06-indesign-doc-diff`)
- **Phase 07:** Excel Master Cross-Check & Threaded Comment Inspector (`07-excel-doc-crosscheck`)
- **Phase 08:** KLM Aggrea XLSX to InDesign Batch Publisher & QA Auditor (`08-klm-aggrea-xlsx-to-indesign`)
- **Phase 09:** Automated InDesign Batch Export & Preflight Engine (`09-indesign-batch-export`)
- **Phase 10:** Illustrator to InDesign 4-Page Booklet Conversion & Automated QC (`10-illustrator-to-indesign-booklet`)

---

## Setup & Getting Started

### Prerequisites
- macOS Sonoma / Sequoia
- Adobe Creative Cloud (Adobe Illustrator CC, Adobe InDesign CC, Adobe Photoshop 2026, Adobe After Effects CC)
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
