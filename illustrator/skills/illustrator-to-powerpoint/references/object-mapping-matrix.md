# Illustrator to PowerPoint Object Mapping Matrix

This matrix specifies how Adobe Illustrator document objects, styling, and effects map to native Microsoft PowerPoint objects, including fallback strategies and user disclosure requirements.

## 1. Core Object Mapping

| Illustrator Object | Preferred PowerPoint Equivalent | Fallback / Compromise Strategy | User Disclosure Required? |
| :--- | :--- | :--- | :--- |
| **Live Area Text** | Native single text box (`MSO_SHAPE.RECTANGLE` with transparent fill/line) containing formatted paragraphs and styled text runs | If font missing, embed font or map to verified metric-compatible substitute | Yes, if font substituted |
| **Live Point Text** | Converted to bounded native text box with automatic wrap disabled | Single-line native text box | No |
| **Outlined Typography** | Reconstruct into live text box using original copy/OCR if semantic editing is desired | Freeform vector shape (preserving exact outline geometry) | Yes (clarify: editable path, not editable wording) |
| **Simple Rectangle / Square** | Native PowerPoint shape (`MSO_SHAPE.RECTANGLE`) | Freeform path if rounded corners have unequal radii | No |
| **Rounded Rectangle** | Native PowerPoint shape (`MSO_SHAPE.ROUNDED_RECTANGLE`) with matching corner radius | Freeform path | No |
| **Circle / Ellipse** | Native PowerPoint shape (`MSO_SHAPE.OVAL`) | Freeform path | No |
| **Polygons / Stars** | Native PowerPoint geometric shapes (`MSO_SHAPE.HEXAGON`, `OCTAGON`, `5_POINT_STAR`, etc.) | Native freeform path (`add_shape` / freeform builder) | No |
| **Custom Vector Paths** | Native PowerPoint Freeform shape (`Slide.shapes.build_freeform`) | Segmented bezier approximation | No |
| **Compound Paths (with holes/cutouts)** | Native PowerPoint Freeform shape with closed subpaths and explicit fill rule | Multi-part combined shape or SVG path import | Only if fill rule causes visual artifact |
| **Straight Lines / Dividers** | Native PowerPoint connector/line (`MSO_CONNECTOR.STRAIGHT`) | Single-stroke freeform path | No |
| **Photographs (Unclipped)** | Native Picture object (`Slide.shapes.add_picture`) at original aspect ratio | — | No |
| **Photographs (Rectangular Clip)** | Native Picture object with PowerPoint picture crop offsets (`crop_top`, `crop_bottom`, `crop_left`, `crop_right`) | Shape with Picture Fill | No |
| **Photographs (Complex Vector Clip)** | Shape with Picture Fill (`shape.fill.user_picture`) shaped as the clipping path | Pre-masked PNG cutout with alpha channel | Yes, if picture cannot be swapped without re-masking |
| **Rotated Pictures** | Native Picture object rotated via `picture.rotation` with unrotated crop calculation | Pre-rotated raster asset | Yes, if PPT rotation distorts crop bounds |
| **Textures & Grunge Overlays** | Separate Picture shape at original pixel density, position, rotation, and opacity | Pre-composited background image | Yes, if layer blend mode cannot be matched |

---

## 2. Appearance & Effect Mapping

| Illustrator Appearance / Effect | PowerPoint Native Implementation | Fallback / Compromise Strategy | Editing Impact |
| :--- | :--- | :--- | :--- |
| **Solid Fill (RGB/Hex)** | `shape.fill.solid()`, `shape.fill.fore_color.rgb = RGBColor(...)` | — | Fully editable |
| **Solid Stroke (Color & Width)** | `shape.line.color.rgb = RGBColor(...)`, `shape.line.width = Pt(...)` | — | Fully editable |
| **Dashed / Dotted Strokes** | `shape.line.dash_style = MSO_DASH.DASH` / `ROUND_DOT` | Custom dashed segment paths | Fully editable |
| **Object Opacity / Transparency** | Native shape fill/line transparency (`fill.transparency = 1.0 - alpha`) | Alpha PNG for complex multi-object groups | Fully editable if native |
| **Linear Gradients (2-stop)** | Native PowerPoint two-color linear gradient with matching angle | Pre-rendered raster gradient fill | Disclose if rasterized |
| **Multi-Stop / Radial Gradients** | PowerPoint gradient stops via OpenXML (`a:gradFill`) | Pre-rendered 300 PPI PNG background plate | Disclose if rasterized |
| **Freeform Gradient / Mesh** | Pre-rendered isolated raster asset behind native text/shapes | — | Disclose: background is image, text is live |
| **Drop Shadow** | Native PowerPoint shape shadow (`shape.shadow.inherit = False`, blur, angle, distance) | Soft-edge shadow raster placed behind object | Disclose if rasterized |
| **Gaussian Blur / Feather** | PowerPoint Soft Edges formatting (`shape.soft_edge.radius`) | High-resolution alpha raster asset | Disclose if rasterized |
| **Blend Modes (Multiply, Screen, Overlay)** | PPT native transparency (if Normal) | Isolated rendered effect plate placed behind live text | Disclose: layer blend mode requires pre-composite |
| **Clipping to Artboard Boundaries** | Geometry clipping: intersecting shapes with artboard rect; crop bounds for pictures | Slide boundary overflow hidden in presentation mode | Disclose if off-canvas objects remain in edit view |

---

## 3. Strict Rules for Disclosing Compromises

When an Illustrator visual effect cannot be mapped to a 100% native, editable PowerPoint object:
1. **Never flatten the entire slide** to solve a local effect limitation. Live text must ALWAYS remain live text.
2. **Isolate the raster element**: Only the specific background texture, complex gradient mesh, or organic grunge element should be rendered to an image.
3. **Layer order must be preserved**: The raster plate sits at the exact z-order of the original Illustrator layer, with all foreground text and vector badges sitting on top as native PowerPoint objects.
4. **Disclose explicitly in the completion statement**: Document exactly which layer was converted to a raster image, why, and how a user can edit or replace it.
