# Project Requirements: Royal Stacks Folio AE Generation

| ID | Requirement | Category | Target | Status |
|---|---|---|---|---|
| REQ-01 | Single consolidated After Effects project file placed directly at `/Users/admin/Desktop/Royal_Stacks_Folio_Slides.aep` | Architecture | Project | Pending |
| REQ-02 | Compositions modularly divided per slide (`Slide_03_Website`, `Slide_05_Colors`, `Slide_07_Elements`, `Slide_09_Brand_Cards`, `Slide_10_Invitation`) plus a `Master_Folio_Presentation` sequence | Architecture | Compositions | Pending |
| REQ-03 | 100% of all typography and copy must be native After Effects editable `TextLayer` objects (never outlined vector paths or rasterized bitmap text) | Typography | Text Engine | Pending |
| REQ-04 | Slide 03: High-res MacBook mockup display with responsive `#Landing Page_V2.1.png` screen integration and editable title/URL metadata | Slide 03 | Layout | Pending |
| REQ-05 | Slide 05: Cascading color card system with 5 exact brand color blocks (`Royal Blue #002C8C`, `Yellow #FEC52A`, `Off White #FEF2E2`, `Gold #8B7448`, `White #FFFFFF`) and editable color names & hex values | Slide 05 | Design System | Pending |
| REQ-06 | Slide 07: Editorial sticker and graphic device layout including "Elements & Icons" headline, "CULT FOLLOWING" and "SINCE 2016" badges, running cow & burger mascots, fresh ingredients illustration, food cutouts, and taped polaroids | Slide 07 | Brand Assets | Pending |
| REQ-07 | Slide 09: Dual brand identity cards (Cream outline card + Royal Blue solid card with radiant sunburst crown logo) and vertical color swatch chips with editable text | Slide 09 | Brand Cards | Pending |
| REQ-08 | Slide 10: Bold editorial franchise invitation ("An invitation to own a Royal Stacks.") with oversized yellow crown contour and layered social campaign ad cards | Slide 10 | Campaign | Pending |
| REQ-09 | Standardized canvas dimensions: 2048 x 1447 px (exact Figma aspect ratio 1.415:1), 30 fps, 10s composition duration | Specs | Format | Pending |
| REQ-10 | Standalone self-contained asset folder linking extracted transparent PNG cutouts and high-res source files without broken paths | Assets | Reliability | Pending |
| REQ-GIF-01 | Automatic Framerate Harmonic Selection: Enforce GIF89a 10ms integer clock rules to eliminate delay alternating/jitter (auto-select 50, 25, or 20 FPS based on video motion velocity and duration) | GIF Engine | Smoothness | Pending |
| REQ-GIF-02 | Sub-Composition & Layer Auto-Extension: Automatically extend nested precompositions and child layer durations to prevent cut-offs when comp duration changes | ExtendScript | Timing | Pending |
| REQ-GIF-03 | Seamless Loop Seam Preservation: Linear keyframe boundary alignment to ensure constant velocity from frame N-1 to frame 0 with zero freeze/pause | Keyframing | Looping | Pending |
| REQ-GIF-04 | High-Fidelity Differential Palette Optimization: Two-pass palette generation prioritizing moving vector assets and suppressing dither noise | Encoding | Quality | Pending |
| REQ-GIF-05 | Dual-Tier Output Generation: Output both a full-resolution Master GIF on Desktop and a lightweight Web-Optimized GIF (1024px, 128 colors) for lag-free browser playback | Output | Usability | Complete |
| REQ-GIF-06 | Automated Frame Timing Verification: Automated `ffprobe` audit ensuring 100% of frames have uniform, jitter-free packet duration | Verification | QA | Complete |
| REQ-MOT-01 | Reference Ingestion Pipeline: Ingest reference animation from local video/GIF or web URL (Behance, YouTube, Loom, Direct MP4/GIF) | Input | Ingestion | Complete |
| REQ-MOT-02 | Motion Profile Decomposition: Extract choreography profiles (stagger sequence, gravity fall, rotational wobble, impact overshoot bounce, and settle timing) | Motion Engine | Analysis | Complete |
| REQ-MOT-03 | Semantic Layer Classification & Mapping: Distinguish between hero cutouts, stickers/badges, polaroid cards, and text layers with customizable filters (`--elements-only`, `--no-text-anim`) | AE Engine | Mapping | Complete |
| REQ-MOT-04 | ExtendScript Physics & Keyframe Synthesis: Generate natural cubic bezier easing (`KeyframeEase`) and overshoot curves directly in After Effects with zero track-matte clipping | ExtendScript | Keyframes | Complete |
| REQ-MOT-05 | Duration & Temporal Scaling: Dynamically stretch, compress, and stagger animation timing to adapt reference choreography to any composition duration | Timing | Flexibility | Complete |
| REQ-MOT-06 | End-to-End Skill Packaging: Package as `ae-motion-clone` skill in `~/.gemini/config/skills/ae-motion-clone/` with CLI runner and live AE integration | Architecture | Deployment | Complete |
| REQ-IND-01 | Automated Document Comparison: Compare two `.indd` documents, identifying structural page layout shifts, parent/master spread assignments, and section offsets | InDesign | Structure | Complete |
| REQ-IND-02 | Deep Typography & Spacing Extraction: Extract font family, font weight/style, point size, auto vs fixed leading, tracking, paragraph alignment, and margins/gutters | InDesign | Typography | Complete |
| REQ-IND-03 | Table Hierarchy & Cell Inset Auditing: Audit InDesign `Table` objects across threaded stories, extracting row/column dimensions, column widths (pt & mm), row heights, header rows, and cell insets (padding) | InDesign | Tables | Complete |
| REQ-IND-04 | Object Hierarchy & Grouping Analysis: Detect grouped vs ungrouped UI elements (e.g. status legends), standalone shapes vs parent groups, and overset text flags (`overflows`) | InDesign | Geometry | Complete |
| REQ-IND-05 | Preflight Link & Swatch Delta Reporting: Detect broken/missing links (`LINK_MISSING`) vs active paths, missing font alerts (`NOT_AVAILABLE`), and color palette/swatch deltas (spot/Pantone vs CMYK/RGB) | InDesign | Preflight | Complete |
| REQ-IND-06 | End-to-End Skill Packaging: Package as `indesign-doc-diff` in `~/.gemini/config/skills/indesign-doc-diff/` with modular ExtendScript runners and CLI options (`--compare`, `--inspect-typo`, `--exclude-content`, `--json`) | Architecture | Deployment | Complete |
| REQ-XLSX-01 | Excel Matrix Ingestion Pipeline: Parse multi-sheet feature matrices, rating codes (3/2/1/x/blank), dynamic company columns, and row footnotes using `openpyxl` | Excel Engine | Ingestion | Complete |
| REQ-XLSX-02 | Headless InDesign Inspection & Mapping: Extract table geometry, row mappings, and graphic item fill swatches from threaded stories via ExtendScript | InDesign Engine | Inspection | Complete |
| REQ-XLSX-03 | Human-in-the-Loop Pre-Execution Gate: Enforce mandatory structured change overview and user approval before mutating documents on disk | Protocol | Approval Gate | Complete |
| REQ-XLSX-04 | Chunked Batch Generation Engine: Spawn documents from master template, replace company placeholders, update cell dot swatches, and sync InDesign background tasks | InDesign Engine | Batch Generator | Complete |
| REQ-XLSX-05 | 100% Bi-Directional Dot Matrix QA Auditor: Cross-verify all generated InDesign cell swatch fills against Excel ground truth with zero tolerated mismatches | QA Engine | Dot Audit | Complete |
| REQ-XLSX-06 | Synchronous PDF Export & Overset Protection: Export high-resolution print PDFs, verify file size/integrity, and detect text frame overflows | PDF Engine | Export | Complete |
| REQ-XLSX-07 | End-to-End Skill Packaging: Package as `klm-aggrea-xlsx-to-indesign` in `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/` (KLM Aggrea XLSX to InDesign) with `SKILL.md` and CLI runner | Architecture | Packaging | Complete |
| REQ-BATCH-01 | Headless InDesign Document Opening: Open documents via `app.open(file, false)` to suppress window rendering and achieve 3x–5x accelerated batch export | Performance | InDesign Core | Complete |
| REQ-BATCH-02 | Automated Preflight Health Auditing: Detect missing links, missing/uninstalled fonts, and overset text stories with a consolidated `Batch_Export_Report.txt` | Preflight | QA Engine | Complete |
| REQ-BATCH-03 | Settings Persistence across Sessions: Store and retrieve folders, formats, presets, and flags across InDesign restarts via `insertLabel` and `extractLabel` | User Experience | Persistence | Complete |
| REQ-BATCH-04 | Simultaneous Companion IDML Generation: Generate `.idml` archive files in the same pass alongside primary PDF/graphic deliverables | Archival | Multi-Format | Complete |
| REQ-BATCH-05 | Single-Page Zero-Padded PDF Imposition: Split multi-page publications into zero-padded single-page PDFs (`_p001.pdf`, `_p002.pdf`) for premedia imposition | Premedia | Imposition | Complete |
| REQ-BATCH-06 | Memory Safety & Lock Protection: Filter active lock files (`~*.idlk`) and invoke periodic garbage collection (`$.gc()`) every 5 documents | Reliability | Memory Mgmt | Complete |
| REQ-BATCH-07 | End-to-End Skill Packaging: Package as `indesign-batch-export` in `~/.gemini/config/skills/indesign-batch-export/` with autonomous CLI runner and documentation | Architecture | Deployment | Complete |

