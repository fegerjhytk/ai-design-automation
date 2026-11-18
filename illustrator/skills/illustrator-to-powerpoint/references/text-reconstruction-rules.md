# Semantic Text Reconstruction and Typography Rules

Reconstructing Illustrator typography as native, editable PowerPoint text boxes is the core requirement of this skill. An SVG inserted as an image or vector outline does not meet the editability standard.

---

## 1. The Fragmentation Problem

Illustrator files (especially those exported to SVG or PDF intermediates) often decompose a single coherent paragraph into separate independent lines or individual glyphs:

```text
[Bad / Fragmented Representation]
Box 1: "This is the first line"
Box 2: "of the same paragraph"
Box 3: "continued here."
```

In Microsoft PowerPoint, grouping three text boxes is **not** an acceptable solution. The user cannot edit the wording fluidly because text in Box 1 will overflow or collide with Box 2 rather than reflowing naturally.

```text
[Required Semantic Representation]
Single Text Box:
"This is the first line of the same paragraph continued here."
(with word_wrap=True and automatic line reflow)
```

---

## 2. Paragraph Reconstruction Algorithm

When analyzing extracted text items from Illustrator:

### Step 1: Spatial & Semantic Clustering
Evaluate whether adjacent text fragments belong to the same paragraph:
1. **Column / X-Coordinate Alignment**: Left edges align within \(\pm 2\text{ pt}\) (for left-aligned text), center points align within \(\pm 2\text{ pt}\) (for centered text), or right edges align (for right-aligned text).
2. **Line Pitch Consistency**: Vertical gap between line \(n\) baseline and line \(n+1\) baseline equals the font's measured leading \(\pm 1.5\text{ pt}\).
3. **Font Family & Hierarchy Continuity**: Same font family and comparable size (e.g., standard body text size).
4. **Sentence Continuity**: Line \(n\) ends without terminal sentence punctuation (or ends mid-clause), and line \(n+1\) starts with lowercase or continuation grammar.

### Step 2: Negative Filters (Do NOT Merge)
- **Headings and Body**: Never merge a headline (`font-size: 32pt`) with its subheadline or body paragraph (`font-size: 14pt`), even if closely positioned.
- **Captions and Disclaimers**: Keep image captions, legal disclaimers, and footnotes in dedicated semantic boxes.
- **Multi-Column Layouts**: Never merge text blocks across column boundaries.
- **Table / Bento Grid Cells**: Text in separate cards or grid containers must occupy separate text boxes.

---

## 3. Native PowerPoint Text Structure

A native PowerPoint text object follows this hierarchy:

```
Shape (MSO_SHAPE.RECTANGLE with transparent fill & line)
 └── TextFrame (word_wrap = True, zero margins)
      ├── Paragraph 1 (alignment = PP_ALIGN.LEFT, line_spacing = 1.15)
      │    ├── Run 1 ("Welcome to the ", font: Inter, 16pt, regular, #1A1A1A)
      │    ├── Run 2 ("Future", font: Inter, 16pt, bold, #0066FF)
      │    └── Run 3 (" of Design.", font: Inter, 16pt, regular, #1A1A1A)
      └── Paragraph 2 (space_before = 8pt)
           └── Run 1 ("Second paragraph content reflowing naturally...")
```

### Python-PPTX Implementation Pattern
```python
from pptx.util import Pt, Inches
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

def add_semantic_text_box(slide, left, top, width, height, paragraphs_data):
    tx_box = slide.shapes.add_textbox(left, top, width, height)
    tf = tx_box.text_frame
    tf.word_wrap = True
    
    # Eliminate default Office padding to match Illustrator exact geometry
    tf.margin_left = Pt(0)
    tf.margin_right = Pt(0)
    tf.margin_top = Pt(0)
    tf.margin_bottom = Pt(0)
    
    for i, p_data in enumerate(paragraphs_data):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = p_data.get('align', PP_ALIGN.LEFT)
        if 'line_spacing' in p_data:
            p.line_spacing = p_data['line_spacing']
        if 'space_after' in p_data:
            p.space_after = Pt(p_data['space_after'])
            
        for run_data in p_data.get('runs', []):
            run = p.add_run()
            run.text = run_data['text']
            run.font.name = run_data['font_name']
            run.font.size = Pt(run_data['font_size'])
            run.font.bold = run_data.get('bold', False)
            run.font.italic = run_data.get('italic', False)
            if 'color' in run_data:
                r, g, b = run_data['color']
                run.font.color.rgb = RGBColor(r, g, b)
    return tx_box
```

---

## 4. Typography & Font Resolution Rules

### Rule 1: Exact Font Matching Over Heuristic Sizing
- Inspect installed fonts on the operating system (`system_profiler SPFontsDataType` or `/Library/Fonts`, `~/Library/Fonts`).
- If an exact PostScript font name (e.g. `Inter-SemiBold`) maps to a family in PowerPoint, ensure PowerPoint points to the family (`Inter`) and applies the style flag (`bold = True`).

### Rule 2: Substituted Fonts Require Disclosure
- When a font is unavailable on the local machine:
  1. Record the original font family, weight, and PostScript name in the conversion manifest.
  2. Select the closest metric-compatible alternative (e.g., Arial for Helvetica, Calibri for Carlito).
  3. **Explicitly disclose the substitution** in the completion report.
  4. **Strict prohibition**: NEVER alter copy, delete words, shrink font sizes drastically, or stretch text boxes artificially to hide font substitution discrepancies.

### Rule 3: Live Text vs. Outlines
- Outlined lettering (`PathItem` in Illustrator) has lost its character identities.
- If the wording is clear and represents body copy or headlines, transcribe it into live text using the exact copy.
- If the lettering is an intricate logo, logotype, or stylized brand monogram where live fonts cannot replicate the bezier curves, keep it as an editable native vector path. Disclose clearly: *"Logo maintained as vector shape; body typography converted to live text."*

---

## 5. Baseline & Vertical Anchor Calibration

Illustrator and PowerPoint position text from different internal metrics:
- **Illustrator Area Text**: First baseline offset is determined by font ascent or cap height.
- **PowerPoint TextFrame**: Content anchors to `top` margin, but internal line padding varies by font family metrics.

### Calibration Procedure
1. Export a reference render of the artboard.
2. Build the PowerPoint slide and render it to a PNG.
3. Compare the baseline position of the first line of text.
4. If PowerPoint text sits lower than Illustrator text (commonly 1.5–3 pt lower), adjust `top` position upward by the measured offset:
   \[
   \text{top}_{\text{corrected}} = \text{top}_{\text{initial}} - \Delta y_{\text{baseline}}
   \]
5. Re-render and confirm alignment.
