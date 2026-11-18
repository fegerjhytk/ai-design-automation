# Phase 06 Context: InDesign Document Diff & Typography Inspector Skill (`indesign-doc-diff`)

## Problem Statement
When designers, production teams, and agencies manage multi-page editorial publications, enterprise templates, and localized collateral in Adobe InDesign (`.indd`):
1. **Hidden Structural Layout Shifts:** Differences in page count, parent/master spreads, and threaded text frame distribution frequently go unnoticed between version iterations (e.g. 8-page master template vs. 9-page customized client publication).
2. **Typography Drift & Missing Specs:** Brand guidelines require precise typography hierarchies (e.g., Montserrat SemiBold 22 pt, Montserrat Medium 7 pt/11 pt leading, Montserrat Regular 7 pt/9 pt leading), but hand-edited documents suffer from ad-hoc leading overrides, irregular cell insets, and missing font warnings (`NOT_AVAILABLE` PostScript OTF vs. TTF substitutions).
3. **Table Structure Complexity:** InDesign documents frequently rely on multi-page threaded `Table` objects with varying row heights, category divider banners (e.g. 23-25 pt colored rows with 0.1 pt micro-headers), and column widths that must be verified across releases.
4. **Ungrouped & Broken Legend UI:** Key graphic groups (such as 3-dot status legends: `[Available / In progress / Unavailable]`) are often broken down or ungrouped into individual uncoordinated floating items across pages.
5. **Asset & Palette Pollution:** Unused Pantone spot colors, legacy RGB swatches, and broken external links (`LINK_MISSING` paths mapped to original creators' local disks) remain trapped in client files.
6. **No Automated InDesign Diff Tool:** Unlike code repositories with `git diff`, Adobe InDesign files are binary (`.indd`). Teams lack a single CLI tool to deep-inspect and compare two `.indd` documents or extract full typographic specifications.

## Solution Architecture
Build and deploy the `indesign-doc-diff` skill in `~/.gemini/config/skills/indesign-doc-diff/`:
- **ExtendScript Core Engine (`indesign_inspector.jsx`):** Executes headlessly or live via Adobe InDesign (`osascript` / `do script`), extracting complete document geometry, parent spreads, threaded stories, tables, cells, typography, swatches, and links as structured JSON.
- **Diff & Comparison CLI (`indesign-doc-diff.js`):** Node.js CLI tool that compares two InDesign JSON dumps or invokes InDesign live:
  - Compares Page Setup, Master Spread assignments, and section shifts.
  - Compares Table geometries (rows, columns, widths, row heights, category dividers).
  - Flags object hierarchy differences (grouped vs ungrouped legends, standalone floating frames).
  - Compares typography across frames and tables (font family, weight, point size, auto vs fixed leading, tracking, cell insets).
  - Preflights missing fonts and broken links.
  - Flags palette/swatch discrepancies.
  - Supports `--exclude-content` to focus purely on layout/structural and design differences without copy noise.
- **Typography Inspector Mode (`--inspect-typo`):** Generates a complete typographic hierarchy design token map for any single InDesign document.
