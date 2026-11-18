---
name: audio-video-sync-workflow
description: End-to-end audio-to-video synchronization pipeline for animated videos, kinetic typography, lyric reels, and music visualizers using HyperFrames, GSAP, Whisper, Demucs, and Lemo-Opuscar styles. Integrates directly with the user's autonomous AI design workflow.
---

# Audio-to-Video Synchronization Workflow (AI Design Engine)

This skill formalizes the verified, 100% code-driven pipeline for synchronizing music, speech narration, and vocal tracks with motion graphics, kinetic typography, and visual effects.

---

## 🏗️ The 4-Stage Sync Pipeline

```
[ Stage 1: Audio Dissection ] ──► [ Stage 2: Kinetic Composition ] ──► [ Stage 3: Frame Capture ] ──► [ Stage 4: Master MP4 ]
  - Demucs Vocal Isolation          - HTML5 / CSS3 Canvas                - Headless Chrome 60 FPS         - FFmpeg H.264
  - Whisper Word Timestamps         - GSAP Timeline Curves               - Deterministic Frame Seek       - Merged Uncompressed Audio
  - Librosa Beat Detection          - 66 Lemo-Opuscar Styles             - Zero Stutter Guarantee         - Ready to Post
```

---

## Stage 1: Audio Ingestion & Beat Alignment

1. **Vocal Stem Separation (Optional for dense tracks)**:
   ```bash
   ~/video-tools/bin/python -m demucs.separate --two-stems=vocals <audio_file>
   ```
2. **Word-Level Timestamping**:
   - Transcribe vocals into millisecond-accurate word arrays via `whisper-cli` or `hyperframes transcribe`:
     ```json
     [
       { "word": "headline", "start": 0.50, "end": 1.10 },
       { "word": "offer",    "start": 1.15, "end": 1.85 }
     ]
     ```
3. **Musical Beat Tracking**:
   - Detect downbeats, kick hits, and tempo (BPM) with `librosa` in `~/video-tools` or `npx hyperframes beats`.

---

## Stage 2: Code Composition & Visual Styling

1. **Resolution & Aspect Ratio**:
   - **Vertical Reels (9:16)**: `1080 x 1920` (Instagram Reels, YouTube Shorts, TikTok)
   - **Widescreen (16:9)**: `1920 x 1080` (YouTube, Commercials, Landscape)
   - **Square (1:1)**: `1080 x 1080` (Feed Ads)

2. **HyperFrames Contract**:
   - Root wrapper: `<div id="root" data-composition-id="main" data-start="0" data-duration="<len>" data-width="1080" data-height="1920">`
   - Audio tag: `<audio id="audio-main" src="assets/audio.mp3" data-start="0" data-duration="<len>"></audio>`
   - Timed clips: Every animated text or graphic element must have `class="clip"`, `data-start`, and `data-duration`.

3. **Motion Physics & Animation Curves**:
   - **Entrance**: `tl.fromTo(element, { opacity: 0, scale: 0.75, filter: "blur(12px)" }, { opacity: 1, scale: 1.0, filter: "blur(0px)", duration: 0.16, ease: "power4.out" }, word.start)`
   - **Hold & Float**: Subtle drift (`scale: 1.06`) over the duration of the sung word.
   - **Exit**: Fast dissolve snap before the next word starts.
   - **Drum Flashes**: Opacity pulses on `#flash` timed to beat transients.

4. **Visual Treatments & Shaders**:
   - High-contrast text inversion via `mix-blend-mode: difference;`
   - Procedural SVG film grain overlay (`<feTurbulence baseFrequency="0.75" />`)
   - Evolving multi-phase duotone ambient lighting (Sapphire $\to$ Amethyst $\to$ Crimson $\to$ Emerald).

---

## Stage 3: Headless Frame-by-Frame Capture

1. **Pre-Render Validation**:
   ```bash
   npx hyperframes check --json
   ```
2. **Deterministic Frame Capture**:
   - Renders each frame while the timeline is paused. Complex 3D shaders, blur filters, and multiple text layers will never drop frames or stutter.

---

## Stage 4: FFmpeg Encoding & Delivery

1. **Compile Master Video**:
   ```bash
   npx hyperframes render -o <output_path.mp4>
   ```
2. **Delivery**:
   - Output directly to the user's project directory or `/Users/admin/Desktop/`.
   - Provide clickable file links (`file:///Users/admin/Desktop/...`) and preview snapshots.
