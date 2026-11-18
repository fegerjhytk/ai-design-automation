---
name: klm-aggrea-xlsx-to-indesign
description: "KLM & Air France Aggregator XLSX to InDesign batch publishing and 100% bi-directional QA audit engine. Generates multi-company InDesign documents and print-ready PDFs from master Excel matrices with strict human-in-the-loop approval gates."
---

# KLM Aggrea XLSX to InDesign (`klm-aggrea-xlsx-to-indesign`)
### Also known as: KLM Aggregator XLSX to InDesign

A production-grade Antigravity skill for automating high-volume, multi-language publishing pipelines from KLM / Air France Excel feature matrices (`.xlsx`) to Adobe InDesign (`.indd`) documents and high-resolution print PDFs with a **100% bi-directional verification guarantee**.

---

## Architecture & Data Flow

```
[1. Excel Master (.xlsx)] ──────> [2. Python Parser] ──────> [batch_company_data.json]
                                                                     │
[Master Template (.indd)] ──────> [3. Headless Inspector]             │
                                           │                         │
                                           ▼                         ▼
                              [4. MANDATORY USER APPROVAL GATE] ◄────┘
                                           │ (Explicit Approval)
                                           ▼
                              [5. Chunked Batch Generator]
                                   • [aggregator] replacement
                                   • Rating dot color updates
                                   • Synchronous PDF export
                                           │
                                           ▼
                              [6. 100% Bi-Directional QA Audit]
                                   • Read InDesign cell fill swatches
                                   • Compare with Excel ground truth
                                   • 0 tolerated mismatches
```

---

## Mandatory Human-in-the-Loop Protocol

> [!IMPORTANT]
> **STRICT PRE-EXECUTION APPROVAL RULE**:
> Before creating or modifying any `.indd` document on disk, generating batches, or exporting PDFs, the agent **MUST** present the user with a structured overview table stating:
> 1. Target Excel source path and sheet name.
> 2. Master InDesign template path and detected table row counts.
> 3. Total companies detected and planned output file names.
> 4. Status dot mapping rules.
> 5. Any layout adjustments (e.g. custom row heights or overset protections).
> 
> **NEVER begin batch generation until the user explicitly responds with approval.**

---

## Rating Dot Swatch Standards

| Excel Code | Status Meaning | InDesign Swatch Name | Graphic Dot Visual |
|:---:|:---:|:---:|:---:|
| `3` | Available / Oui | `Green RGB` | 🟢 Green |
| `2` | Work in progress / En cours | `Orange RGB` | 🟠 Orange |
| `1`, `x`, blank | Unavailable / Non | `Grey RGB` | ⚪ Grey |

---

## Tooling & CLI Commands

All automation scripts are located in `~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/`.

### 1. Parse Excel Matrix
Extracts company names, feature row mappings, and rating dot colors:
```bash
python3 ~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/matrix_parser.py \
  --xlsx "/path/to/matrix.xlsx" \
  --sheet "Sheet1" \
  --out "batch_company_data.json"
```

### 2. Inspect InDesign Template Headlessly
Extracts table geometry, story threads, and baseline fill colors from the master `.indd`:
```bash
osascript -e 'tell application "Adobe InDesign 2026" to do script (POSIX file "/Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/inspect_template.jsx") language javascript'
```

### 3. Run Chunked Batch Generator
Processes companies in memory-safe chunks (10–12 per slice), replaces placeholders, updates rating dots, and exports PDFs synchronously:
```bash
osascript -e 'tell application "Adobe InDesign 2026" to do script (POSIX file "/Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/batch_generate.jsx") language javascript'
```

### 4. Run 100% Bi-Directional QA Audit
Re-opens every generated `.indd`, reads graphic dot item fill swatches from Table 0 Column 2, verifies 0 text overflows, and compares directly with `batch_company_data.json`:
```bash
osascript -e 'tell application "Adobe InDesign 2026" to do script (POSIX file "/Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/audit_dots.jsx") language javascript'
```

### 5. Unified CLI Orchestrator (`publish_matrix.sh`)
```bash
# Full workflow (includes prompt for user approval):
~/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/scripts/publish_matrix.sh all \
  --xlsx "/path/to/matrix.xlsx" \
  --indd "/path/to/template.indd" \
  --out-dir "/path/to/output_indd/" \
  --pdf-dir "/path/to/output_pdf/"
```

---

## Critical ExtendScript Rules & Invariants

1. **POSIX File Path Wrapper:**
   Always invoke JSX files via AppleScript using `POSIX file`:
   ```applescript
   tell application "Adobe InDesign 2026" to do script (POSIX file "/absolute/path.jsx") language javascript
   ```
2. **Synchronous PDF Background Task Drain:**
   Never close a document immediately after calling `doc.exportFile()`. InDesign exports PDFs in background worker threads:
   ```javascript
   doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, pdfPreset);
   while (app.backgroundTasks.length > 0) {
       $.sleep(250);
   }
   doc.close(SaveOptions.NO);
   ```
3. **Target Cell Dot Replacement:**
   To color a status dot in Table 0 cell `(r, 2)`:
   ```javascript
   var cell = tbl.rows[r].cells[2];
   if (cell.allPageItems.length > 0) {
       cell.allPageItems[0].fillColor = doc.swatches.itemByName(targetColorName);
   }
   ```
4. **Text Insertion / Duplication:**
   Never use `pageItem.duplicate(insertionPoint)`. Use text-level duplication:
   ```javascript
   sourceText.duplicate(LocationOptions.AT_BEGINNING, targetCell);
   ```

---

## Technical References & Blueprint Documentation

For deep technical details, refer to the documentation in `references/`:
- **[Architectural Blueprint](file:///Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/references/blueprint.md):** Complete specifications, dataflow, and design decisions for enterprise matrix publishing.
- **[ExtendScript ES3 Gotchas & Workarounds](file:///Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/references/indesign_es3_gotchas.md):** ECMAScript 3 limitations, background task drain loops, memory management (`$.gc()`), and lock-file safety.
- **[Typography Contracts & Layout Rules](file:///Users/admin/.gemini/config/skills/klm-aggrea-xlsx-to-indesign/references/typography_rules.md):** Exact font families (`Montserrat`), point sizes, leading rules, and table cell padding invariants.


