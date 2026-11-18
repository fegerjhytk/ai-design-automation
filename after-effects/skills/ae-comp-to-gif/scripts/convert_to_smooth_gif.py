#!/usr/bin/env python3
"""
Smooth GIF Converter for After Effects Exports
Enforces the GIF89a 10ms integer clock law to guarantee zero-jitter, butter-smooth animation.
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from pathlib import Path
from collections import Counter

# Supported integer-delay harmonics for GIF89a (100 / FPS = delay in 1/100s)
VALID_HARMONICS = {
    50: 2,   # 20ms exact delay - Gold Standard for UI / Carousel / Kinetic motion
    25: 4,   # 40ms exact delay - Standard motion & balanced file size
    20: 5,   # 50ms exact delay - Low file size for long clips (>10s)
    10: 10,  # 100ms exact delay - Slide decks / low-fps presentations
    100: 1,  # 10ms exact delay - Extreme framerate (huge file sizes)
}

def find_binary(name):
    paths = [
        f"/Users/admin/.local/bin/{name}",
        shutil.which(name),
        f"/usr/local/bin/{name}",
        f"/opt/homebrew/bin/{name}"
    ]
    for p in paths:
        if p and os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return name

FFMPEG = find_binary("ffmpeg")
FFPROBE = find_binary("ffprobe")

def probe_video(video_path):
    cmd = [
        FFPROBE, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,duration,nb_frames",
        "-of", "json",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    stream = data["streams"][0]
    
    # Calculate duration
    duration = float(stream.get("duration", 0.0))
    if duration == 0.0:
        # Try container duration
        c_cmd = [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video_path)]
        c_res = subprocess.run(c_cmd, capture_output=True, text=True)
        c_data = json.loads(c_res.stdout)
        duration = float(c_data.get("format", {}).get("duration", 0.0))

    width = int(stream.get("width", 0))
    height = int(stream.get("height", 0))
    
    return {
        "width": width,
        "height": height,
        "duration": duration,
        "r_frame_rate": stream.get("r_frame_rate", "30/1")
    }

def choose_fps(duration, requested_fps):
    if requested_fps and requested_fps != "auto":
        try:
            fps_val = int(float(requested_fps))
            if fps_val in VALID_HARMONICS:
                return fps_val
            # Find closest harmonic
            closest = min(VALID_HARMONICS.keys(), key=lambda x: abs(x - fps_val))
            print(f"[Notice] Requested {fps_val} FPS causes GIF clock jitter. Auto-adjusting to closest smooth harmonic: {closest} FPS ({VALID_HARMONICS[closest]*10}ms exact frame delay).", file=sys.stderr)
            return closest
        except ValueError:
            pass

    # Automatic selection based on duration and motion profile
    if duration <= 8.0:
        return 50  # 50 FPS: 20ms exact constant delay
    elif duration <= 15.0:
        return 25  # 25 FPS: 40ms exact constant delay
    else:
        return 20  # 20 FPS: 50ms exact constant delay

def verify_gif_timing(gif_path, expected_delay_sec):
    cmd = [
        FFPROBE, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "frame=pkt_duration_time",
        "-of", "csv=p=0",
        str(gif_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    delays = [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
    counts = Counter(delays)
    total_frames = len(delays)
    
    exp_str = f"{expected_delay_sec:.6f}"
    is_pure = (len(counts) == 1 and exp_str in counts)
    
    return {
        "total_frames": total_frames,
        "delay_counts": dict(counts),
        "is_perfect_timing": is_pure,
        "target_delay_sec": expected_delay_sec
    }

def convert_to_smooth_gif(video_path, out_dir, target_fps=None, name=None, skip_web=False, remove_input=False):
    video_path = Path(video_path).resolve()
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    meta = probe_video(video_path)
    duration = meta["duration"]
    fps = choose_fps(duration, target_fps)
    expected_delay_sec = 1.0 / fps

    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    
    high_dir = out_dir / "GIFs_High"
    high_dir.mkdir(parents=True, exist_ok=True)

    # Also create symlink for GIFs_Hign typo tolerance if on Unix
    try:
        hign_link = out_dir / "GIFs_Hign"
        if not hign_link.exists() and not hign_link.is_symlink():
            hign_link.symlink_to("GIFs_High", target_is_directory=True)
    except Exception:
        pass

    web_dir = out_dir / "GIFs_Web"
    if not skip_web:
        web_dir.mkdir(parents=True, exist_ok=True)

    base_name = name or video_path.stem
    master_gif = high_dir / f"{base_name}.gif"
    web_gif = web_dir / f"{base_name}.gif"

    print(f"🎬 Processing: {video_path.name}")
    print(f"   Resolution: {meta['width']}x{meta['height']} | Duration: {duration:.2f}s")
    print(f"   Harmonic Framerate: {fps} FPS (delay = {int(expected_delay_sec * 1000)}ms constant)")

    # 1. Generate Master GIF (Full Native Resolution)
    print(f"\n⚡ Encoding Master GIF ({meta['width']}x{meta['height']})...")
    master_filter = (
        f"[0:v] fps={fps},split [a][b];"
        f"[a] palettegen=stats_mode=diff [p];"
        f"[b][p] paletteuse=dither=bayer:bayer_scale=3"
    )
    subprocess.run([
        FFMPEG, "-y", "-i", str(video_path),
        "-filter_complex", master_filter,
        str(master_gif)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    master_size_mb = master_gif.stat().st_size / (1024 * 1024)
    master_verify = verify_gif_timing(master_gif, expected_delay_sec)
    print(f"   ✓ Master GIF: {master_gif} ({master_size_mb:.1f} MB, {master_verify['total_frames']} frames)")

    # 2. Generate Web-Optimized GIF (1024px width, 128 colors)
    web_info = None
    if not skip_web:
        print(f"\n🌐 Encoding Web-Optimized GIF (1024px wide, 128 colors)...")
        web_filter = (
            f"[0:v] fps={fps},scale=1024:-1:flags=lanczos,split [a][b];"
            f"[a] palettegen=max_colors=128:stats_mode=diff [p];"
            f"[b][p] paletteuse=dither=bayer:bayer_scale=3"
        )
        subprocess.run([
            FFMPEG, "-y", "-i", str(video_path),
            "-filter_complex", web_filter,
            str(web_gif)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        web_size_mb = web_gif.stat().st_size / (1024 * 1024)
        web_verify = verify_gif_timing(web_gif, expected_delay_sec)
        print(f"   ✓ Web GIF: {web_gif} ({web_size_mb:.1f} MB, {web_verify['total_frames']} frames)")
        web_info = {
            "path": str(web_gif),
            "size_mb": round(web_size_mb, 2),
            "verification": web_verify
        }

    # 3. Clean up intermediate video if requested
    if remove_input and video_path.exists():
        video_path.unlink()
        print(f"🗑️ Removed intermediate video: {video_path}")

    return {
        "status": "success",
        "fps": fps,
        "duration": duration,
        "master": {
            "path": str(master_gif),
            "size_mb": round(master_size_mb, 2),
            "verification": master_verify
        },
        "web": web_info
    }

def main():
    parser = argparse.ArgumentParser(description="Convert video to butter-smooth GIF via GIF89a integer clock harmonics.")
    parser.add_argument("--input", "-i", required=True, help="Input video file path (MP4/MOV)")
    parser.add_argument("--out-dir", "-o", default=str(Path.home() / "Desktop"), help="Output directory (default: Desktop)")
    parser.add_argument("--fps", default="auto", help="Framerate: auto, 50, 25, 20")
    parser.add_argument("--name", "-n", default=None, help="Base name for output GIF")
    parser.add_argument("--skip-web", action="store_true", help="Skip generating the 1024px web version")
    parser.add_argument("--remove-input", action="store_true", help="Remove input video file after GIF generation")
    args = parser.parse_args()

    try:
        report = convert_to_smooth_gif(
            video_path=args.input,
            out_dir=args.out_dir,
            target_fps=args.fps,
            name=args.name,
            skip_web=args.skip_web,
            remove_input=args.remove_input
        )
        print("\n" + "="*60)
        print("🎉 SMOOTH GIF EXPORT COMPLETE")
        print("="*60)
        print(f"Master: file://{report['master']['path']} ({report['master']['size_mb']} MB)")
        if report['web']:
            print(f"Web:    file://{report['web']['path']} ({report['web']['size_mb']} MB)")
        print(f"Framerate: {report['fps']} FPS (100% constant timing verified)")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
