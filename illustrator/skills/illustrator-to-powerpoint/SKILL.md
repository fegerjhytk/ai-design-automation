---
name: illustrator-to-powerpoint
description: >-
  Extracts Adobe Illustrator (.ai) artwork, rebuilds it as native, fully editable Microsoft PowerPoint (.pptx) objects (semantic text boxes, shapes, pictures, crops, and styles), and validates every slide against original artboard renders. Use whenever converting Illustrator designs, vector decks, or graphics into editable PowerPoint presentations.
triggers:
  - "illustrator to powerpoint"
  - "ai to ppt"
  - "convert illustrator to powerpoint"
  - "illustrator to ppt"
  - "convert ai to pptx"
  - "rebuild illustrator in powerpoint"
  - "native powerpoint from illustrator"
---

# Illustrator to Native PowerPoint Conversion Skill

> [!IMPORTANT]
> **MANDATORY POLICY — DELIVERABLE PLACEMENT & ZERO CACHE LEAK**:
> 1. **Deliverable Placement**: By default, ALWAYS place the final `.pptx` presentation directly **beside the source Illustrator (`.ai`) file** (in the exact same folder using the matching base name `<filename>.pptx`), unless the user explicitly specifies another destination.
> 2. **Complete Cache Purge**: Immediately upon conversion and verification completion, **DELETE ALL CACHES AND TEMPORARY FILES** (`Conversion/`, `Working/`, `Reference-renders/`, `PowerPoint-renders/`, `Exports/`, diff heatmaps, and temp files). Only deliver the clean `.pptx` presentation to the user. Never leave intermediate conversion folders or render artifacts on disk.

## Core Philosophy

The reusable method is to extract the Illustrator artwork, rebuild it as **native PowerPoint objects**, and compare the rendered result against the original.

It requires far more than importing an image or an SVG file:
- Importing an SVG or flattened image may preserve appearance, but it completely fails to deliver the editing experience expected of Microsoft PowerPoint text, shapes, and pictures.
- Outlined letters are merely vector paths; their wording cannot be edited as text.
- An SVG inserted as a picture is not native editable text and shapes.
- Grouping separate single-line text frames does not constitute an editable paragraph.

The procedure below is a rigorous, 18-step engineering workflow applicable to any Illustrator file. Because some Illustrator effects have no direct PowerPoint equivalent, **full editability and an exact visual match must be systematically verified for each file**.

---

## Technical Architecture & References

- [Object Mapping Matrix](./references/object-mapping-matrix.md) — Detailed mapping of live text, vector shapes, clipping masks, effects, and compromises.
- [Coordinate Mapping Reference](./references/coordinate-mapping.md) — Mathematical transformation from Illustrator canvas space to PowerPoint slide coordinates.
- [Text Reconstruction Rules](./references/text-reconstruction-rules.md) — Semantic paragraph clustering, multi-style runs, and baseline calibration.
- [Verification & QA Checklist](./references/verification-checklist.md) — Visual diff analysis, editability tests, defect diagnosis, and delivery reporting.

### Automation Scripts

- Turnkey Pipeline Runner: [scripts/convert_pipeline.py](./scripts/convert_pipeline.py)
- ExtendScript Document Audit: [scripts/audit_illustrator_doc.jsx](./scripts/audit_illustrator_doc.jsx)
- ExtendScript Reference Exporter: [scripts/export_artboard_references.jsx](./scripts/export_artboard_references.jsx)
- ExtendScript Artwork Manifest Extractor: [scripts/extract_artwork_manifest.jsx](./scripts/extract_artwork_manifest.jsx)
- Python Native PPTX Builder: [scripts/build_native_pptx.py](./scripts/build_native_pptx.py)
- Python Visual Diff Comparator: [scripts/compare_renders.py](./scripts/compare_renders.py)

---

## The 18-Step Conversion Workflow

### Step 1: Define What the Finished PowerPoint Must Preserve

Before touching any assets, establish the non-negotiable target requirements:

| Area | Required Result |
| :--- | :--- |
| **Artboards** | One slide per artboard, in the exact same sequence. |
| **Layout** | Original placement, size, spacing, margins, and alignment. |
| **Text** | Editable text, with each related paragraph or heading in **one single text box**. |
| **Shapes** | Native editable PowerPoint shapes or freeform paths wherever possible. |
| **Photos** | Separate, replaceable pictures maintaining original aspect ratio with correct crop offsets. |
| **Typography** | Original font family, weight, size, tracking, and natural line wrapping. |
| **Effects** | Original appearance, with any editing limitations and compromises disclosed. |
| **Slide Edges** | Artwork strictly cropped to the artboard boundaries (clean pasteboard). |
| **Source** | Original Illustrator master file left completely untouched. |
| **Validation** | Every single slide rendered and compared against its source artboard reference. |

#### Defining "Editable" with Precision:
1. **Paragraphs**: A paragraph must be editable by placing the cursor inside one text box; typing or deleting characters must reflow all lines naturally.
2. **Photographs**: A photograph must be replaceable via PowerPoint's native *Change Picture* command independently of surrounding design elements.
3. **Decorative Shapes**: Must allow native fill, stroke, or geometry modifications in the PowerPoint ribbon.
4. **Prohibited Shortcuts**: An SVG inserted as a picture or rasterized slide backgrounds must never be described as editable content.

---

### Step 2: Preserve the Illustrator Source

Always work from an isolated working copy or export directly from the active session without overwriting the master file:

1. **Check for Unsaved Changes**: Verify whether the open Illustrator document has unsaved edits (`doc.saved === false`). A file saved on disk may differ from what the user sees in the active window.
2. **Create Standard Working Directory Structure**:
   ```text
   Conversion/
   ├── Source/                  # Duplicate of master .ai and linked assets
   ├── Exports/                 # Intermediate SVG, PDF, or vector extractions
   ├── Reference-renders/       # Baseline PNG renders of each artboard (artboard-001.png...)
   ├── Working/                 # Manifests (audit_report.json, extracted_artwork.json)
   ├── PowerPoint-renders/      # Exported slide PNGs from PowerPoint for visual QA
   └── Final/                   # Final deliverable .pptx presentation
   ```
3. **Isolate Dependencies**: Keep linked high-resolution images accessible in `Source/Links/`. Never resample or degrade original imagery when raw files exist.

---

### Step 3: Audit the Document Before Converting It

Inspect the entire document upfront rather than making assumptions based on the first artboard:

1. Run the document audit ExtendScript:
   ```bash
   osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "/Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/audit_illustrator_doc.jsx")'
   ```
2. **Audit Checklist**:
   - Total artboard count, order, pixel/point dimensions, and aspect ratios.
   - Font families, styles, weights, and availability on the operating system.
   - Live text frames vs. outlined text paths.
   - Embedded vs. linked raster images.
   - Groups, clipping masks, and compound paths with cutouts/holes.
   - Gradients (linear, radial, freeform), opacity levels, and blend modes.
   - Shadows, blurs, grunge overlays, and textures.
   - Rotated, mirrored, or skewed objects.
   - Stray artwork extending beyond artboard bounds.
   - Hidden layers or guide layers that must not be exported.
3. **Construct Object Mapping Plan**: Refer to [references/object-mapping-matrix.md](./references/object-mapping-matrix.md) to flag difficult slides early.

---

### Step 4: Create a Visual Reference for Every Artboard

Export a pixel-accurate reference render of every artboard from Illustrator:

1. Execute the reference exporter script:
   ```bash
   osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "/Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/export_artboard_references.jsx")'
   ```
2. **Reference Invariants**:
   - `artBoardClipping = true`: Strict clipping to artboard boundaries; no pasteboard bleed.
   - Consistent resolution across all artboards (150 or 300 PPI).
   - Sequential zero-padded file naming: `artboard-001.png`, `artboard-002.png`, etc.
   - Maintain an explicit `artboard_manifest.json` mapping artboard names and indices to slide numbers. Never guess slide sequence from filesystem sorting.

---

### Step 5: Extract Structured Artwork and Original Assets

Extract vectors, typography, and image assets using structured data inspection:

1. Run the artwork extraction script:
   ```bash
   osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "/Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/extract_artwork_manifest.jsx")'
   ```
2. **Inspect for Extraction Traps**:
   - **Text Splitting**: Check if multi-line paragraphs were decomposed into individual lines or point-text runs.
   - **Font Renaming**: Ensure PostScript names match system family names.
   - **Nested Transforms**: Check that parent group transforms are not applied both to the group container and again to its children.
   - **Compound Path Holes**: Check fill rules (non-zero vs. even-odd) so hollow shapes (donuts, stars, letter cutouts) do not render as solid fills.
   - **Retain Original Bitmaps**: Never re-compress an already compressed JPEG; use original linked raster assets directly.

---

### Step 6: Map Artboard Coordinates to Slide Coordinates

Illustrator coordinates exist on a global canvas plane; PowerPoint slides operate on a top-left origin \((0, 0)\).

#### Transformation Equations
For an artboard with top-left origin \((x_a, y_a)\), width \(W_a\), and height \(H_a\):
\[
s_x = \frac{W_p}{W_a}, \quad s_y = \frac{H_p}{H_a}
\]
When slide dimensions match artboard points (\(W_p = W_a, H_p = H_a\)), \(s_x = s_y = 1.0\).

For any object coordinate \((x_i, y_i)\) relative to global canvas:
\[
x_p = (x_i - x_a) \cdot s_x
\]
\[
y_p = (y_a - y_i) \cdot s_y \quad \text{(accounting for Illustrator top-down vertical ruler)}
\]

#### Transform Details:
- **Rotations**: PowerPoint rotates around the object center \((x_c, y_c)\). Compute the center point in Illustrator and position the PowerPoint shape so its center aligns before setting `shape.rotation`.
- **Negative Scale / Mirroring**: Use PowerPoint `flip_horizontal` and `flip_vertical`.
- **Mixed Artboard Dimensions**: If artboards have different aspect ratios, either partition into multiple decks (e.g. `16x9.pptx` and `9x16.pptx`) or center-letterbox with a uniform presentation size. See [references/coordinate-mapping.md](./references/coordinate-mapping.md).

---

### Step 7: Rebuild Text as Semantic Text Blocks

Rebuilding text into cohesive semantic boxes is the most critical requirement for true editability:

1. **Cluster Paragraph Fragments**:
   - Use column alignment, line spacing (leading), and grammatical flow to unify split lines into one coherent paragraph.
   - **Negative Filter**: Never merge a headline with body text, or combine independent grid items/captions into one box.
2. **Preserve Multi-Style Runs Inside One Box**:
   - A single text box can contain multiple styled runs (bold keywords, accent colors, italic terms, varying font sizes).
   - Paragraph properties (alignment, line spacing, space after) are assigned at the paragraph level; character formatting is assigned to individual runs.
3. **Zero Out Default Text Box Margins**:
   - Set `margin_left = 0`, `margin_right = 0`, `margin_top = 0`, `margin_bottom = 0` to eliminate Office's default padding and match Illustrator's boundary metrics.
4. **Calibrate Baseline Position**:
   - Because PowerPoint and Illustrator anchor vertical text metrics differently, compare initial renders and apply a measured offset \(\Delta y_{\text{baseline}}\) (typically 1.5–3 pt) to ensure vertical alignment.
   - Read [references/text-reconstruction-rules.md](./references/text-reconstruction-rules.md).

---

### Step 8: Resolve Fonts Before Adjusting the Whole Layout

A substituted font distorts character widths, line wrapping, line count, and baseline positioning:

1. Verify exact font families and styles installed on the system.
2. If PowerPoint cannot find a font:
   - Check if a static face is required (e.g., `Inter SemiBold` instead of variable `Inter`).
   - Embed fonts in the `.pptx` where permitted.
   - If a substitute must be used, select the closest metric-compatible family and **disclose the substitution**.
3. **Strict Prohibition**: NEVER compensate for font substitution by rewriting copy, deleting words, drastically shrinking font sizes, or stretching text boxes until they roughly fit.

---

### Step 9: Recreate Shapes and Compound Paths

Preserve geometric integrity across all vector artwork:

1. **Native Geometric Primitives**: Map rectangles, rounded rectangles with corner radii, circles, and polygons to native PowerPoint shapes.
2. **Freeform Paths**: Recreate custom vector contours using `Slide.shapes.build_freeform`.
3. **Compound Paths & Holes**: Pay special attention to compound shapes (e.g., icons with cutouts, rings, stars). Ensure the fill rule does not invert holes into solid fills.
4. **Strokes & Borders**: Replicate stroke weight (`Pt(w)`), color (RGB), and dash style (`MSO_DASH`).

---

### Step 10: Preserve Photo Proportions and Clipping

Treat image geometry and clipping boundaries as two independent properties:

1. **Never Stretch Photos to Fit a Mask**: A portrait inside a narrow clipping rectangle must maintain its intrinsic aspect ratio. Stretching the image distorts facial proportions.
2. **Use PowerPoint Picture Crop Offsets**:
   - Insert the picture at its full proportional scale.
   - Calculate and apply PowerPoint crop offsets (`crop_left`, `crop_right`, `crop_top`, `crop_bottom`) to match the visible window of the Illustrator clipping mask.
3. **Rotated Pictures**: Verify crop boundaries both before and after applying rotation.

---

### Step 11: Preserve Textures, Grunge, and Effects

Reproduce atmospheric textures and lighting effects faithfully:

1. **Native Effects First**: Use native PowerPoint drop shadows, soft edges, and shape transparency (`1.0 - alpha`) wherever they visually match.
2. **Disclosed Effect Compromises**:
   - For complex blending modes (Multiply, Screen, Overlay) or grunge textures, export the isolated texture/grunge asset as a standalone 300 PPI PNG plate.
   - Place the texture plate at its exact z-order layer underneath live native text.
   - **Never flatten the whole slide**: Foreground text and shapes must remain 100% native and editable.

---

### Step 12: Crop Artwork to the Artboard Boundaries

Objects extending beyond the artboard boundaries remain visible and selectable in PowerPoint's editing view:

1. **Remove Extraneous Objects**: Discard objects entirely outside the artboard.
2. **Trim Boundary Spills**: Intersect vector shapes with the slide bounding rectangle where practical, or crop pictures crossing the slide border.
3. **Clean Presentation**: Ensure no stray guide boxes or stray vector points clutter the pasteboard in PowerPoint.

---

### Step 13: Test a Difficult Slide Before Converting Everything

Perform a canary test on the single most complex slide in the deck:

1. Select a slide featuring:
   - A distinctive headline and multi-line body paragraph.
   - A masked or rotated photograph.
   - Compound paths or complex icons.
   - Background transparency or textures.
   - Artwork crossing the slide border.
2. Run the full pipeline for this slide, open the resulting `.pptx` in PowerPoint, and inspect:
   - Does it open without warnings?
   - Do fonts render without substitution?
   - Is text editable as a single paragraph?
   - Are photos replaceable with accurate crops?
   - Are slide edges clean?
3. Fix any conversion discrepancies in the script before processing the remaining slides.

---

### Step 14: Build the Complete Presentation

Run the complete assembly pipeline across all artboards:

```bash
/Users/admin/.local/bin/uv run --with python-pptx --with pillow python3 \
    /Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/build_native_pptx.py \
    --manifest ~/Desktop/Conversion/Working/extracted_artwork.json \
    --out ~/Desktop/Conversion/Final/presentation.pptx
```

- Build slides in exact artboard sequence.
- Apply coordinate transforms consistently.
- Rebuild unified semantic text boxes with styled runs.
- Add native shapes, freeform paths, and cropped pictures.
- Enforce correct layer stacking (z-order).
- Save working master `.pptx`.

---

### Step 15: Compare Every Slide Visually

Export PowerPoint slide renders at identical pixel dimensions and run the visual comparison suite:

```bash
/Users/admin/.local/bin/uv run --with pillow python3 \
    /Users/admin/.gemini/config/skills/illustrator-to-powerpoint/scripts/compare_renders.py \
    --ref-dir ~/Desktop/Conversion/Reference-renders \
    --ppt-dir ~/Desktop/Conversion/PowerPoint-renders \
    --out-dir ~/Desktop/Conversion/Working/diffs
```

1. **Side-by-Side Review**: Overall layout balance and composition.
2. **50/50 Overlay**: Detect subtle baseline shifts or element drift.
3. **Difference Heatmap**: Identify missing elements, color shifts, or stroke clipping.
4. **Close-Up Zoom (400%)**: Inspect typography kerning, photo crops, and vector details.

---

### Step 16: Verify Actual Editability

Visual matching is only half the requirement. True editability must be verified:

1. **Paragraph Test**: Click inside a paragraph, type new text, and verify lines reflow automatically within the single text box.
2. **Heading Test**: Verify headings are single text blocks; accents are styled runs.
3. **Picture Test**: Right-click photographs and confirm *Change Picture* is available and functional.
4. **Shape Test**: Verify cards, buttons, and backgrounds are native shapes with editable fills/strokes.
5. **No Flattening**: Verify the slide is not a flattened image disguised as a presentation.

---

### Step 17: Correct Defects and Repeat the Checks

Iteratively resolve any defects identified during visual and editability verification:
- **Heading wraps unexpectedly**: Adjust text box width by 2–4 pt or check font metrics.
- **Text sits too low**: Adjust text box `top` coordinate upward by measured offset.
- **Photo distorted**: Re-calculate image aspect ratio and re-apply crop bounds.
- **Compound path solid instead of hollow**: Check path winding order and fill rule.
- Repeat the canary and comparison check until all slides pass.

---

### Step 18: Deliver with an Accurate Statement of Completion

Deliver the completed `.pptx` presentation accompanied by an honest, structured completion report:
- State exact artboard count and slide order match.
- Confirm 100% of paragraphs rebuilt as single semantic text boxes.
- List all fonts used, confirming whether embedded or system-resolved.
- Provide visual comparison metrics and diff reports.
- Disclose any specific effect compromises (e.g. background textures pre-rendered as raster plates).

---

### Step 19: Cache Cleanup & Deliverable Placement

1. **Deliverable Placement**:
   - By default, place the final `.pptx` presentation directly **beside the source Illustrator (`.ai`) file** (using matching base name `<name>.pptx`), or at the specific destination path/folder requested by the user.
2. **Purge Intermediate Caches**:
   - Once conversion and QA are complete, immediately run:
     ```bash
     rm -rf ~/Desktop/Conversion /tmp/presentation.pptx* /tmp/ai_conversion_*
     ```
   - Delete all temporary directories and cache files (`Working/`, `Reference-renders/`, `PowerPoint-renders/`, `Exports/`, diff heatmaps, and intermediate manifests).
   - Only the finalized `.pptx` presentation file must remain. No clutter or caches on Desktop or filesystem.
