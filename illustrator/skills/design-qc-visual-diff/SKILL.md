---
name: design-qc-visual-diff
description: "Comprehensive Quality Control (QC) & Visual Difference Comparison tool for Adobe Illustrator (.ai) and design presentations. Audits colors, swatches vs hex labels, typography brief compliance, typos, and copy-paste residue. Generates visual comparisons in side-by-side 'Image Mode', annotated 'Marked Mode' with red bounding boxes and numbered callout pins, on-canvas Illustrator marker layers, and interactive HTML split-screen slider dashboards."
version: 1.0.0
triggers:
  - "qc design"
  - "qc illustrator"
  - "visual diff"
  - "compare changes"
  - "comparison of changes"
  - "image mode comparison"
  - "marked comparison"
  - "design qc"
  - "brand audit"
  - "typography audit"
  - "check illustrator file"
---

# Design QC & Visual Difference Engine (`design-qc-visual-diff`)

A multi-tiered Quality Control (QC) and visual change-comparison engine for **Adobe Illustrator (`.ai`)**, vector documents, and presentation slide decks. It bridges the gap between raw text change logs and visual design verification.

---

## 1. Core Capabilities

### A. Automated Document Quality Control (QC)
* **Brand Color & Hex Accuracy:**
  * Compares every vector fill, stroke, and text color against defined master brand guidelines.
  * **Label-vs-Fill Mismatch Detection:** Identifies text frames stating a color code (e.g. `HEX #C7DCE9`) where the actual adjacent swatch fill or path is a different color (e.g. `#F1E5BE`).
  * Flags unauthorized hex tints, rogue colors, and inconsistent values (e.g. `#011E40` vs `#081D3E`).
* **Typography & Brief Compliance:**
  * Checks font family counts against brief constraints (e.g., enforces *exactly 1 headline font family* with up to *2 body font families*).
  * Validates weight hierarchies and casing across options (Bold, SemiBold, Italic, Regular).
  * Detects missing, unlicensed, or substituted fonts.
  * Detects text frame overflows (clipped/hidden copy).
* **Content Integrity & Copy-Paste Artifacts:**
  * Detects cross-section copy-paste errors (e.g. typography subtitles appearing on color summary slides).
  * Detects conflicting option labels (e.g. two slides both marked "Option 01").
  * Detects conflicting recommendation badges (multiple slides marked "Recommended direction").
  * Scans for common brand typos (*Dusky* vs *Dusty*, *Cateogary*, *Propert*).
* **Geometry & Technical Cleanliness:**
  * Identifies stray points, unpainted paths, empty text frames, and redundant clipping masks.

---

### B. Visual Comparison of Changes

#### 1. Image Mode (Side-by-Side Comparison)
* Renders high-resolution artboard previews for both **Before** (Original) and **After** (Modified) states.
* Assembles a pixel-perfect side-by-side composite:
  ```
  +--------------------------------+--------------------------------+
  |       BEFORE (Original)        |        AFTER (Modified)        |
  | [ Artboard Title & Slide Num ] | [ Artboard Title & Slide Num ] |
  +--------------------------------+--------------------------------+
  ```

#### 2. Marked Mode (Visual Bounding Boxes & Callout Pins)
* Computes pixel deltas and element geometry differences between versions.
* Clusters modified areas and draws:
  * **Vivid Red / Magenta Bounding Boxes** around every modified text line, swatch, or layout change.
  * **Numbered Badges `[1]`, `[2]`, `[3]`...** directly over modified zones.
  * Generates a 3-panel composite: `[ Before ] | [ After ] | [ Marked Changes with Callout Pins ]`.
  * Generates a markdown **Change Legend** detailing what changed at each pin.

#### 3. On-Canvas Illustrator Diff Marker Layer (`[QC_DIFF_MARKERS]`)
* Creates a temporary non-printing layer named `[QC_DIFF_MARKERS]` directly on the live Illustrator canvas.
* Draws translucent highlight boxes and numbered label pins on canvas so designers can inspect changes without leaving Adobe Illustrator.
* Automatically configured with `printable = false` so it never exports into client-facing PDFs.

#### 4. Interactive HTML Diff Dashboard
* Self-contained, zero-dependency HTML dashboard featuring:
  * **Reveal Slider:** Smooth interactive before/after curtain slider.
  * **Side-by-Side Grid:** Synchronized zoom and pan.
  * **Toggleable Marked Overlays:** Turn on/off red bounding boxes and pin markers.
  * **Audit Checklist:** Live view of all automated QC rule passes/flags.

---

## 2. CLI Usage & Commands

All scripts are located in `~/.gemini/config/skills/design-qc-visual-diff/scripts/`.

### Run Automated Document QC
```bash
# Audit active document in Adobe Illustrator
python3 ~/.gemini/config/skills/design-qc-visual-diff/scripts/qc_runner.py --active

# Audit specific .ai file with brand guide JSON
python3 ~/.gemini/config/skills/design-qc-visual-diff/scripts/qc_runner.py --file "/path/to/deck.ai" --brand-guide "/path/to/brand.json"
```

### Generate Visual Comparison (Image Mode)
```bash
# Compare two files in side-by-side image mode
uv run --with pillow python3 ~/.gemini/config/skills/design-qc-visual-diff/scripts/visual_diff_engine.py \
  --before "/path/to/file_v1.ai" \
  --after "/path/to/file_v2.ai" \
  --mode image \
  --artboards 1,5,8,10
```

### Generate Marked Comparison (Marked Diff Mode)
```bash
# Generate marked diffs with red bounding boxes and numbered pins
uv run --with pillow python3 ~/.gemini/config/skills/design-qc-visual-diff/scripts/visual_diff_engine.py \
  --before "/path/to/file_v1.ai" \
  --after "/path/to/file_v2.ai" \
  --mode marked \
  --output "/Users/admin/Downloads/QC_Visual_Diff"
```

### Draw Markers Live in Illustrator
```bash
# Injects [QC_DIFF_MARKERS] layer into the currently active Illustrator file
osascript -e '
tell application "Adobe Illustrator"
    set js to read POSIX file "/Users/admin/.gemini/config/skills/design-qc-visual-diff/scripts/mark_diff_in_illustrator.jsx"
    do javascript js
end tell
'
```

---

## 3. Standard Antigravity Agent Workflow

When a user asks to:
1. *"QC this file"*, *"Audit design"*, or *"Check for mistakes"*:
   - Run `qc_runner.py --active`.
   - Report findings categorized into **Critical Blocks**, **Inconsistencies**, and **Cleanliness Warnings**.
2. *"Show comparison of changes"*, *"Give me visual diff"*, or *"Marked comparison"*:
   - Export artboards Before vs. After using `export_artboards.jsx`.
   - Run `visual_diff_engine.py --mode marked`.
   - Provide clickable links to the generated composite images (`file:///...`) and embed the interactive HTML dashboard.
