# Phase 03 Context: After Effects Composition to Butter-Smooth GIF Skill (`ae-comp-to-gif`)

## Problem Statement
Exporting animations from Adobe After Effects to GIF format frequently results in visible stutter, micro-lag, broken loops, or massive unplayable files:

1. **GIF Centisecond Clock Quantization (Jitter):**
   - The GIF89a format specifies frame delay in integer units of $\frac{1}{100}\text{s}$ ($10\text{ ms}$).
   - Common video framerates cannot divide evenly into 10ms integers:
     - **24 FPS** requires $41.67\text{ ms}$ $\to$ Decoders alternate between **$40\text{ ms}$** and **$50\text{ ms}$**.
     - **60 FPS** requires $16.67\text{ ms}$ $\to$ Decoders alternate between **$10\text{ ms}$** and **$20\text{ ms}$**.
     - **30 FPS** requires $33.33\text{ ms}$ $\to$ Decoders alternate between **$30\text{ ms}$** and **$40\text{ ms}$**.
   - This delay oscillation produces uneven temporal cadence, perceived by viewers as stuttering, judder, or dropped frames.

2. **Sub-Composition & Layer Truncation:**
   - When a user increases composition duration (e.g. from 5s to 8s), child layers and nested pre-compositions often retain their old 5s `outPoint` and source duration.
   - Elements disappear mid-animation, turning blank or black for the remainder of the clip.

3. **Loop Seam Double-Frame Freezing:**
   - In looping carousel/slider animations where the end graphic aligns with the start graphic, placing the ending keyframe at the exact final frame index creates two identical frames (Frame $N-1$ and Frame $0$), causing an unnatural pause or hitch every loop cycle.

4. **Decoder Memory Exhaustion:**
   - High-resolution GIFs ($2048\times1446$) decompressing 250–400 frames require 3–5 GB of uncompressed RGBA pixel buffers in memory. Web browsers, Slack, and macOS QuickLook drop frames during playback due to CPU/GPU memory thrashing.

---

## Solution Architecture
Build and deploy the `ae-comp-to-gif` skill into `~/.gemini/config/skills/ae-comp-to-gif/`:

### 1. Framerate Harmonic Engine
Enforces the **GIF Integer Smoothness Law** ($100 / \text{FPS} \in \mathbb{Z}^+$):
* **50 FPS ($20.00\text{ ms}$ exact delay):** Gold standard for high-motion UI carousels, kinetic typography, and fluid sliders.
* **25 FPS ($40.00\text{ ms}$ exact delay):** Optimal for longer presentations (>8s) and cinematic motion with smaller file size.
* **20 FPS ($50.00\text{ ms}$ exact delay):** Optimal for slow transitions and presentation decks.
* Automatically evaluates comp duration and user preference to select the best harmonic.

### 2. ExtendScript Automation Core (`ae_exporter.jsx`)
* Inspects active or named compositions in Adobe After Effects 2026.
* Synchronizes comp framerate and duration.
* Recursively traverses all nested sub-compositions, extending their internal duration and layer `outPoint`s to guarantee complete graphical continuity.
* Adjusts linear looping keyframes to ensure constant motion velocity and seamless loop wraparound.
* Queues and renders clean H.264 intermediate video via AE Render Queue.

### 3. Two-Pass Palette & Dithering Engine (`smooth_gif_converter.py`)
* Analyzes the rendered video stream.
* Pass 1: Generates a custom 256-color palette with `stats_mode=diff` to prioritize moving vectors and crisp edges.
* Pass 2: Applies `paletteuse=dither=bayer:bayer_scale=3` to avoid banding while suppressing noise.

### 4. Dual-Tier Output System
* **Tier 1 (Master):** Full native resolution placed on Desktop (`/Users/admin/Desktop/<Comp>.gif`).
* **Tier 2 (Web Optimized):** Scaled to 1024px with 128 colors in `/Users/admin/Desktop/GIFs_Web/<Comp>.gif` for instant, lag-free web and client playback.

### 5. Automated Verification Gate
* Uses `ffprobe` to verify that 100% of packets possess the exact integer centisecond delay (`pkt_duration_time`), guaranteeing zero jitter before declaring success.
