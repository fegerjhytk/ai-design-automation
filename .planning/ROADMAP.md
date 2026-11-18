# Project Roadmap: Royal Stacks Franchise Folio Case Study

**Milestone:** v1.0 — Editable After Effects Presentation Deck  
**Objective:** Rework the Royal Stacks franchise case study into an award-winning, editorial After Effects presentation file containing Slides 3, 5, 7, 9, and 10 with fully editable text, modular slide compositions, linked high-res assets, and a clean master timeline saved directly on Desktop.

---

### Phases

- [ ] **Phase 01: Royal Stacks Folio AE Project Generation**
  - **Goal:** Build a production-ready, fully editable Adobe After Effects project (`Royal_Stacks_Folio_Slides.aep`) on Desktop featuring Slides 03, 05, 07, 09, and 10 as individual slide compositions and a master presentation composition. Every title, label, color code, and headline must be a native After Effects editable TextLayer.
  - **Status:** Planning
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/01-royal-stacks-folio-ae/01-CONTEXT.md`
    - `.planning/phases/01-royal-stacks-folio-ae/01-01-PLAN.md`

- [x] **Phase 02: Design QC & Visual Difference Engine Skill**
  - **Goal:** Develop and deploy the `design-qc-visual-diff` skill into `~/.gemini/config/skills/design-qc-visual-diff/` with automated document auditing (brand swatches, hex label mismatches, typography brief compliance, copy-paste artifacts) and multi-mode visual change comparisons (side-by-side image mode, marked diff mode with bounding boxes and numbered callouts, and in-Illustrator non-printing marker layers).
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/02-design-qc-visual-diff/02-CONTEXT.md`
    - `.planning/phases/02-design-qc-visual-diff/02-01-PLAN.md`

- [x] **Phase 03: After Effects Composition to Butter-Smooth GIF Skill (`ae-comp-to-gif`)**
  - **Goal:** Build and deploy the `ae-comp-to-gif` skill into `~/.gemini/config/skills/ae-comp-to-gif/` to programmatically export After Effects compositions into butter-smooth, non-lagging GIFs. Automatically adjust framerate to exact GIF centisecond harmonics (50, 25, or 20 FPS), synchronize nested pre-comp durations, ensure seamless looping without hitch/pause, perform two-pass differential palette optimization, produce dual-tier outputs (Master + Web-Optimized), and verify frame timing via automated `ffprobe` packet inspection.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/03-ae-comp-to-gif/03-CONTEXT.md`
    - `.planning/phases/03-ae-comp-to-gif/03-01-PLAN.md`
    - `~/.gemini/config/skills/ae-comp-to-gif/SKILL.md`

- [x] **Phase 04: Reference-Driven Motion Matcher Skill (`ae-motion-clone`)**
  - **Goal:** Build and deploy the `ae-motion-clone` skill into `~/.gemini/config/skills/ae-motion-clone/` to extract animation choreography, physics curves (gravity drop, air wobble, overshoot bounce, settle), and staggered timing from any reference video or URL (e.g. Behance, YouTube, Loom, MP4/GIF), and automatically map and apply that exact motion to layers of any target composition in Adobe After Effects. Supports semantic layer filtering (e.g. `--elements-only` to preserve static typography), customizable physics damping, and duration scaling.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/04-ae-motion-clone/04-CONTEXT.md`
    - `.planning/phases/04-ae-motion-clone/04-01-PLAN.md`
    - `~/.gemini/config/skills/ae-motion-clone/SKILL.md`

- [x] **Phase 05: Brand & Motion Engine MCP Plugin (`brand-engine-mcp`)**
  - **Goal:** Build, scaffold, and deploy the `brand-engine-mcp` plugin in `~/.gemini/config/plugins/brand-engine-mcp/` as an executable Model Context Protocol server. Exposes tools for category anti-cliche deconstruction, unflattened Adobe Illustrator CC master artwork generation via headless ExtendScript, optical typographic kerning audits, Google Flow environmental staging, and Whisper/GSAP kinetic motion sync.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/05-brand-engine-mcp/05-CONTEXT.md`
    - `.planning/phases/05-brand-engine-mcp/05-01-PLAN.md`
    - `~/.gemini/config/plugins/brand-engine-mcp/server.js`
    - `/Users/admin/Desktop/Mirai_Matcha/Mirai_Matcha.ai`

- [x] **Phase 06: InDesign Document Diff & Typography Inspector Skill (`indesign-doc-diff`)**
  - **Goal:** Build and deploy the `indesign-doc-diff` skill in `~/.gemini/config/skills/indesign-doc-diff/` with automated document comparison (identifying structural page layout shifts, parent/master spread assignments, section offsets, threaded tables, cell insets, legend groupings, broken links, swatch deltas) and deep typography token extraction (`--inspect-typo`).
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/06-indesign-doc-diff/06-CONTEXT.md`
    - `.planning/phases/06-indesign-doc-diff/06-01-PLAN.md`
    - `.planning/phases/06-indesign-doc-diff/06-VERIFICATION.md`
    - `~/.gemini/config/skills/indesign-doc-diff/SKILL.md`
    - `~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js`
    - `~/.gemini/config/skills/indesign-doc-diff/scripts/indesign_inspector.jsx`

- [x] **Phase 07: Excel Master Cross-Check & Threaded Comment Inspector Skill (`excel-doc-crosscheck`)**
  - **Goal:** Build and register the `excel-doc-crosscheck` skill in `~/.gemini/config/skills/excel-doc-crosscheck/` to autonomously extract cell content and modern threaded comments (`threadedComment*.xml`) from master Excel `.xlsx` spreadsheets, cross-check text and color status dots against active open documents (Illustrator, InDesign, CSV, or markdown), enforce strict read-only preflight auditing, and execute safe automated corrections with a mandatory user approval gate.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/07-excel-doc-crosscheck/07-CONTEXT.md`
    - `.planning/phases/07-excel-doc-crosscheck/07-01-PLAN.md`
    - `~/.gemini/config/skills/excel-doc-crosscheck/SKILL.md`
    - `~/.gemini/config/skills/excel-doc-crosscheck/scripts/extract_threaded_comments.py`
    - `~/.gemini/config/skills/excel-doc-crosscheck/scripts/crosscheck_document.py`

- [x] **Phase 08: KLM Aggrea XLSX to InDesign Batch Publisher & QA Auditor Skill (`klm-aggrea-xlsx-to-indesign`)**
  - **Goal:** Extract, package, and deploy the complete Excel-to-InDesign batch publishing and automated QA auditing engine developed during the Air France–KLM NDC Aggregator Overview project into a standardized, reusable Antigravity skill (`klm-aggrea-xlsx-to-indesign`, aliased as `klm-aggregator-xlsx-to-indesign` and `xlsx-indesign-batch-publisher`). Features multi-language Excel matrix ingestion, headless InDesign inspection, human-in-the-loop pre-execution approval gates, chunked batch generation, 100% bi-directional rating dot auditing against Excel ground truth, and synchronous high-resolution PDF export with zero-overset protection.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/08-klm-aggrea-xlsx-to-indesign/08-CONTEXT.md`
    - `.planning/phases/08-klm-aggrea-xlsx-to-indesign/08-01-PLAN.md`
    - `.planning/phases/08-klm-aggrea-xlsx-to-indesign/08-VERIFICATION.md`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/SKILL.md`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/matrix_parser.py`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/inspect_template.jsx`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/batch_generate.jsx`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/audit_dots.jsx`
    - `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/publish_matrix.sh`

- [x] **Phase 09: Automated InDesign Batch Export & Preflight Engine (`indesign-batch-export`)**
  - **Goal:** Develop, package, and deploy the `indesign-batch-export` skill in `~/.gemini/config/skills/indesign-batch-export/` to automate batch document export across `.indd` project trees with headless background execution (`app.open(file, false)` for 3x–5x acceleration), comprehensive preflight health auditing (missing links, missing fonts, overset text stories), persistent configuration retention across InDesign restarts, companion IDML generation, single-page zero-padded PDF splitting, and an autonomous Node.js CLI runner.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/09-indesign-batch-export/09-CONTEXT.md`
    - `.planning/phases/09-indesign-batch-export/09-01-PLAN.md`
    - `.planning/phases/09-indesign-batch-export/09-VERIFICATION.md`
    - `~/.gemini/config/skills/indesign-batch-export/SKILL.md`
    - `~/.gemini/config/skills/indesign-batch-export/scripts/batch_export.jsx`
    - `~/.gemini/config/skills/indesign-batch-export/scripts/indesign_batch_export.js`

- [x] **Phase 10: Illustrator to InDesign 4-Page Booklet Conversion & Automated QC Engine (`illustrator-to-indesign-booklet`)**
  - **Goal:** Convert the open 4-artboard Adobe Illustrator document (`21 Days Fast_FastBooklet.ai`) into an editorial 4-page Adobe InDesign document (`21_Days_Fast_FastBooklet.indd`) saved directly to Desktop with companion `.idml` and `.pdf`, zero preflight errors (missing fonts, missing links, overset stories), and comprehensive visual QC diff verification using `design-qc-visual-diff`.
  - **Status:** Complete
  - **Depends on:** None
  - **Artifacts:**
    - `.planning/phases/10-illustrator-to-indesign-booklet/10-CONTEXT.md`
    - `.planning/phases/10-illustrator-to-indesign-booklet/10-01-PLAN.md`
    - `.planning/phases/10-illustrator-to-indesign-booklet/10-VERIFICATION.md`
    - `/Users/admin/Desktop/21_Days_Fast_FastBooklet.indd`
    - `/Users/admin/Desktop/21_Days_Fast_FastBooklet.pdf`
    - `/Users/admin/Desktop/21_Days_Fast_FastBooklet.idml`
    - `/Users/admin/Desktop/QC/Preflight_Audit_Report.txt`
    - `/Users/admin/Desktop/QC/diff_results/index.html`





