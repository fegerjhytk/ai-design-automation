#!/usr/bin/env python3
"""
build_native_pptx.py

Reconstructs native, editable Microsoft PowerPoint presentations (.pptx)
from structured Adobe Illustrator extracted artwork manifests.

Usage:
    uv run --with python-pptx --with pillow python3 build_native_pptx.py \
        --manifest ~/Desktop/Conversion/Working/extracted_artwork.json \
        --out ~/Desktop/Conversion/Final/presentation.pptx
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    from pptx import Presentation
    from pptx.util import Pt, Inches
    from pptx.enum.text import PP_ALIGN
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
except ImportError:
    print("Error: python-pptx is required. Run via 'uv run --with python-pptx python3 ...'")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Build native PowerPoint presentation from Illustrator manifest")
    parser.add_argument("--manifest", default=os.path.expanduser("~/Desktop/Conversion/Working/extracted_artwork.json"),
                        help="Path to extracted_artwork.json")
    parser.add_argument("--out", default=os.path.expanduser("~/Desktop/Conversion/Final/converted_presentation.pptx"),
                        help="Output .pptx path")
    return parser.parse_args()


def map_alignment(align_str):
    align_str = (align_str or "").upper()
    if align_str == "CENTER":
        return PP_ALIGN.CENTER
    elif align_str == "RIGHT":
        return PP_ALIGN.RIGHT
    elif align_str == "JUSTIFY":
        return PP_ALIGN.JUSTIFY
    return PP_ALIGN.LEFT


def build_presentation(manifest_path, out_path):
    manifest_file = Path(manifest_path).expanduser().resolve()
    if not manifest_file.exists():
        print(f"Error: Manifest file '{manifest_file}' not found.")
        sys.exit(1)

    content = None
    for enc in ("utf-8", "mac_roman", "latin1"):
        try:
            with open(manifest_file, "r", encoding=enc) as f:
                content = f.read()
                data = json.loads(content)
                break
        except Exception:
            continue
    if content is None:
        print(f"Error: Could not decode manifest file '{manifest_file}' with supported encodings.")
        sys.exit(1)

    artboards = data.get("artboards", [])
    if not artboards:
        print("Warning: No artboards found in manifest.")
        return

    prs = Presentation()

    # Set slide dimensions from the first artboard
    first_ab = artboards[0]
    slide_w_pt = first_ab.get("widthPt", 960)
    slide_h_pt = first_ab.get("heightPt", 540)
    prs.slide_width = Pt(slide_w_pt)
    prs.slide_height = Pt(slide_h_pt)

    # Use a blank slide layout (typically index 6 in standard templates)
    blank_layout = prs.slide_layouts[6] if len(prs.slide_layouts) > 6 else prs.slide_layouts[-1]

    stats = {
        "slides": 0,
        "textBoxes": 0,
        "shapes": 0,
        "images": 0
    }

    for ab in artboards:
        slide = prs.slides.add_slide(blank_layout)
        stats["slides"] += 1

        items = ab.get("items", [])
        for item in items:
            item_type = item.get("type")
            left = Pt(max(0, item.get("left", 0)))
            top = Pt(max(0, item.get("top", 0)))
            width = Pt(max(1, item.get("width", 10)))
            height = Pt(max(1, item.get("height", 10)))

            # 1. Native Shapes
            if item_type == "shape":
                fill_rgb = item.get("fillColor")
                stroke_rgb = item.get("strokeColor")
                stroke_width = item.get("strokeWidth", 0)
                if not fill_rgb and (not stroke_rgb or stroke_width <= 0):
                    continue

                shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
                stats["shapes"] += 1

                gradient = item.get("gradient")
                if gradient and gradient.get("stops") and len(gradient["stops"]) >= 2:
                    try:
                        shape.fill.gradient()
                        stops = gradient["stops"]
                        for idx, st_data in enumerate(stops[:len(shape.fill.gradient_stops)]):
                            c = st_data.get("color")
                            if c:
                                shape.fill.gradient_stops[idx].color.rgb = RGBColor(c[0], c[1], c[2])
                                shape.fill.gradient_stops[idx].position = float(st_data.get("position", 0.0))
                    except Exception:
                        if fill_rgb:
                            shape.fill.solid()
                            shape.fill.fore_color.rgb = RGBColor(fill_rgb[0], fill_rgb[1], fill_rgb[2])
                elif fill_rgb:
                    shape.fill.solid()
                    shape.fill.fore_color.rgb = RGBColor(fill_rgb[0], fill_rgb[1], fill_rgb[2])
                else:
                    shape.fill.background()

                if stroke_rgb and stroke_width > 0:
                    shape.line.color.rgb = RGBColor(stroke_rgb[0], stroke_rgb[1], stroke_rgb[2])
                    shape.line.width = Pt(stroke_width)
                else:
                    shape.line.fill.background()

            # 2. Native Images
            elif item_type == "image":
                img_path = item.get("imagePath")
                if img_path and os.path.exists(img_path):
                    slide.shapes.add_picture(img_path, left, top, width, height)
                    stats["images"] += 1
                else:
                    # Create clean picture placeholder shape
                    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
                    shape.fill.solid()
                    shape.fill.fore_color.rgb = RGBColor(230, 230, 230)
                    shape.line.color.rgb = RGBColor(180, 180, 180)
                    stats["images"] += 1

            # 3. Native Semantic Text Boxes
            elif item_type == "text":
                # Provide small safety width buffer (+4pt) to prevent accidental single-character line wraps
                text_width = Pt(max(1, item.get("width", 10) + 4))
                tx_box = slide.shapes.add_textbox(left, top, text_width, height)
                stats["textBoxes"] += 1
                tf = tx_box.text_frame
                tf.word_wrap = True

                # Remove internal margins for exact coordinate alignment
                tf.margin_left = Pt(0)
                tf.margin_right = Pt(0)
                tf.margin_top = Pt(0)
                tf.margin_bottom = Pt(0)

                paragraphs = item.get("paragraphs", [])
                for p_idx, p_data in enumerate(paragraphs):
                    p = tf.paragraphs[0] if p_idx == 0 else tf.add_paragraph()
                    p.alignment = map_alignment(p_data.get("align"))

                    runs = p_data.get("runs", [])
                    if not runs and p_data.get("text"):
                        # Fallback for plain paragraph text
                        run = p.add_run()
                        run.text = p_data.get("text")
                    else:
                        for r_data in runs:
                            run = p.add_run()
                            run.text = r_data.get("text", "")
                            run.font.name = r_data.get("font", "Arial")
                            run.font.size = Pt(r_data.get("size", 12))
                            run.font.bold = r_data.get("bold", False)
                            run.font.italic = r_data.get("italic", False)

                            c = r_data.get("color")
                            if c and len(c) == 3:
                                run.font.color.rgb = RGBColor(c[0], c[1], c[2])

    out_file = Path(out_path).expanduser().resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out_file))

    print(f"Presentation successfully created at: {out_file}")
    print(f"Summary: {stats['slides']} slides, {stats['textBoxes']} native text boxes, {stats['shapes']} shapes, {stats['images']} images.")


if __name__ == "__main__":
    args = parse_args()
    build_presentation(args.manifest, args.out)
