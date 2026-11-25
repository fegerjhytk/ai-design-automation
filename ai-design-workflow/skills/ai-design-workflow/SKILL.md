---
name: ai-design-workflow
description: Unified AI Design Workflow & Brand-Motion Engine. Routes brand strategy, typographic kerning, unflattened Illustrator builds, Meta ads, vector repair, visual diff QC, Photoshop Mars conditioning, InDesign publishing/Excel QA, After Effects motion, and HyperFrames audio-video sync through one entry point.
triggers:
  - "ai design workflow"
  - "design workflow"
  - "brand and motion engine"
  - "brand-engine"
  - "unified design pipeline"
---

# AI Design Workflow (`/ai-design-workflow`)

Single unified entry point combining `/Users/admin/Documents/AI-Design-Automation/` and the **Brand & Motion Engine** tools under `ai-design-workflow`.

---

## 1. Unified MCP Tools (`ai-design-workflow` server)

Use these MCP tools first whenever the task maps to strategy, kerning, starter identity builds, staging, motion timelines, or workflow orchestration:

| Tool | Purpose |
| :--- | :--- |
| `design_workflow_status` | Read-only environment check (Adobe Illustrator/Photoshop/After Effects/InDesign, core-engine, Chrome active tab, and sub-skills) |
| `design_workflow_run_action` | Dispatches validated `pipeline_runner.js` actions (`audit`, `cleanup`, `fit`, `qc`, `qc-markers`, `diff`, `ps-status`, `ps-crop`, `ps-mask`, `ps-report`, `ae-status`, `ai-video-status`, `animate`, `motion-clone`, `comp-to-gif`, `chrome-status`, `export`) |
| `design_workflow_preflight` | Runs deterministic `core-engine` preflight/test validation or InDesign doc inspection (`--inspect-typo`) |
| `brand_anti_sameness_audit` | Category cliché audit + heritage counter-anchor + negative prompt injection |
| `audit_typographic_kerning` | Optical letter-pair trap detection (`RA`, `AV`, `VA`, `TO`, etc.) + ExtendScript tracking |
| `illustrator_build_identity` | Generates editable 4-layer `.ai` master (`Wordmark (Hero)`, `Secondary Seals`, `Atmospheric Gradients`, `Packaging Dielines`) |
| `stage_environmental_mockup` | Generates Google Flow `Nano Banana 2.1` retail/daylight/moody staging payloads (ask aspect ratio first) |
| `motion_sync_timeline` | BPM-aligned word schedule, GSAP timeline code, and After Effects JSX script |
| `codex_review_dispatch` | Prepares `/ask-codex` anti-sameness critique payloads |

---

## 2. Sub-Pipeline Routing Matrix

Route specialized requests to the corresponding skill or module under `/Users/admin/Documents/AI-Design-Automation/`:

| Domain | Sub-Skill / Engine | Canonical Path |
| :--- | :--- | :--- |
| **Brand Strategy & Anti-Sameness** | `anti-sameness-branding` | `ai-design-workflow` MCP + `~/.gemini/config/skills/anti-sameness-branding/` |
| **Illustrator Universal Pipeline** | `design-automation` | `illustrator/skills/design-automation/scripts/pipeline_runner.js` |
| **Luxury Meta Ads** | `autonomous-ad-designer` | `illustrator/skills/autonomous-ad-designer/` |
| **Carousels, Starters & Artboards** | `illustrator-journal-starter`, `illustrator-carousel-engine`, `illustrator-artboard-layout` | `illustrator/skills/` |
| **Campaign Resizes (23-size)** | `pub-perk-resizes` | `illustrator/skills/pub-perk-resizes/` |
| **Vector Repair & Image-to-AI** | `vector-first-aid-illustrator`, `recreate-image-in-illustrator` | `illustrator/skills/` |
| **Design QC & Visual Diff** | `design-qc-visual-diff` | `illustrator/skills/design-qc-visual-diff/scripts/` |
| **Illustrator → PowerPoint / Canva** | `illustrator-to-powerpoint`, `canva-illustrator-uploader` | `illustrator/skills/` |
| **InDesign Batch Export & Diff** | `indesign-batch-export`, `indesign-doc-diff` | `indesign/skills/` |
| **XLSX Matrix → InDesign & QA** | `klm-aggrea-xlsx-to-indesign`, `excel-doc-crosscheck` | `indesign/skills/` |
| **After Effects Motion & GIFs** | `ae-motion-clone`, `ae-vertical-reel-editor`, `ae-comp-to-gif`, `after-effects-puppet-animations`, `pub-perk-animation`, `zigma-video-production` | `after-effects/skills/` |
| **Audio-Video Sync (HyperFrames)** | `audio-video-sync-workflow` | `after-effects/skills/audio-video-sync-workflow/` |
| **Deterministic Core Engine** | `core-engine` | `core-engine/{pipeline.py,run.py,layout.py,preflight.py}` |

---

## 3. Standard Execution Flow

1. **Check Readiness:** Run `design_workflow_status` (or `pipeline_runner.js --action ae-status` / `ps-status`).
2. **Strategy & Assets:** For brand/ad projects, run `brand_anti_sameness_audit` + `audit_typographic_kerning`, and stage hero assets via Google Flow (`Nano Banana 2.1`, confirming aspect ratio first) or Photoshop Mars Premedia conditioning (`ps-crop`, `ps-mask`).
3. **Build & Repair:** Construct `.ai` / `.indd` layouts preserving 100% verbatim copy, then run `cleanup` (`vector-first-aid-illustrator`) and `fit`.
4. **QC Gate:** Run `qc` / `qc-markers` / `diff` (`design-qc-visual-diff`) or `design_workflow_preflight` before any final export or video render.
5. **Motion / Reels / Delivery:** Generate synchronized timelines (`motion_sync_timeline`, `ae-motion-clone`, `ae-vertical-reel-editor`, `pub-perk-animation`, `audio-video-sync-workflow`), keep Illustrator/After Effects open with native files saved, and quit Photoshop when finished.
