---
name: excel-doc-crosscheck
description: Extract cell text and modern threaded comments (threadedComment*.xml) from master Excel (.xlsx) files, cross-check table text and dot status colors against open working documents (Illustrator, InDesign, CSV, MD), enforce strict read-only preflight auditing, and apply verified corrections with a mandatory user approval gate.
---

# Excel Master Cross-Check & Threaded Comment Inspector (`excel-doc-crosscheck`)

A high-fidelity audit, extraction, and document cross-checking skill for complex enterprise tables, multi-lingual catalogs, and partner matrixes (e.g., Air France-KLM NDC aggregator overviews).

Solves the recurring problem where standard CSV exports and basic scripts discard **modern Excel threaded comments / cell notes** (`threadedComment*.xml`) and introduce silent translation drift, typos, and mismatched status dots into production documents.

---

## Key Capabilities

1. **Zero-Dependency Threaded Comment Extractor (`extract_threaded_comments.py`)**:
   - Parses `.xlsx` OpenXML packages directly via Python's standard library (`zipfile` and `xml.etree.ElementTree`).
   - Extracts cell text values, author names, and embedded threaded conversation notes (`xl/threadedComments/threadedComment*.xml`) with fallback to legacy comments (`xl/comments*.xml`).
   - Exports clean Markdown tables, structured JSON arrays, or UTF-8-BOM CSV files.

2. **Master Source-of-Truth Hierarchy**:
   - The master `.xlsx` workbook is the absolute reference authority for all text labels, translations, and notes.
   - **Color Dot Logic:** Color status points/dots are identical between language editions. The master / English edition dot settings serve as the immutable benchmark.

3. **Autonomous Cross-Checking Comparator (`crosscheck_document.py`)**:
   - Compares live open documents (Adobe Illustrator CC artboards, InDesign text frames, Markdown, or CSV) against the master Excel sheet.
   - Accurately detects:
     - Exact matches (`✅ PASS`)
     - Wording drift, typos, and formatting alterations (`⚠️ FLAG / MISMATCH`)
     - Missing entries in the target document
     - Incorrect or misaligned status dot colors

4. **Strict Multi-Stage Approval Gate Protocol**:
   - **Stage 1 (Read-Only Inspection):** Ingest and cross-check without touching or altering the open document.
   - **Stage 2 (Discrepancy Reporting):** Present a side-by-side table of all detected differences (`Old Value ➔ Master Reference Value`).
   - **Stage 3 (User Approval Gate):** STOP execution and explicitly ask the user for confirmation.
   - **Stage 4 (Safe Mutation):** Apply approved updates to the open document only after receiving explicit user confirmation (`--approved`).

---

## CLI Reference

### 1. Extract Cell Values & Threaded Comments to Markdown/CSV/JSON
```bash
python3 ~/.gemini/config/skills/excel-doc-crosscheck/scripts/extract_threaded_comments.py \
  --file "/path/to/master.xlsx" \
  --sheet 1 \
  --col B \
  --start 10 \
  --end 120 \
  --format markdown
```

**Options:**
- `-f, --file <path>`: Path to master `.xlsx` spreadsheet (*required*)
- `-s, --sheet <name|idx>`: Sheet name or index (default: `1`)
- `-c, --col <letter>`: Target column letter to extract (default: `B`)
- `--header-col <letter>`: Associated feature header column (default: `A`)
- `--start <num>`, `--end <num>`: Row range to extract (default: `10` to `120`)
- `--format <markdown|json|csv>`: Output format (default: `markdown`)
- `-o, --output <path>`: Write directly to destination file (e.g. `report.csv`)

### 2. Cross-Check Target Document against Master Excel
```bash
python3 ~/.gemini/config/skills/excel-doc-crosscheck/scripts/crosscheck_document.py \
  --master "/path/to/master.xlsx" \
  --target "/path/to/working_doc.csv" \
  --sheet 1 \
  --col B
```

### 3. Apply Verified Corrections (Strictly Gated)
```bash
python3 ~/.gemini/config/skills/excel-doc-crosscheck/scripts/crosscheck_document.py \
  --master "/path/to/master.xlsx" \
  --target "/path/to/working_doc.csv" \
  --apply \
  --approved
```
*(Fails immediately if `--approved` is omitted).*

---

## Ready-to-Use Antigravity Chat Prompts

### Prompt A: Cross-Check Open File Against Master Excel
```text
Please perform a strict cross-check between my currently open file and my master Excel file.

Master Reference: /path/to/master.xlsx
Target: Active Open Document

Rules:
1. READ-ONLY: Do not edit or touch the open file initially.
2. SCOPE: Match text inside table and color dots against the master Excel reference.
3. COLOR DOTS: Color points are identical between language versions; use English master dot colors as the benchmark.
4. REPORT: Output all discrepancies, typos, and missing lines in a table.
5. APPROVAL GATE: Wait for my explicit approval before making any changes.
```

### Prompt B: Extract All Threaded Comments from Specific Columns
```text
Extract all text and attached threaded comments from Column B (French translations) of sheet 1 in my Excel file:
File: /path/to/master.xlsx
Output the result in a clean Markdown table showing:
[Cell | FR Translation | Comment / Note]
```
