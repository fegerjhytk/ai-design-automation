---
name: zigma-commercial-video-production
description: Production standards, animation workflows, ExtendScript expressions, and Foley sound design for high-conversion Zigma 9:16 mobile commercial product videos in Adobe After Effects. Covers dynamic 3D badge/pill callout systems (custom graphic per project), organic wave/buoyancy floating motion, multi-phase footage slicing, precomp transitions, full-spectrum sound design, and self-contained project packaging.
---

# Zigma 9:16 Commercial Video Production & Motion Standards

This skill documents the complete creative and technical production pipeline for high-converting **9:16 vertical (1080 × 1920)** mobile commercial product videos for Zigma in **Adobe After Effects 2026**.

---

## 1. Permanent Brand & Elements Library Repositories

All source assets, brand vectors, motion elements, and scripts are stored in standard cloud repositories:

* **Official Zigma Brand Assets**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Asect/
  ```
  - `Black Logo.ai` & `White Logo.ai`: Vector brand logos for light and dark backgrounds.
  - `ZIGMA LOGO.pdf`: Master vector emblem.
  - `Logo.psd`: Layered corner header swoosh banner (`Shape 1`, `Shape 1 copy`, `ZIGMA LOGO`).
  - `ZIGMA CIRCLE LOGO.png`: Circular product badge.

* **Central Elements & Motion Assets Library**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/After effect effect_assect/
  ```
  - `01_Plugins & Scripts/`: Flow, Deep Glow 2, Super Morphings, Shadow Studio 3.
  - `02_Transitions & Motion/`: Pan transitions, Zoom & Twirl, Chroma Splits, Light Leaks.
  - `04_Titles & Typography/`: Motion graphic typography templates, clean commercial fonts.
  - `05_Audio & SFX/`: Commercial soundtracks (Corporate, Funk, Hip-Hop) and cinematic Foley (Whooshes, Swooshes, Risers, Impacts).

* **Permanent Skills Directory**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/Script/Skill Antigravity/
  ```

---

## 2. Dynamic 3D Badge & Pill Container System

> [!IMPORTANT]
> **Container Graphic Changes Every Video**:
> The badge container asset is **never hardcoded**. Each product commercial will use a unique graphic asset suited to the product aesthetic (e.g. 3D holographic bubble/pill sticker, frosted glassmorphic card, metallic badge, or custom sticker container). Always inspect the project's supplied assets or design directory to identify the chosen badge asset.

### A. Intake & Placement
1. Import the chosen badge container graphic (e.g. PNG with alpha transparency) into the project `(Footage)` folder.
2. Add the badge layer directly beneath its corresponding feature callout text layer in the timeline.
3. Scale the badge to fit the text bounds (typically ~7% - 12% for high-res 4K PNG assets).
4. **Specular Highlight Mirroring**: If the badge asset has directional 3D reflections/highlights, mirror or flip horizontally/vertically via negative scale (e.g. `[-8%, -8%]`) to harmonize with the scene's lighting.

### B. Strict Parenting Architecture
* **The Rule**: The badge container graphic is **always parented to the text callout layer**:
  ```javascript
  badgeLayer.parent = textCalloutLayer;
  ```
* **Rationale**: Parenting binds the badge container to the text layer's spatial coordinates. Wherever the text moves, drifts, or animates, the badge automatically tracks with 100% precision.

### C. Spatial Composition (Negative-Space Balance)
* **Never Obscure the Product**: Scan each scene for the product silhouette, heating elements, handles, steam, or demonstrator actions.
* **Layout Patterns**:
  - **Single Callout**: Place in open lower-left (`X ≈ 310, Y ≈ 960`) or lower-right (`X ≈ 740, Y ≈ 880–1220`).
  - **Dual Staggered Callouts**: For scenes highlighting two distinct features, stagger one badge to the Left and one to the Right (e.g. Left at `[312, 962]`, Right at `[766, 1221]`).
  - **Sequential Callouts**: Animate entrances sequentially (e.g. Badge 1 enters at cut start; Badge 2 enters 1.5s - 1.8s later) so the viewer absorbs each feature cleanly.

---

## 3. Organic Wave & Buoyancy Motion Library (No Static Elements)

To eliminate visual stiffness and make badges and text feel buoyant, living, and dynamic, apply these battle-tested ExtendScript expressions across your layers.

### A. Badge Graphic Expressions (Child Layers)

1. **Position (Buoyant Floating Drift)**:
   ```javascript
   var t = Math.max(0, time - inPoint);
   var blend = Math.min(1.0, t / 0.4);
   var seed = index * 1.37;
   var xW = Math.sin(t * 2.1 + seed) * 4.0 * blend;
   var yW = Math.cos(t * 1.6 + seed) * 6.0 * blend;
   value + [xW, yW, 0];
   ```

2. **Rotation (Organic Liquid Sway)**:
   ```javascript
   var t = Math.max(0, time - inPoint);
   var blend = Math.min(1.0, t / 0.4);
   var seed = index * 0.95;
   value + Math.sin(t * 1.8 + seed) * 2.5 * blend;
   ```

3. **Scale (Volume Breathing — 2D Safe)**:
   > [!NOTE]
   > For 2D layers, scale is a 2-element array `[x, y]`. Using `value[2]` will cause an array out-of-bounds error. Use this formula to preserve negative-flip scaling:
   ```javascript
   var t = Math.max(0, time - inPoint);
   var blend = Math.min(1.0, t / 0.4);
   var seed = index * 1.1;
   var s = Math.sin(t * 2.3 + seed) * 0.02 * blend;
   [value[0] * (1 + s), value[1] * (1 + s)];
   ```

### B. Text Callout Expressions (Parent Layers)

* **Position (Gentle Float & Parallax Drift)**:
  ```javascript
  var t = Math.max(0, time - inPoint);
  var blend = Math.min(1.0, t / 0.4);
  var seed = index * 1.45;
  var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;
  var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;
  value + [xW, yW, 0];
  ```
  *Because the badge is parented to the text, the badge inherits this text float while adding its own secondary local wave, creating a luxurious parallax float.*

### C. Bottom CTA Button Pulse Expression

* **Scale (Rhythmic Breathing on `ORDER NOW` & `CTA_BUTTON_STROKE`)**:
  ```javascript
  var t = Math.max(0, time - inPoint);
  var blend = Math.min(1.0, t / 0.5);
  var s = Math.sin(t * 3.2) * 1.8 * blend;
  [value[0] + s, value[1] + s];
  ```

---

## 4. Multi-Phase Footage Slicing & Pacing

* **Fast Pacing**: Apply **`150% Stretch`** to footage cuts when a punchy, rapid-fire mobile commercial rhythm is required.
* **Contiguous Alignment**: Snap all cuts head-to-tail with **0 frame gaps and 0 overlaps**.
* **Micro-Feature Slicing (The Split-Cut Technique)**:
  - When a single video clip demonstrates multiple distinct product features (e.g. boiling surge transitioning into handle grip), **split the clip into two contiguous layers** (`Frame N` and `Frame N 2`).
  - Assign dedicated callout badges to each phase (e.g. Cut 4A: `Instant Heating`; Cut 4B: `Shockproof Handle`).
  - This delivers double the selling points without needing extra raw footage.

---

## 5. Motion Transitions & PreComp Architecture

* **Scene Cut Transitions**: Integrate dynamic pan transitions (e.g. `Pan Short` precomp, duration ~1.0s) between major scene changes (e.g. Cut 1 into Cut 2).
* **Climax-to-Outro Transition**:
  - Bridge the final pedestal product cut (Cut 7) into the white solid brand end-card using a **`Zoom & Twirl & Chroma Split & Shake`** precomp transition (active for ~1.8s).
  - Synchronize with a massive whoosh-to-hit SFX layer to deliver maximum impact.

---

## 6. Full-Spectrum 12-Track Audio & Foley Design Standard

> [!IMPORTANT]
> **Unique Music Track Every Video**: Never reuse the identical soundtrack across different products. Select an upbeat, high-energy track from the central library (`05_Audio & SFX/Music/`) matching the product category.

### Master Audio Setup:
1. **Master Music Bed**:
   - Offset start time slightly (e.g. `-0.77s`) to lock musical downbeats and drum drops directly to visual cuts.
   - Master volume: `-1.5 dB` across the showcase.
   - Smooth 3.5s exponential fade down to `-45 dB` entering the brand end-card (`24.00s – 27.80s`).

2. **10–12 Precision Foley & SFX Layers**:
   - **`SFX_01_Intro_Swoosh`**: Opening reveal cinematic swoosh (`-3.0 dB` to `-6.0 dB`).
   - **`SFX_02_Cut2_Swoosh` ... `SFX_CutN_Swoosh`**: Clean, fast whip swooshes on scene cuts (`-3.0 dB`).
   - **Product Action Foley**:
     - Steam hiss ambient loop with smooth volume fades (`-10.0 dB`) for thermal/steam shots.
     - Electric static / power hum (`-10.0 dB`) for shock guard, wiring, or safety features.
   - **Impact Punches**: Heavy impact hits (`-3.0 dB` to `-5.0 dB`) landing on rapid heating/boiling surge moments.
   - **Climax Riser**: Exponential bass riser (`Bass_riser.wav`) building tension during the final callout and CTA reveal (`20.50s – 24.20s`).
   - **Outro Whoosh-to-Hit**: Synchronized with the transition precomp (`-3.0 dB`).
   - **Sub-Bass Brand Mark Impact**: Deep resonant sub hit (`SFX_05_Cinematic_Sub_Outro.wav`, `-2.0 dB`) landing precisely on the white solid logo card.

---

## 7. Typography & The 3 Common Brand Elements

1. **Top Header Swoop Banner**:
   - `Logo` precomp containing white swoop container, accent flourish, and Zigma vector mark.
   - Anchored flush to the top edge, scaled ~75%. Persistent across product footage (`0:00 – 24.40s`).
2. **Bottom Center URL**:
   - `www.zigmaelectricals.com` (Helvetica-Bold, `32px`, tracking `40`, center-justified at `[540, 1845]`).
   - Styled with subtle drop shadow and Deep Glow 2 (Radius `35%`, Exposure `0.20`).
3. **End-Card Brand Outro**:
   - `White Solid 1` with centered vector logo mark `ASSET_ZIGMA_LOGO` (scaled to `52.7%` at `[540, 960]`) holding for 3.5s - 4.5s.
4. **General Copy Standards**:
   - **Max 2 Words Per Line**: Force stacked line breaks (`\r`) for quick mobile scanning.
   - **Deep Glow 2 Standard**: Always set Radius strictly to **`35` (35%)** and Exposure to `0.245`. Never use 70 or 100 to avoid blowing out typography.

---

## 8. Self-Contained Project Packaging & Dual Output Delivery

### A. Working Project Directory Architecture
All working project files must live in a self-contained folder under:
```text
/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Designs/<Year>/<Month>/<Project_Folder>/
├── <Project_Name>_v01.aep
├── <Project_Name>_v02.aep
└── (Footage)/
    ├── RAW Video Clips (1.mp4, 2.mp4...)
    ├── Badge Container Assets (PNG stickers/pills)
    ├── Audio & Foley SFX files
    └── Brand Vectors & Textures
```
*Never reference external files across temporary folders. Keep all dependencies inside `(Footage)` with **0 missing files**.*

### B. Dual Output Delivery
When rendering is approved:
1. **Local Master MP4**: Save high-bitrate render (H.264 @ 15 Mbps) in local project export directory.
2. **Google Drive Sync**: Copy final render directly to:
   ```text
   /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Output/<Comp_Name>.mp4
   ```

---

## 9. Core Operational Rules (Strict & Absolute)

1. **Preserve User Changes (MANDATORY EVERYTIME)**:
   - Always inspect the timeline first. Never overwrite, revert, or remove user-added layers, split text layers, custom in/out points, or transition precomps.
2. **No Automatic Background Renders**:
   - Never trigger `aerender` on draft edits. Keep the project open and active in After Effects. Render **only** when the user explicitly instructs: `"start"`, `"export"`, or `"render"`.
3. **Dynamic Badge Selection**:
   - Never assume the same badge asset for every project. The badge/pill graphic changes dynamically with each commercial.
4. **Canonical Skill Location**:
   - This skill and all future updates **must always reside in**:
     `/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/Script/Skill Antigravity/zigma-commercial-video-production/`
     with a symbolic link maintained in `~/.gemini/config/skills/`.
