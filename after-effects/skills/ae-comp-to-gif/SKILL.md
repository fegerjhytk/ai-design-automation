---
name: ae-comp-to-gif
description: "Converts Adobe After Effects compositions to butter-smooth, non-lagging GIFs with automatic framerate harmonic selection (50/25/20 FPS), subcomp duration synchronization, seamless loop protection, two-pass differential palette optimization, and dual master/web deliverable generation."
---

# After Effects Composition to Butter-Smooth GIF Skill (`ae-comp-to-gif`)

This skill automates the complete pipeline for exporting Adobe After Effects compositions into butter-smooth, zero-jitter GIFs. It eliminates the root causes of GIF lag by strictly enforcing the GIF89a centisecond integer clock law, synchronizing nested pre-compositions, aligning looping keyframes, and encoding with two-pass differential color palettes.

---

## The Mathematics of GIF Smoothness

### The GIF89a Centisecond Clock Rule
In the GIF89a specification, frame delays are stored as 16-bit integers in units of **hundredths of a second** ($\frac{1}{100}\text{s} = 10\text{ ms}$).

$$\text{Frame Delay (centiseconds)} = \frac{100}{\text{FPS}}$$

If $\frac{100}{\text{FPS}}$ is **not an integer**, encoders and decoders are forced to alternate delay values across adjacent frames:
* **24 FPS:** $100 / 24 = 4.167\text{ cs}$ $\to$ Decoders alternate between **$40\text{ ms}$** and **$50\text{ ms}$** (cadence shudder / micro-lag).
* **60 FPS:** $100 / 60 = 1.667\text{ cs}$ $\to$ Decoders alternate between **$10\text{ ms}$** and **$20\text{ ms}$** (frame pacing jitter).
* **30 FPS:** $100 / 30 = 3.333\text{ cs}$ $\to$ Decoders alternate between **$30\text{ ms}$** and **$40\text{ ms}$**.

### Valid Zero-Jitter Harmonics
| Framerate | Exact Delay | Best Use Case |
|---|---|---|
| **50 FPS** | **$20.00\text{ ms}$ (2 cs)** | **Gold Standard:** High-motion UI, carousel sliders, kinetic typography |
| **25 FPS** | **$40.00\text{ ms}$ (4 cs)** | Standard motion, presentations, durations > 8s with controlled file size |
| **20 FPS** | **$50.00\text{ ms}$ (5 cs)** | Slower UI transitions, long clips (>12s) |
| **10 FPS** | **$100.00\text{ ms}$ (10 cs)** | Slide decks, static step-by-step walkthroughs |

---

## Core Capabilities

1. **Automatic Harmonic Selection (`--fps auto`):**
   * Clips $\le 8.0\text{s}$: Automatically selects **50 FPS** for maximum fluid motion.
   * Clips $8.0\text{s} - 15.0\text{s}$: Selects **25 FPS** to keep file sizes under 40 MB while maintaining constant delay.
   * Clips $> 15.0\text{s}$: Selects **20 FPS** for low memory consumption.
   * Detects non-harmonic requests (like 60 FPS or 24 FPS) and remaps to the closest jitter-free harmonic.

2. **Recursive Sub-Composition Synchronization:**
   * When modifying comp duration (e.g., extending from 5s to 8s), the ExtendScript core automatically traverses all nested pre-comps (`CompItem` sources) and layers, extending their `inPoint = 0` and `outPoint = newDuration`. No layers cut off or turn black mid-animation.

3. **Loop Seam Protection:**
   * Identifies linear controller nulls and ensures keyframe 2 is anchored at $t = \text{duration}$.
   * Frame $N-1$ wraps around to Frame 0 with identical constant velocity delta ($\Delta y / \text{frame}$), preventing double-frame freezes or pauses at the loop seam.

4. **Two-Pass Differential Palette Generation:**
   * Pass 1: `palettegen=stats_mode=diff` prioritizes fast-moving vectors and sharp text over static background pixels.
   * Pass 2: `paletteuse=dither=bayer:bayer_scale=3` eliminates color banding on gradients while preventing noisy high-frequency dithering artifacts.

5. **Dual-Tier Output Folders Inside `Output/` Directory:**
   * **Automatic Output Destination:** Defaults to the `Output/` folder directly beside your `.aep` project file (`<ProjectFolder>/Output/`).
   * **`Output/GIFs_High/`:** Stores the master full-resolution GIF at 100% native resolution (e.g. 2048×1446) with 50/25 FPS constant frame delays.
   * **`Output/GIFs_Web/`:** Stores the web-optimized GIF (scaled to 1024px width, 128 colors) for instant, lag-free loading in browsers, Slack, and presentations.
   * **Automatic MP4 Cleanup:** Automatically deletes the intermediate rendered `.mp4` video upon completion, leaving only the clean GIF deliverables in both folders.

6. **Automated `ffprobe` Timing Verification:**
   * Audits `pkt_duration_time` across every frame to mathematically verify 0 variance.

---

## Command Reference

### End-to-End Pipeline (AE $\to$ Render $\to$ Smooth GIF)
```bash
# Automatically exports to <ProjectDir>/Output/ and removes intermediate MP4
/Users/admin/.gemini/config/skills/ae-comp-to-gif/scripts/ae_to_gif.sh \
  --comp "Slide 10" \
  --duration 8 \
  --fps auto
```

### Options
* `--comp, -c <name>`: Target After Effects composition name (case-insensitive).
* `--duration, -d <seconds>`: Target duration (e.g. `8`). Automatically extends sub-comps.
* `--fps, -f <auto|50|25|20>`: Target framerate harmonic (default: `auto`).
* `--out, -o <dir>`: Custom output directory (optional, defaults to `Output/` beside `.aep` file).
* `--skip-web`: Skip creating the 1024px companion web version.
* `--out, -o <dir>`: Output directory (default: `$HOME/Desktop`).
* `--skip-web`: Skip creating the 1024px companion web version.
