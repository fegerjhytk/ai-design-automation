---
name: zigma-video-production
description: Unified Zigma After Effects commercial video and start/opener production skill. Covers permanent Zigma brand/SFX asset libraries, mandatory 3 common brand elements (top-left header swoop, bottom URL, 3.0-4.5s White Solid logo outro), dynamic 3D badge/pill callout parenting, buoyant sinusoidal expressions, kinetic word-based Text Animators, Deep Glow 2 standards, 150% stretch & split-cut pacing, 12-track Foley mixing, and self-contained packaging.
triggers:
  - "zigma video"
  - "zigma commercial"
  - "zigma opener"
  - "zigma start opener"
  - "zigma product video"
---

# Zigma Video Production & Opener Standards (`zigma-video-production`)

Unified production pipeline for **9:16 vertical (`1080 × 1920`)** Zigma commercial product videos and start/opener sequences in **Adobe After Effects**.

---

## 1. Permanent Brand & Motion Asset Libraries

* **Official Zigma Brand Assets**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Asect/
  ```
  - `ZIGMA LOGO.pdf` (`1279 × 306` master vector emblem for end-card `ASSET_ZIGMA_LOGO`)
  - `Logo_place.psd` (layered corner header swoosh banner: `Shape 1`, `Shape 1 copy`, `ZIGMA LOGO`)
  - `Black Logo.ai` / `Black Logo 2.ai`, `White Logo.ai`, `Logo.png`, `ZIGMA CIRCLE LOGO.png`
  - `minimal-soft-vintage-worn-out-surface-grainy-texture-overlay.jpg`

* **Central Elements & Motion Assets Library**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/After effect effect_assect/
  ```
  - `01_Plugins & Scripts/` (Flow, Deep Glow 2, Super Morphings, Shadow Studio 3, Plexus)
  - `02_Transitions & Motion/` (`Pan Short`, Zoom & Twirl, Chroma Splits, Light Leaks)
  - `04_Titles & Typography/` (Text Presets, MOGRTs, Fonts)
  - `05_Audio & SFX/` (Commercial soundtracks & Foley, including `SFX_05_Cinematic_Sub_Outro.wav`)
  - `06_Templates & Projects/` & `Mocup/`

*(See [AUDIO_SFX_MAP.md](references/AUDIO_SFX_MAP.md) and [EXPRESSIONS_REFERENCE.md](references/EXPRESSIONS_REFERENCE.md) for full asset maps and expression snippets.)*

---

## 2. The 3 Mandatory Common Brand Elements

> [!CRITICAL]
> **Never Omit the End-Card Brand Outro:** Even when a prompt only lists product footage cuts (e.g., `0:00–0:10`), always append the `3.0s – 4.5s` White Solid logo outro (`Total Comp Duration = Footage Showcase + Outro`).

1. **Top-Left Corner Brand Header Swoop (`Logo_place.psd` / `Logo`):**
   - Anchor flush to top-left at **`Position ≈ [254, 63]`**, scale **`62% – 75%`** (never center horizontally).
   - Active from `0.00s` until footage ends; cuts off cleanly when `White Solid 1` appears.
2. **Bottom Center URL (`www.zigmaelectricals.com` / `TEXT_FOOTER_URL`):**
   - `Helvetica-Bold`, `32px`, tracking `40`, center-justified at **`[540, 1845]`**, subtle Drop Shadow + Deep Glow 2 (`Radius 35`, `Exposure 0.20`).
   - Cuts off cleanly when `White Solid 1` appears.
3. **End-Card Brand Outro (`White Solid 1` + `ASSET_ZIGMA_LOGO` + `SFX_09_Sub_Brand_Outro`):**
   - Pure `#FFFFFF` solid (`1080 × 1920`) at `[540, 960]` for **`3.0s – 4.5s`**.
   - `(Footage)/ZIGMA LOGO.pdf` centered at `[540, 960]`, scale **`52.7%`**, `collapseTransformation = true`.
   - `SFX_05_Cinematic_Sub_Outro.wav` at **`-2.0 dB`** landing on the first frame of `White Solid 1`.

---

## 3. Dynamic 3D Badge & Callout System

* **Dynamic Container Asset:** Never hardcode the badge graphic; inspect project assets to pick the matching PNG sticker/pill/card.
* **Strict Parenting:** Place the badge directly beneath its callout text layer and parent it (`badgeLayer.parent = textCalloutLayer`). Mirror directional highlights via negative scale (`[-8%, -8%]`) if needed.
* **Negative-Space Balance:** Never cover the product silhouette or action. Stagger dual callouts (`~[312, 962]` left vs `~[766, 1221]` right) and animate entrances `1.5s – 1.8s` apart.
* **Typography & Glow Standards:** Name every text layer after its exact copy; limit stacked lines to **max 2 words per line** (`\r`); use kinetic word-based animators (`Based On: Words`, `ADBE Text Range Type2 = 3`, `0.75s–0.85s`, asymmetric `35% / 85%` ease, `[0, 25, 0]` offset, `[20, 20]` blur); strictly set **Deep Glow 2 Radius = `35`**, **Exposure = `0.245`** (`0.20` on URL).

---

## 4. Buoyant Motion Expressions & Footage Pacing

* **Buoyant Drift & Sway (No Static Layers):** Apply sinusoidal `Math.sin` / `Math.cos` position, rotation, and 2D-safe scale breathing expressions (`[value[0] * (1 + s), value[1] * (1 + s)]`, never `value[2]` on 2D layers) to callouts, badges, and CTA buttons (`scripts/apply_wave_buoyancy.jsx`).
* **Pacing & Split-Cuts:** Default `100%` normal speed; use **`150% Stretch`** when instructed (`"make all videos longer by 50%"`), snapping cuts head-to-tail with **0 gaps / 0 overlaps**. Use split-cut layers (`Frame N`, `Frame N 2`) to highlight two features from one continuous clip.
* **Transitions:** `Pan Short` (`~1.0s`) between scene cuts and `Zoom & Twirl & Chroma Split & Shake` (`~1.8s`) bridging into the white end-card.

---

## 5. Layer Hierarchy & 12-Track Audio Mix

1. **Stacking Order (Top → Bottom):** `SFX_09_Sub_Brand_Outro` → `ASSET_ZIGMA_LOGO` → `White Solid 1` → `www.zigmaelectricals.com` → `Logo_place.psd` → `Order Now / Shop Now` CTA + `CTA_BUTTON_BG` → Feature Callouts & Parented Badges → Video Cuts (`Frame N..1`) → Foley SFX (`SFX_08..01`) → `Music_Bed`.
2. **Audio Levels:** Unique upbeat track per video (`-1.5 dB` to `-3.0 dB`, exponential fade to `-45.0 dB` over the outro), intro swoosh (`-3` to `-6 dB`), cut swooshes (`-3` to `-6 dB`), action Foley (`-10 dB`), climax riser (`-4 dB`), CTA chime (`-4 dB`), outro sub-hit (`-2 dB`).

---

## 6. Packaging, Scripts & Operational Rules

* **Self-Contained `(Footage)/` Folder:** Keep `.aep` and `(Footage)/` together (Desktop `/Users/designdrop/Desktop/zigma/product/` or Zigma `Designs/<Year>/<Month>/<Project>/`) with **0 missing files**.
* **Included ExtendScripts (`scripts/`):** `add_white_solid_outro.jsx`, `adjust_text_and_sfx.jsx`, `apply_wave_buoyancy.jsx`, `build_quartz_heater_comp.jsx`, `build_slide_by_slide_comp.jsx`, `build_timeline_layered_comp.jsx`, `build_white_fan_opener_comp.jsx`, `create_compare_side_by_side_comp.jsx`, `create_new_opener_comps.jsx`, `cut_all_white_fan_frame_by_frame.jsx`, `reorder_layers.jsx`, `verify_comp_expressions.jsx`.
* **Core Rules:**
  1. **Preserve User Edits:** Always inspect the live AE timeline before modifying; never overwrite manual positions, split layers, or audio levels.
  2. **No Automatic Background Renders:** Keep the project open in After Effects; run `aerender` / final MP4 export (with optional Google Drive `Zigma/Output/` copy) **only** when explicitly told `"start"`, `"export"`, or `"render"`.
