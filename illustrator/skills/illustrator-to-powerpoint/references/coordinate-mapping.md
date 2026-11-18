# Coordinate and Geometric Mapping Reference

Converting artwork from Adobe Illustrator to Microsoft PowerPoint requires bridging two distinct coordinate systems, unit scales, and transform paradigms.

---

## 1. Coordinate Systems & Units

### Adobe Illustrator
- **Canvas Space**: Arbitrary large coordinate plane.
- **Artboard Origin**: Each artboard has an origin \((x_a, y_a)\) and bounding rectangle `[left, top, right, bottom]`.
  - In modern Illustrator ExtendScript: `artboard.artboardRect` returns `[left, top, right, bottom]` where `left < right` and typically `top > bottom` (or inverted depending on ruler origin).
  - Width: \(W_a = |\text{right} - \text{left}|\)
  - Height: \(H_a = |\text{top} - \text{bottom}|\)
- **Units**: Points (1 pt = 1/72 inch).

### Microsoft PowerPoint
- **Slide Space**: Top-left origin is \((0, 0)\).
- **Axis Direction**: \(X\) increases to the right; \(Y\) increases downwards.
- **Internal Units**:
  - OpenXML uses **EMUs (English Metric Units)**:
    - \(1\text{ inch} = 914,400\text{ EMUs}\)
    - \(1\text{ pt} = 12,700\text{ EMUs}\)
    - \(72\text{ pt} = 914,400\text{ EMUs}\)
  - python-pptx exposes helper objects: `Pt(points)`, `Inches(inches)`, `Emu(emus)`.

---

## 2. Transformation Equations

For an artboard with top-left origin \((x_a, y_a)\), source dimensions \((W_a, H_a)\), and target PowerPoint slide dimensions \((W_p, H_p)\):

### Scale Factors
\[
s_x = \frac{W_p}{W_a}, \quad s_y = \frac{H_p}{H_a}
\]

> [!IMPORTANT]
> **Uniform Scaling Rule**: To avoid warping typography and geometry, always configure the PowerPoint presentation slide dimensions so that \(W_p / H_p = W_a / H_a\). When setting slide dimensions directly in points (\(W_p = W_a, H_p = H_a\)), \(s_x = s_y = 1.0\).

### Point Transformation
Given an object position in Illustrator relative to the global canvas \((x_i, y_i)\):

If Illustrator coordinates have top-left relative to artboard:
\[
x_p = (x_i - x_a) \cdot s_x
\]
\[
y_p = (y_a - y_i) \cdot s_y \quad \text{(when Illustrator Y increases upwards)}
\]
or:
\[
y_p = (y_i - y_a) \cdot s_y \quad \text{(when Illustrator Y increases downwards)}
\]

---

## 3. Handling Rotations and Anchor Points

### Illustrator vs. PowerPoint Rotation
- **Illustrator**: Can rotate an object around any arbitrary pivot point (e.g., top-left, bottom-center, custom anchor).
- **PowerPoint**: Always rotates shapes around their **geometric center point** \((x_c, y_c)\).

### Pivot Normalization Algorithm
To position a rotated shape in PowerPoint with angle \(\theta\) (clockwise degrees) so that its visible bounds match the Illustrator visual placement:
1. Compute the center of the unrotated shape in Illustrator relative to the artboard:
   \[
   x_{center} = x_i + \frac{W}{2}, \quad y_{center} = y_i + \frac{H}{2}
   \]
2. Map the center coordinate to PowerPoint:
   \[
   x_{p\_center} = (x_{center} - x_a) \cdot s_x
   \]
   \[
   y_{p\_center} = (y_{center} - y_a) \cdot s_y
   \]
3. Derive the PowerPoint top-left placement:
   \[
   \text{left}_p = x_{p\_center} - \frac{W \cdot s_x}{2}
   \]
   \[
   \text{top}_p = y_{p\_center} - \frac{H \cdot s_y}{2}
   \]
4. Assign `shape.rotation = \theta`.

---

## 4. Group Transforms and Hierarchy Flattening

A frequent bug in vector conversion is **double-transforming child elements**:
- If a group has offset \((dx_g, dy_g)\) and scale \(s_g\), its child elements may already have coordinates relative to the group or absolute to the canvas.

### Invariant Rules
1. **Always Extract Global Bounding Boxes**: When reading objects via ExtendScript, use `item.geometricBounds` or `item.visibleBounds` in absolute canvas coordinates.
2. **Flatten Group Offsets at Extraction Time**: Do NOT apply group translation to the group container and then apply it again to individual child shapes inside PowerPoint.
3. **Hierarchy Preservation**: When creating PowerPoint groups (`slide.shapes.add_group_shape`), place child shapes using coordinates relative to the group's bounding rectangle.

---

## 5. Mixed Artboard Sizes in One Illustrator Document

Illustrator allows artboards of different dimensions and orientations within a single `.ai` file (e.g., Artboard 1: 1920x1080 horizontal; Artboard 2: 1080x1920 vertical).

PowerPoint presentations enforce a **single uniform slide dimension** across the entire deck (`prs.slide_width` and `prs.slide_height`).

### Resolution Protocols
1. **Protocol 1: Multi-Deck Partitioning (Recommended for Production)**:
   - Group artboards by aspect ratio.
   - Output separate `.pptx` presentations (e.g., `<name>_Presentation_16x9.pptx`, `<name>_Social_9x16.pptx`).
2. **Protocol 2: Primary Aspect Ratio with Pillarbox/Letterbox**:
   - Determine the dominant aspect ratio across artboards.
   - For non-matching artboards, scale uniformly to fit within the slide bounds, centering the artwork and filling the margins with a neutral/matching background.
   - Disclose in the completion statement.
