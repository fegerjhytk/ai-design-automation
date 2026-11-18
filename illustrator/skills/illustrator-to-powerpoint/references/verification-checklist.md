# Visual Verification and Editability Quality Assurance

Converting from Adobe Illustrator to Microsoft PowerPoint requires verifying two independent criteria:
1. **Visual Fidelity**: Does each slide accurately mirror the design, typography, colors, and layout of the original Illustrator artboard?
2. **True Editability**: Can a user interact with, retype, restyle, and replace slide elements in PowerPoint as native objects?

---

## 1. Visual Comparison Protocols (Step 15)

Both the Illustrator artboards and the generated PowerPoint slides must be rendered at identical pixel dimensions (typically 1920x1080 or matching source resolution at 150/300 PPI).

### Comparison Techniques

| Inspection Method | Purpose | How to Execute |
| :--- | :--- | :--- |
| **Side-by-Side Comparison** | Overall composition, balance, color vibrancy, missing blocks | Display reference PNG and PowerPoint render PNG side-by-side |
| **Transparency Overlay (50/50)** | Position shifts, margin drifts, text baseline discrepancies | Blend reference and render at 50% opacity |
| **Pixel Difference Image (Diff)** | Identifying missing objects, stroke clipping, color gamut shifts | Compute absolute RGB difference: `diff = abs(ref - ppt)` |
| **Close-Up Crop Inspection** | Glyph kerning, photo crop boundaries, texture sharpness | Zoom into 400% on headlines, badges, and photo edges |

### Quality Audit Checklist (Per Slide)

- [ ] **Slide Dimensions & Artboard Match**: Slide aspect ratio matches artboard ratio exactly.
- [ ] **Slide Stacking & Order**: Slide index in PPT matches artboard sequence in `.ai`.
- [ ] **Object Completeness**: No shapes, icons, badges, or copy blocks missing.
- [ ] **Color Accuracy**: Solid fills, gradients, and text colors match Hex/RGB targets.
- [ ] **Typography & Wrapping**:
  - [ ] No unintended line wraps (e.g. 2 lines in source becoming 3 lines in PPT).
  - [ ] Baseline alignment matches within \(\pm 2\text{ pt}\).
  - [ ] Letter spacing (tracking) and line spacing (leading) are visually balanced.
- [ ] **Image Geometry & Crops**:
  - [ ] Photographic aspect ratios are preserved (no squished or stretched faces).
  - [ ] Visible crop window matches Illustrator clipping mask bounds.
  - [ ] Rotated images maintain correct rotation angle and unclipped subject matter.
- [ ] **Shape Geometry & Fills**:
  - [ ] Compound paths retain holes (e.g., counters in letters, hollow stars, donut rings).
  - [ ] Stroke weights and colors match original vector strokes.
- [ ] **Artboard Boundary Cleanliness**:
  - [ ] Off-canvas artwork is trimmed or clipped to the slide edge.
  - [ ] No stray objects lingering on the pasteboard in editing view.

---

## 2. Editability Verification Protocol (Step 16)

A slide can achieve a 99% visual match while failing editability if it was simply exported as a background picture. The slide structure MUST be inspected:

### Editability Checks in PowerPoint

1. **Paragraph Continuity Test**:
   - Click cursor into a multi-line paragraph.
   - Press Enter or type 5 new characters.
   - **Pass Criteria**: All subsequent lines in the paragraph automatically reflow downwards inside the single text box.
   - **Fail Criteria**: The cursor is trapped in one single line, or adjacent lines are separate objects that do not reflow.

2. **Heading & Title Test**:
   - Click the title.
   - **Pass Criteria**: Title exists as a single text frame. Bold accents or highlighted words are styled runs within the same box.

3. **Picture Replacement Test**:
   - Right-click any photograph or placed graphic.
   - Select **Change Picture** -> **This Device...**
   - **Pass Criteria**: The picture can be swapped with a new image directly; crop handles remain active.
   - **Fail Criteria**: The picture is part of a flattened slide background or locked vector group.

4. **Shape Restyling Test**:
   - Select a vector card, button, or geometric background.
   - Change Shape Fill color in the PowerPoint ribbon.
   - **Pass Criteria**: Shape updates immediately as a native vector object.

5. **Structural Inspection Script**:
   - Run an automated check on the `.pptx` XML structure to verify the count of native text boxes (`<p:sp>` with `<p:txBody>`), pictures (`<p:pic>`), and geometric shapes (`<p:sp>` with `<a:prstGeom>` or `<a:custGeom>`).

---

## 3. Defect Diagnosis and Remediation Matrix (Step 17)

| Observed Defect | Root Cause | Remediation Procedure |
| :--- | :--- | :--- |
| **Headline wraps onto extra line** | PPT default margin or font width metric mismatch | Set `margin_left=0`, `margin_right=0`, widen text box width by 2–4 pt, or adjust tracking |
| **Text block sits too low** | Difference in font ascent anchor vs PPT top margin | Adjust text box `top` position upward by 2–3 pt |
| **Portrait looks horizontally compressed** | Image stretched to fit clipping box instead of cropped | Extract original image pixel aspect ratio; apply PPT `crop_left`/`crop_right` offsets |
| **Filled compound shape looks hollow** | Even-odd fill rule inverted or winding order reversed | Invert path winding or rebuild as native PPT shape with proper subpaths |
| **Grunge texture marks too large** | Texture image scaled up to fit slide | Use original texture dimensions and position at 1:1 pixel scale |
| **All objects shift together off-center** | Global canvas origin used instead of artboard origin \((x_a, y_a)\) | Subtract artboard `[left, top]` from all object coordinates |
| **Elements appear outside slide boundary** | Off-canvas artwork not clipped during extraction | Run boundary clipping filter: discard out-of-bounds items, crop intersecting geometry |
| **Paragraph requires selecting each line** | Text was extracted as separate point text frames | Run semantic clustering algorithm to merge lines into a single text box with runs |

---

## 4. Completion Statement Standards (Step 18)

When presenting the completed conversion to the user, the delivery statement MUST follow strict truth-in-reporting standards:

### Required Delivery Statement Format
```markdown
### Illustrator to PowerPoint Conversion Report

- **Source File**: `<path-to-source>.ai`
- **Output Presentation**: `<path-to-output>.pptx`
- **Artboard Count**: `N` artboards converted to `N` slides in exact order.
- **Slide Dimensions**: `<width> pt x <height> pt` (`16:9` / `4:3` / custom).

#### Verification Summary
1. **Typography & Editability**:
   - Live text frames rebuilt: `N`
   - All paragraphs unified into single native text boxes with automatic reflow.
   - Fonts used: `[List of fonts]`
   - Font status: `[Embedded / System verified / Disclosed substitutions]`
2. **Visual Fidelity**:
   - Render comparison executed: `100% of slides compared`
   - Mean visual alignment score: `XX.X%`
   - Slide boundaries: `Cleanly trimmed to artboard edges`
3. **Disclosed Limitations & Compromises**:
   - `[None / List any isolated effects that required raster plate fallbacks]`
```
