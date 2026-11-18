#!/usr/bin/env python3
"""
Design QC Visual Difference Engine
Generates:
1. Side-by-Side Image Mode (Before vs. After)
2. Marked Mode (Pixel diff clustering, vibrant red highlight bounding boxes, numbered pins)
3. 3-Panel Verification Composite (Before | After | Marked Diff)
4. Interactive HTML Split-Screen Comparison Dashboard
"""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops

def compute_pixel_diff_boxes(img_before: Image.Image, img_after: Image.Image, threshold=20, cell_size=24, min_area=300):
    """
    Computes differences between two images and groups changed pixels into bounding boxes.
    """
    # Ensure images have same size and RGB mode
    w = min(img_before.width, img_after.width)
    h = min(img_before.height, img_after.height)
    
    b_rgb = img_before.crop((0, 0, w, h)).convert("RGB")
    a_rgb = img_after.crop((0, 0, w, h)).convert("RGB")
    
    # Pixel-by-pixel difference
    diff = ImageChops.difference(b_rgb, a_rgb)
    diff_gray = diff.convert("L")
    
    # Grid cell clustering
    grid_w = (w + cell_size - 1) // cell_size
    grid_h = (h + cell_size - 1) // cell_size
    grid = [[False for _ in range(grid_w)] for _ in range(grid_h)]
    
    diff_data = diff_gray.load()
    for gy in range(grid_h):
        for gx in range(grid_w):
            x_start = gx * cell_size
            y_start = gy * cell_size
            x_end = min(x_start + cell_size, w)
            y_end = min(y_start + cell_size, h)
            
            # Check if any pixel in cell exceeds threshold
            cell_changed = False
            for y in range(y_start, y_end, 2):
                for x in range(x_start, x_end, 2):
                    if diff_data[x, y] > threshold:
                        cell_changed = True
                        break
                if cell_changed:
                    break
            grid[gy][gx] = cell_changed
            
    # Connected component labeling on grid to find clusters
    visited = [[False for _ in range(grid_w)] for _ in range(grid_h)]
    clusters = []
    
    for gy in range(grid_h):
        for gx in range(grid_w):
            if grid[gy][gx] and not visited[gy][gx]:
                # Flood fill cluster
                queue = [(gx, gy)]
                visited[gy][gx] = True
                min_gx, max_gx = gx, gx
                min_gy, max_gy = gy, gy
                count = 0
                
                while queue:
                    cx, cy = queue.pop(0)
                    count += 1
                    min_gx = min(min_gx, cx)
                    max_gx = max(max_gx, cx)
                    min_gy = min(min_gy, cy)
                    max_gy = max(max_gy, cy)
                    
                    # 8-connectivity
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < grid_w and 0 <= ny < grid_h:
                                if grid[ny][nx] and not visited[ny][nx]:
                                    visited[ny][nx] = True
                                    queue.append((nx, ny))
                                    
                # Convert grid bounds to pixel coordinates with padding
                pad = 12
                x1 = max(0, min_gx * cell_size - pad)
                y1 = max(0, min_gy * cell_size - pad)
                x2 = min(w, (max_gx + 1) * cell_size + pad)
                y2 = min(h, (max_gy + 1) * cell_size + pad)
                
                area = (x2 - x1) * (y2 - y1)
                if area >= min_area and count >= 2:
                    clusters.append([x1, y1, x2, y2])
                    
    # Merge overlapping or touching clusters
    merged = []
    while clusters:
        curr = clusters.pop(0)
        has_overlap = False
        for i, other in enumerate(merged):
            # Check if boxes intersect or are within 30px
            gap = 30
            if not (curr[2] + gap < other[0] or curr[0] - gap > other[2] or 
                    curr[3] + gap < other[1] or curr[1] - gap > other[3]):
                # Merge
                other[0] = min(other[0], curr[0])
                other[1] = min(other[1], curr[1])
                other[2] = max(other[2], curr[2])
                other[3] = max(other[3], curr[3])
                has_overlap = True
                break
        if not has_overlap:
            merged.append(curr)
            
    # Sort top-to-bottom, left-to-right
    merged.sort(key=lambda b: (b[1] // 100, b[0]))
    return merged

def create_side_by_side(img_before: Image.Image, img_after: Image.Image, title="VISUAL COMPARISON (IMAGE MODE)") -> Image.Image:
    """Creates a side-by-side composite: [ BEFORE | AFTER ]"""
    w = max(img_before.width, img_after.width)
    h = max(img_before.height, img_after.height)
    
    header_h = 70
    border = 20
    comp_w = w * 2 + border * 3
    comp_h = h + header_h + border * 2
    
    comp = Image.new("RGB", (comp_w, comp_h), color=(24, 25, 28))
    draw = ImageDraw.Draw(comp)
    
    # Header bar
    draw.rectangle([0, 0, comp_w, header_h], fill=(15, 16, 18))
    draw.text((border, 22), title, fill=(230, 230, 230))
    
    # Labels
    draw.text((border, header_h + 8), "BEFORE (Original)", fill=(160, 165, 175))
    draw.text((border * 2 + w, header_h + 8), "AFTER (Modified)", fill=(70, 200, 120))
    
    # Paste images
    comp.paste(img_before, (border, header_h + 35))
    comp.paste(img_after, (border * 2 + w, header_h + 35))
    
    # Thin divider
    draw.line([(border + w + border // 2, header_h + 35), (border + w + border // 2, comp_h - border)], fill=(50, 52, 58), width=2)
    
    return comp

def create_marked_diff(img_before: Image.Image, img_after: Image.Image, boxes: list) -> tuple:
    """
    Creates an annotated image with red highlight boxes and numbered callout pins.
    Returns (annotated_after, three_panel_composite, manifest)
    """
    w = img_after.width
    h = img_after.height
    
    marked = img_after.copy().convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)
    
    badge_radius = 16
    manifest = []
    
    for idx, (x1, y1, x2, y2) in enumerate(boxes, 1):
        # 1. Semi-transparent red fill
        draw_ov.rectangle([x1, y1, x2, y2], fill=(255, 30, 80, 45), outline=(255, 30, 80, 220), width=3)
        
        # 2. Numbered badge pin at top-left of box
        bx = max(badge_radius + 4, x1)
        by = max(badge_radius + 4, y1)
        
        # Outer glow/shadow
        draw_ov.ellipse([bx - badge_radius - 2, by - badge_radius - 2, bx + badge_radius + 2, by + badge_radius + 2], fill=(0, 0, 0, 180))
        # Solid red badge
        draw_ov.ellipse([bx - badge_radius, by - badge_radius, bx + badge_radius, by + badge_radius], fill=(255, 30, 80, 255))
        
        # Text number
        num_str = str(idx)
        draw_ov.text((bx - (4 if len(num_str) == 1 else 7), by - 8), num_str, fill=(255, 255, 255, 255))
        
        manifest.append({
            "pin": idx,
            "box": [x1, y1, x2, y2],
            "center": [(x1 + x2) // 2, (y1 + y2) // 2],
            "width": x2 - x1,
            "height": y2 - y1
        })
        
    marked = Image.alpha_composite(marked, overlay).convert("RGB")
    
    # Create 3-Panel Composite: [ Before | After | Marked Diffs ]
    header_h = 70
    border = 16
    comp_w = w * 3 + border * 4
    comp_h = h + header_h + border * 2
    
    three_panel = Image.new("RGB", (comp_w, comp_h), color=(20, 21, 24))
    draw_3p = ImageDraw.Draw(three_panel)
    
    draw_3p.rectangle([0, 0, comp_w, header_h], fill=(12, 13, 15))
    draw_3p.text((border, 24), "DESIGN VERIFICATION - 3-PANEL COMPARISON & MARKED DIFF", fill=(240, 240, 240))
    
    draw_3p.text((border, header_h + 6), "1. BEFORE (Original)", fill=(160, 165, 175))
    draw_3p.text((border * 2 + w, header_h + 6), "2. AFTER (Clean)", fill=(70, 200, 120))
    draw_3p.text((border * 3 + w * 2, header_h + 6), f"3. MARKED DIFF ({len(boxes)} Changes Detected)", fill=(255, 60, 100))
    
    three_panel.paste(img_before, (border, header_h + 30))
    three_panel.paste(img_after, (border * 2 + w, header_h + 30))
    three_panel.paste(marked, (border * 3 + w * 2, header_h + 30))
    
    return marked, three_panel, manifest

def generate_interactive_html(output_html_path: str, slides_data: list):
    """Generates an interactive, zero-dependency HTML dashboard with a before/after reveal slider."""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Design QC Visual Difference Dashboard</title>
<style>
  :root {{
    --bg-main: #0e0f12;
    --bg-card: #18191f;
    --accent: #ff2a5f;
    --text-primary: #f2f3f5;
    --text-secondary: #9aa0a6;
    --border: #2c2d35;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
  body {{ background: var(--bg-main); color: var(--text-primary); padding: 24px; }}
  header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }}
  h1 {{ font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 10px; }}
  .badge {{ background: var(--accent); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }}
  .tabs {{ display: flex; gap: 8px; margin-bottom: 20px; }}
  .tab-btn {{ background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }}
  .tab-btn.active {{ background: var(--accent); color: white; border-color: var(--accent); }}
  .viewer-container {{ background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; position: relative; }}
  .slider-wrapper {{ position: relative; width: 100%; max-width: 1200px; margin: 0 auto; overflow: hidden; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); user-select: none; }}
  .slider-wrapper img {{ display: block; width: 100%; height: auto; }}
  .img-after {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }}
  .slider-handle {{ position: absolute; top: 0; bottom: 0; width: 4px; background: white; cursor: ew-resize; }}
  .slider-handle::after {{ content: '⟷'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; background: white; color: #111; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }}
  .legend-table {{ width: 100%; max-width: 1200px; margin: 24px auto 0; border-collapse: collapse; font-size: 13px; }}
  .legend-table th, .legend-table td {{ padding: 10px 14px; border: 1px solid var(--border); text-align: left; }}
  .legend-table th {{ background: #121318; color: var(--text-secondary); }}
  .pin-badge {{ display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: white; text-align: center; line-height: 22px; font-weight: bold; font-size: 11px; }}
</style>
</head>
<body>
  <header>
    <h1><span>🔍</span> Design QC & Visual Diff Dashboard <span class="badge">Verified</span></h1>
    <div>Interactive Split-Screen & Marked Overlay</div>
  </header>

  <div class="tabs">
    {''.join(f'<button class="tab-btn {"active" if i==0 else ""}" onclick="switchSlide({i})">Slide {s["slide_num"]}</button>' for i, s in enumerate(slides_data))}
  </div>

  <div class="viewer-container">
    <div class="slider-wrapper" id="sliderWrapper">
      <img id="imgBefore" src="{slides_data[0]['before_path']}" alt="Before">
      <div class="img-after" id="imgAfterWrap">
        <img id="imgAfter" src="{slides_data[0]['marked_path']}" alt="After">
      </div>
      <div class="slider-handle" id="sliderHandle"></div>
    </div>

    <table class="legend-table" id="legendTable">
      <thead>
        <tr>
          <th style="width: 70px;">Pin</th>
          <th>Location / Cluster Coordinates</th>
          <th>Change Description</th>
        </tr>
      </thead>
      <tbody id="legendBody">
        {''.join(f'<tr><td><span class="pin-badge">{p["pin"]}</span></td><td>X: {p["box"][0]}, Y: {p["box"][1]} (Size: {p["width"]}x{p["height"]})</td><td>Visual / Text Modification Detected</td></tr>' for p in slides_data[0].get('manifest', []))}
      </tbody>
    </table>
  </div>

  <script>
    var slides = {json.dumps(slides_data)};
    var currentSlide = 0;
    
    var wrapper = document.getElementById('sliderWrapper');
    var afterWrap = document.getElementById('imgAfterWrap');
    var handle = document.getElementById('sliderHandle');
    var isDragging = false;

    function setSliderPos(x) {{
      var rect = wrapper.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      afterWrap.style.clipPath = `inset(0 0 0 ${{pct * 100}}%)`;
      handle.style.left = `${{pct * 100}}%`;
    }}

    setSliderPos(wrapper.getBoundingClientRect().left + wrapper.offsetWidth / 2);

    wrapper.addEventListener('mousedown', function(e) {{ isDragging = true; setSliderPos(e.clientX); }});
    window.addEventListener('mouseup', function() {{ isDragging = false; }});
    window.addEventListener('mousemove', function(e) {{ if (isDragging) setSliderPos(e.clientX); }});

    function switchSlide(idx) {{
      currentSlide = idx;
      document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx));
      var s = slides[idx];
      document.getElementById('imgBefore').src = s.before_path;
      document.getElementById('imgAfter').src = s.marked_path;
      
      var tb = document.getElementById('legendBody');
      tb.innerHTML = '';
      if (s.manifest) {{
        s.manifest.forEach(p => {{
          tb.innerHTML += `<tr><td><span class="pin-badge">${{p.pin}}</span></td><td>X: ${{p.box[0]}}, Y: ${{p.box[1]}} (${{p.width}}x${{p.height}})</td><td>Visual / Text Modification Detected</td></tr>`;
        }});
      }}
    }}
  </script>
</body>
</html>
"""
    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html)

def main():
    parser = argparse.ArgumentParser(description="Design QC Visual Difference Engine")
    parser.add_argument("--before", required=True, help="Path to Before image or directory")
    parser.add_argument("--after", required=True, help="Path to After image or directory")
    parser.add_argument("--mode", choices=["image", "marked", "all"], default="all", help="Diff comparison mode")
    parser.add_argument("--output", default="/tmp/qc_diff_output", help="Output directory")
    parser.add_argument("--threshold", type=int, default=20, help="Pixel difference threshold (0-255)")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    b_path = Path(args.before)
    a_path = Path(args.after)

    pairs = []
    if b_path.is_file() and a_path.is_file():
        pairs.append((b_path, a_path, "01"))
    elif b_path.is_dir() and a_path.is_dir():
        # Match files by slide number
        b_files = sorted(list(b_path.glob("*.png")))
        a_files = sorted(list(a_path.glob("*.png")))
        for bf in b_files:
            # find matching after file
            name = bf.name
            matching = [af for af in a_files if af.name == name or af.stem.split("_")[-1] == bf.stem.split("_")[-1]]
            if matching:
                pairs.append((bf, matching[0], bf.stem.split("_")[-1]))

    if not pairs:
        print("Error: No matching image pairs found.")
        sys.exit(1)

    print(f"Processing {len(pairs)} image pair(s)...")
    slides_data = []

    for bf, af, s_num in pairs:
        img_b = Image.open(bf)
        img_a = Image.open(af)

        # 1. Image Mode (Side-by-side)
        if args.mode in ("image", "all"):
            sbs = create_side_by_side(img_b, img_a, f"SLIDE {s_num} - SIDE-BY-SIDE COMPARISON")
            sbs_path = out_dir / f"sidebyside_slide_{s_num}.png"
            sbs.save(sbs_path)
            print(f"  ✓ Saved side-by-side image: {sbs_path}")

        # 2. Marked Mode (Diff boxes & callout pins)
        if args.mode in ("marked", "all"):
            boxes = compute_pixel_diff_boxes(img_b, img_a, threshold=args.threshold)
            marked, three_panel, manifest = create_marked_diff(img_b, img_a, boxes)
            
            marked_path = out_dir / f"marked_slide_{s_num}.png"
            three_panel_path = out_dir / f"3panel_slide_{s_num}.png"
            manifest_path = out_dir / f"manifest_slide_{s_num}.json"
            
            marked.save(marked_path)
            three_panel.save(three_panel_path)
            with open(manifest_path, "w") as mf:
                json.dump(manifest, mf, indent=2)
                
            print(f"  ✓ Slide {s_num}: Detected {len(boxes)} visual change zone(s).")
            print(f"  ✓ Saved marked diff: {marked_path}")
            print(f"  ✓ Saved 3-panel composite: {three_panel_path}")

            slides_data.append({
                "slide_num": s_num,
                "before_path": str(bf),
                "after_path": str(af),
                "marked_path": str(marked_path),
                "three_panel_path": str(three_panel_path),
                "manifest": manifest
            })

    # 3. Interactive HTML Dashboard
    html_path = out_dir / "index.html"
    generate_interactive_html(str(html_path), slides_data)
    print(f"  ✓ Generated interactive dashboard: {html_path}")
    print("\nVisual Difference processing complete!")

if __name__ == "__main__":
    main()
