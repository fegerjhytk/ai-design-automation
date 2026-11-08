# Requirements: AI Design Automation Engine

## Functional Requirements
- **REQ-01**: Define parameterized copy schema for headline, subhead, body copy, and CTA text with character length constraints.
- **REQ-02**: Define layout bounding boxes for 1:1 (Feed), 9:16 (Stories/Reels), and 16:9 (Display) aspect ratios.
- **REQ-03**: Integrate Magnific vector generator pipeline to produce clean 2D editable SVG vector paths.
- **REQ-04**: Implement asset normalizer to verify transparent PNG cutouts and alpha channels.
- **REQ-05**: Develop ExtendScript (.jsx) runner wrapper to execute TypeFlow layouts in Illustrator without UI freezing.
- **REQ-06**: Enforce dynamic font scaling so long copy automatically reduces tracking/leading rather than overflowing text frames.
- **REQ-07**: Implement automated vector linting (detect unpainted paths, stray anchor points, open path gaps).
- **REQ-08**: Verify WCAG AA color contrast between CTA button background and CTA label text.
- **REQ-09**: Automate batch artboard export to WebP and PNG 300 DPI via Image Export v2.
- **REQ-10**: Support multi-page print-ready CMYK PDF generation with trim and bleed marks.

## Non-Functional Requirements
- **NFR-01 (Context Preservation)**: Total tokens consumed during layout scripting must remain under threshold by offloading DOM walks to subagents.
- **NFR-02 (Zero Text Loss)**: 0% font substitution errors or clipped glyphs on final artboards.
- **NFR-03 (Reproducibility)**: Every creative batch must be traceable back to its input JSON spec and git commit hash.
