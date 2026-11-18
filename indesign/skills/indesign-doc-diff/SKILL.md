---
name: indesign-doc-diff
description: "Deep document comparison, typography extraction, table auditing, and preflight inspection for Adobe InDesign (.indd) files. Audits structural layout shifts, parent/master spreads, table geometries, cell insets, legend groupings, missing fonts, broken links, and swatches."
version: 1.0.0
triggers:
  - "compare indesign"
  - "indesign diff"
  - "difference between indesign files"
  - "indesign typography"
  - "indesign font weight spacing"
  - "audit indesign"
  - "check indesign template"
  - "indesign table audit"
---

# InDesign Document Diff & Typography Inspector (`indesign-doc-diff`)

A comprehensive, production-grade audit and visual comparison tool for **Adobe InDesign (`.indd`)** documents. It automates deep document inspection across typography hierarchies, multi-page threaded table architectures, parent spread assignments, object groupings, broken links, and palette variations.

---

## 1. When to Use This Skill
Activate this skill whenever:
1. **Comparing two `.indd` documents**: e.g., Template vs. Client Customized Edition, Version A vs. Version B, or Pre-production vs. Final.
2. **Ignoring copy or dot colors**: Use `--exclude-content` and `--exclude-dots-color` when the user asks: *"tell me the difference; do not include content and dots colour"*.
3. **Auditing typography & spacing**: When the user asks: *"for this tell its font, font weight, spacing etc."*, generating a complete design token hierarchy.
4. **Inspecting InDesign Tables**: Measuring multi-page threaded tables, row/column counts, column widths in points and mm, row heights, and cell insets (padding).
5. **Detecting layout shifts**: Tracking how extra table rows on interior pages shift all subsequent sections and back covers by +1 or more pages.
6. **Preflight checks**: Detecting broken image links (`LINK_MISSING`) and missing font substitutions (`NOT_AVAILABLE` PostScript OpenType vs TrueType).

---

## 2. Quick Reference CLI

All operations run via the CLI script:
`~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js`

```bash
# 1. Compare two InDesign documents (Full Report)
node ~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js \
  --compare "File_A.indd" "File_B.indd"

# 2. Compare excluding text copy changes and status dot colors
node ~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js \
  --compare "File_A.indd" "File_B.indd" --exclude-content --exclude-dots-color

# 3. Extract complete typography hierarchy, weights, leading, and table insets
node ~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js \
  --inspect-typo "File.indd"

# 4. Output raw JSON report for downstream automation scripts
node ~/.gemini/config/skills/indesign-doc-diff/scripts/indesign-doc-diff.js \
  --compare "File_A.indd" "File_B.indd" --json
```

---

## 3. Core Audit Capabilities

### A. Document Geometry & Page Shifts
* Detects total page count differences (e.g. 9 pages vs 8 pages).
* Maps per-page Parent/Master spreads (`A-Parent`, `B-Parent`, `None`).
* Identifies section offsets (e.g., when an extra table page shifts subsequent editorial sections and back cover by +1 page).
* Checks document dimensions, column count, column gutters (12 pt default), and bleeds.

### B. Typography & Spacing Hierarchy
* Extracts exact font families (e.g. `Montserrat`, `Minion Pro`) and styles (`Bold`, `SemiBold`, `Medium`, `Regular`, `Light`).
* Differentiates between **Auto leading (%)** and **fixed pt leading**.
* Captures tracking values, text frame inset padding, and paragraph alignments.
* Maps document title, subtitle, section headings, table headers, table body, legend labels, and legal footnotes.

### C. Table Geometry & Cell Insets
* Audits threaded `Table` objects across frames and pages.
* Extracts column widths (points and millimeters) and row heights.
* Inspects cell insets (padding) on all 4 borders (`topInset`, `bottomInset`, `leftInset`, `rightInset`).
* Detects category divider rows (colored banner rows with micro-headers).

### D. Object Grouping & Hierarchy
* Identifies grouped UI components (e.g., status legends grouped as 6 elements) versus loose/ungrouped standalone shapes (`Oval` + `TextFrame`).
* Flags overset text frames (`overflows: true`) across all stories.

### E. Preflight Links & Palette Swatches
* Identifies broken external file paths (`LINK_MISSING` vs `NORMAL`).
* Flags uninstalled font references (`NOT_AVAILABLE` PostScript OTF vs TTF).
* Audits color swatches palette, flagging unused Pantone spot swatches and legacy RGB colors.

---

## 4. Reference Case Study

For a full reference analysis of the Air France / KLM NDC Aggregator publication audit (`EN_NDC_Aggregator_Aaron Group.indd` vs `EN_NDC_Aggregator_template-NOV26.indd`), refer to:
[`~/.gemini/config/skills/indesign-doc-diff/references/ndc_case_study.md`](file:///Users/admin/.gemini/config/skills/indesign-doc-diff/references/ndc_case_study.md)
