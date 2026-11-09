# AI Design Automation Engine

## What This Is
An autonomous, spec-driven creative production pipeline that orchestrates Adobe Illustrator ExtendScript automation (`TypeFlow.jsx`, `Image Export_v2.jsx`, `Print_PDF_Main_v2.jsx`), AI vector asset generation, and multi-platform social/print ad outputs.

## Core Value
Generate pixel-perfect, typography-locked, multi-ratio creatives (1:1, 9:16, 16:9) autonomously without human layout fatigue, text overflows, or design drift.

## Requirements

### Validated
- [x] ExtendScript batch runner architecture (`TypeFlow.jsx`)
- [x] High-resolution asset export pipeline (`Image Export_v2.jsx`)
- [x] GSD phased project framework integration and CLI hooks

### Active
- [ ] Phase 1: Creative Brief & Multi-Ratio Spec Architecture
- [ ] Phase 2: Generative Asset Pipeline & Vector Sourcing
- [ ] Phase 3: Headless Illustrator Layout Assembler
- [ ] Phase 4: Automated Visual QA & Bounds Verification
- [ ] Phase 5: Multi-Channel Packaging & Production Delivery

### Out of Scope
- Direct raster manipulation in Photoshop (all core creative composition happens in Illustrator vectors).
- Unstructured, single-prompt end-to-end rendering without intermediate spec checkpoints.

## Context
- Primary Design Host: Adobe Illustrator CC (macOS)
- Scripting Runtime: ExtendScript (.jsx) and Node.js automation
- Key Creative Assets: Meta Ads Creatives, Shahrukhz Waterfront Ad campaigns, Aromist eBooks
- Target Output Formats: 1080x1080 (1:1 Feed), 1080x1920 (9:16 Story/Reel), 1920x1080 (16:9 Display), Print-ready PDF plates

## Constraints
- **Layout Quality**: Zero text truncation or overlapping glyphs; paragraph frames must use explicit geometric constraints.
- **Color Fidelity**: Strict adherence to campaign hex palettes and CMYK/RGB profiles.
- **Process Boundaries**: Scripts must execute via isolated subagents to preserve context window tokens.

## Key Decisions
- Adopt GSD lifecycle hooks (`gsd-context-monitor.js`, `gsd-workflow-guard.js`) to prevent context bloating during heavy ExtendScript log execution.
- Maintain persistent campaign state in `.planning/STATE.md` across ad batches.
