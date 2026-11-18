# Phase 02 Context: Design QC & Visual Difference Engine Skill

## Problem Statement
When designers, creative directors, and clients review modifications to complex Adobe Illustrator presentations, brand guidelines, and vector collateral, errors frequently slip through:
1. **Hex Label vs. Swatch Fills:** Designers paste hex codes from previous slides or other options, causing text labels (e.g. `#C7DCE9`) to mismatch actual vector fills (`#F1E5BE`).
2. **Conflicting Recommendations & Option Numbers:** Duplicate "Option 01" labels or multiple slides tagged "Recommended direction".
3. **Typography Inconsistency & Brief Violations:** Briefs requesting 1 headline font with 2 body options frequently end up with multiple conflicting headline fonts (e.g. Geller vs Augereau).
4. **Copy-Paste Residue:** Subtitles or body copy from earlier sections accidentally carried into new sections.
5. **No Visual Diffing in Design Reviews:** Reviewers are forced to read text descriptions of changes instead of seeing visual proof ("image mode" side-by-side or "marked mode" with red highlight boxes/pins around changed elements).

## Solution Architecture
Build the `design-qc-visual-diff` skill in `~/.gemini/config/skills/design-qc-visual-diff/`:
- **QC Auditor (ExtendScript + Python):** Scans active Illustrator documents for brand color deviations, label-vs-fill mismatches, typography brief adherence, overflow text, and copy-paste residue.
- **Image Mode Engine:** Automatically exports artboards Before vs. After and generates crisp side-by-side comparison images.
- **Marked Mode Engine:** Clusters modified pixels and elements into bounding boxes, draws vivid red outline frames and numbered callout pins on the After image, and emits an explanatory legend table.
- **In-Illustrator Marker Layer:** Creates a non-printing `[QC_DIFF_MARKERS]` layer directly in the `.ai` document with bounding boxes and badges that the designer can inspect on canvas.
- **Interactive HTML Visual Diff Dashboard:** Self-contained dashboard with image slider, side-by-side comparison, and toggleable marked overlays.
