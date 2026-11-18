---
name: indesign-batch-export
description: Automated high-performance Adobe InDesign batch export workflow. Preflights missing links, missing fonts, and overset text, opens documents headlessly for 3x-5x speedup, exports to Print PDF, IDML, JPG, PNG, and Interactive PDF, supports single-page PDF splitting, and runs via UI dialog or headless CLI.
---

# InDesign Batch Export (`indesign-batch-export`)

A high-performance batch processing and preflight automation skill for Adobe InDesign CC. Converts entire directories or subtrees of `.indd` documents into production deliverables (Print PDF, Web PDF, IDML archives, JPG, PNG, ICML) with automated preflight auditing, lock file protection, and background headless execution.

---

## Key Capabilities

1. **Headless Speed Boost (3x–5x Faster)**:
   Opens documents in memory via `doc = app.open(file, false)`, bypassing UI window rendering and screen redraws.
2. **Automated Preflight Auditing**:
   Scans every document for:
   - Missing links (`LinkStatus.LINK_MISSING`)
   - Missing or substituted fonts (`FontStatus.INSTALLED`)
   - Overset text frames (`doc.stories[i].overflows`)
   Outputs a detailed `Batch_Export_Report.txt` in the destination folder.
3. **Multi-Format & Companion IDML Generation**:
   Generates companion `.idml` archive files in the same pass without needing to re-open documents.
4. **Single-Page PDF Splitting**:
   Splits multi-page publications into zero-padded single-page PDFs (e.g. `Brochure_p001.pdf`, `Brochure_p002.pdf`).
5. **Settings Persistence**:
   Remembers last-used input/output directories, presets, resolutions, and options across sessions using InDesign's persistent `app.insertLabel` / `app.extractLabel`.
6. **Dual Mode Execution**:
   - **Interactive UI**: Run inside InDesign via `Scripts > Batch Export.jsx` with full ScriptUI panel controls.
   - **Autonomous Headless CLI**: Run directly from the terminal or an Antigravity agent without UI modals.

---

## CLI Usage (Headless Automation)

Run the autonomous runner script directly:

```bash
node /Users/admin/.gemini/config/skills/indesign-batch-export/scripts/indesign_batch_export.js [options]
```

### Options:
| Flag | Description | Default |
| :--- | :--- | :--- |
| `-i, --input <dir>` | Directory containing `.indd` files | *(Required)* |
| `-o, --output <dir>` | Destination directory for exported files | `<input>/Exports` |
| `-f, --format <format>` | `PDF (print)`, `IDML`, `JPG`, `PNG`, `PDF (interactive)`, `ICML` | `PDF (print)` |
| `-p, --preset <name>` | PDF Export Preset name (e.g., `[High Quality Print]`, `[Press Quality]`) | `[High Quality Print]` |
| `-s, --suffix <string>`| Suffix to append to exported file names | `""` |
| `--single-pages` | Split PDF into individual single-page files | `false` |
| `--also-idml` | Always export companion IDML archive alongside target format | `false` |
| `--no-subfolders` | Do not recurse into subdirectories | Recurse is `true` |

---

## Examples

### 1. Batch Export All Documents to Print PDF with Companion IDML
```bash
node /Users/admin/.gemini/config/skills/indesign-batch-export/scripts/indesign_batch_export.js \
  --input "/Users/admin/Projects/Catalog" \
  --output "/Users/admin/Projects/Catalog/Final_Print" \
  --format "PDF (print)" \
  --preset "[Press Quality]" \
  --also-idml
```

### 2. Export Individual Single-Page PDFs for Imposition / Proofing
```bash
node /Users/admin/.gemini/config/skills/indesign-batch-export/scripts/indesign_batch_export.js \
  --input "/Users/admin/Projects/Magazine" \
  --output "/Users/admin/Projects/Magazine/Single_Pages" \
  --format "PDF (print)" \
  --single-pages
```

### 3. Batch Convert Documents to Web Previews (JPG or PNG)
```bash
node /Users/admin/.gemini/config/skills/indesign-batch-export/scripts/indesign_batch_export.js \
  --input "/Users/admin/Projects/Assets" \
  --output "/Users/admin/Projects/Assets/Web_Previews" \
  --format "JPG"
```

---

## Interactive InDesign Setup

To install the interactive ScriptUI dialog in Adobe InDesign:
1. Locate your InDesign Scripts folder:
   - macOS: `~/Library/Preferences/Adobe InDesign/Version [Year]/en_US/Scripts/Scripts Panel/`
2. Copy [Batch Export.jsx](file:///Users/admin/Downloads/Batch%20Export.jsx) into that folder.
3. Open InDesign, navigate to `Window > Utilities > Scripts`, and double-click **Batch Export.jsx**.
