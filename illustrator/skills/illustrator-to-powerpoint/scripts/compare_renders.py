#!/usr/bin/env python3
"""
compare_renders.py

Compares reference Illustrator artboard PNG renders against PowerPoint slide PNG renders.
Generates side-by-side composites, 50/50 transparency overlays, and difference heatmaps.
Calculates pixel alignment fidelity percentage and writes a structured QA report.

Usage:
    uv run --with pillow python3 compare_renders.py \
        --ref-dir ~/Desktop/Conversion/Reference-renders \
        --ppt-dir ~/Desktop/Conversion/PowerPoint-renders \
        --out-dir ~/Desktop/Conversion/Working/diffs
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageEnhance
except ImportError:
    print("Error: Pillow is required. Run via 'uv run --with pillow python3 ...'")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Visual comparison between Illustrator references and PowerPoint renders")
    parser.add_argument("--ref-dir", default=os.path.expanduser("~/Desktop/Conversion/Reference-renders"),
                        help="Folder containing reference artboard PNGs")
    parser.add_argument("--ppt-dir", default=os.path.expanduser("~/Desktop/Conversion/PowerPoint-renders"),
                        help="Folder containing PowerPoint slide PNG renders")
    parser.add_argument("--out-dir", default=os.path.expanduser("~/Desktop/Conversion/Working/diffs"),
                        help="Folder to save diff images and QA report")
    return parser.parse_args()


def compare_images(ref_path, ppt_path, out_dir, index_str):
    ref_img = Image.open(ref_path).convert("RGBA")
    ppt_img = Image.open(ppt_path).convert("RGBA")

    # Ensure identical dimensions for diff
    target_size = ref_img.size
    if ppt_img.size != target_size:
        ppt_img = ppt_img.resize(target_size, Image.Resampling.LANCZOS)

    # 1. Side-by-Side Composite
    sbs_width = target_size[0] * 2
    sbs_height = target_size[1]
    sbs_img = Image.new("RGBA", (sbs_width, sbs_height))
    sbs_img.paste(ref_img, (0, 0))
    sbs_img.paste(ppt_img, (target_size[0], 0))
    sbs_path = os.path.join(out_dir, f"slide_{index_str}_side_by_side.png")
    sbs_img.save(sbs_path)

    # 2. 50/50 Transparency Overlay
    overlay_img = Image.blend(ref_img, ppt_img, alpha=0.5)
    overlay_path = os.path.join(out_dir, f"slide_{index_str}_overlay.png")
    overlay_img.save(overlay_path)

    # 3. Difference Heatmap
    diff_img = ImageChops.difference(ref_img.convert("RGB"), ppt_img.convert("RGB"))
    # Amplify difference for visual clarity
    enhanced_diff = ImageEnhance.Brightness(diff_img).enhance(4.0)
    diff_path = os.path.join(out_dir, f"slide_{index_str}_diff.png")
    enhanced_diff.save(diff_path)

    # Calculate pixel difference metric
    stat = ImageChops.difference(ref_img.convert("L"), ppt_img.convert("L"))
    histogram = stat.histogram()
    total_pixels = target_size[0] * target_size[1]
    sum_diff = sum(i * n for i, n in enumerate(histogram))
    mean_diff = sum_diff / float(total_pixels)
    match_percentage = max(0.0, 100.0 - (mean_diff / 255.0 * 100.0))

    return {
        "slideIndex": index_str,
        "referenceImage": str(ref_path),
        "powerpointRender": str(ppt_path),
        "sideBySideImage": sbs_path,
        "overlayImage": overlay_path,
        "diffImage": diff_path,
        "meanDifference": round(mean_diff, 2),
        "visualMatchPercentage": round(match_percentage, 2)
    }


def main():
    args = parse_args()
    ref_dir = Path(args.ref_dir).expanduser().resolve()
    ppt_dir = Path(args.ppt_dir).expanduser().resolve()
    out_dir = Path(args.out_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not ref_dir.exists():
        print(f"Error: Reference directory '{ref_dir}' does not exist.")
        sys.exit(1)

    ref_files = sorted([f for f in ref_dir.glob("*.png")])
    if not ref_files:
        print(f"No PNG reference files found in '{ref_dir}'.")
        sys.exit(1)

    ppt_files = sorted([f for f in ppt_dir.glob("*.png")]) if ppt_dir.exists() else []

    qa_report = {
        "totalSlidesCompared": 0,
        "averageMatchScore": 0.0,
        "results": []
    }

    total_score = 0.0

    for idx, ref_file in enumerate(ref_files):
        idx_str = f"{idx + 1:03d}"
        # Look for matching ppt render file
        matching_ppt = None
        for pf in ppt_files:
            if idx_str in pf.stem or f"slide-{idx+1}" in pf.stem:
                matching_ppt = pf
                break
        if not matching_ppt and idx < len(ppt_files):
            matching_ppt = ppt_files[idx]

        if matching_ppt:
            res = compare_images(ref_file, matching_ppt, out_dir, idx_str)
            qa_report["results"].append(res)
            total_score += res["visualMatchPercentage"]
            qa_report["totalSlidesCompared"] += 1
            print(f"Slide {idx_str}: Visual Match = {res['visualMatchPercentage']}% (Diff: {res['diffImage']})")
        else:
            print(f"Slide {idx_str}: Reference exists ({ref_file.name}), but no PowerPoint render found to compare.")

    if qa_report["totalSlidesCompared"] > 0:
        qa_report["averageMatchScore"] = round(total_score / qa_report["totalSlidesCompared"], 2)

    report_path = out_dir / "qa_verification_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(qa_report, f, indent=2)

    print(f"\nQA Verification Complete. Average Match Score: {qa_report['averageMatchScore']}%")
    print(f"Report saved to: {report_path}")


if __name__ == "__main__":
    main()
