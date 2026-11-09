---
name: zigma-start-opener-video
description: Standards, workflows, and permanent asset locations for Zigma After Effects commercial video start/opener sequences and product videos (Zigma-start/opener-video). Use whenever working on Zigma product videos, sourcing Zigma brand logos/graphics, or animating 9:16 vertical ads.
---

# Zigma Start / Opener Video Production & Brand Standards (Zigma-start/opener-video)

This skill documents the permanent asset library location, brand assets, timeline architecture, and creative production standards for all Zigma commercial video start/opener sequences and 9:16 vertical product videos in **Adobe After Effects 2026**.

---

## 1. Permanent Brand Assets Library Location

All official Zigma logos, vector marks, overlays, and brand graphics are stored in Google Drive at:

```text
/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Asect/
```

### Assets Catalog in this Directory:
* **`ZIGMA LOGO.pdf`**: Master vector brand logo (`1279 × 306`). Used for the signature **End-Card Brand Outro** (`ASSET_ZIGMA_LOGO`).
* **`Logo_place.psd`**: Layered corner header swoosh banner containing `Shape 1` (white swoosh), `Shape 1 copy` (red accent flourish), and `ZIGMA LOGO`. Anchored in the **top-left corner**.
* **`Black Logo.ai` / `Black Logo 2.ai`**: Vector black brand logo for light backgrounds.
* **`White Logo.ai`**: Vector white brand logo for dark backgrounds.
* **`Logo.png`**: High-resolution PNG logo with transparency.
* **`ZIGMA CIRCLE LOGO.png`**: Circular brand badge/emblem.
* **`minimal-soft-vintage-worn-out-surface-grainy-texture-overlay.jpg`**: Grain / film texture overlay.

---

## 1B. Permanent Elements & Motion Assets Library Location

All general After Effects motion assets, overlays, transitions, text presets, sound effects, and plugins are stored in the Shared Drive at:

```text
/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/After effect effect_assect/
```

### Library Catalog:
* **`01_Plugins & Scripts/`**: Flow, Deep Glow 2, Super Morphings, Shadow Studio 3, Plexus.
* **`02_Transitions & Motion/`**: 1500+ Transitions library, Massive Transitions Kit, Zoom & Twirl transitions.
* **`03_Overlays & Textures/`**: Crumpled Papers, Kraft Paper Loops, Grain / Surface Overlays.
* **`04_Titles & Typography/`**: Text Presets, MOGRTs, Fonts.
* **`05_Audio & SFX/`**: Commercial soundtracks (Corporate, Funk, Hip-Hop), Sound Effects (Foley, risers, impacts, whooshes, chimes, and `SFX_05_Cinematic_Sub_Outro.wav`).
* **`06_Templates & Projects/`**: Carousels, Social Media templates, Logo Reveals & Openers.
* **`Mocup/`**: High-resolution PSD product and packaging mockups.

---

## 2. The 3 Common Brand Elements (MANDATORY ACROSS ALL VIDEOS)

> [!CRITICAL]
> **NEVER FORGET THE END-CARD BRAND OUTRO**:
> Even when the user provides a scene-by-scene text script that only covers the product cuts (e.g. `0:00–0:10`), **the End-Card Brand Outro is ALWAYS MANDATORY**. The user's breakdown specifies the *footage showcase duration*. The composition must ALWAYS append the 3.0s – 3.5s White Solid logo outro to signal the end of the video.
>
> $$\text{Total Comp Duration} = (\text{Product Footage Showcase}) + (\text{3.0s – 3.5s Outro})$$

These 3 brand elements stay common and consistent across every product commercial:

### 1. Top-Left Corner Brand Header Swoop (`Logo_place.psd`)
* **Layer Name**: `Logo_place.psd` (or `Logo`).
* **Placement (STRICT)**: Anchored flush into the **Top-Left Corner** at **`Position ≈ [254, 63]`**, scaled **`62%` – `75%`**.
* **NEVER Center Horizontally**: Never place `Logo_place.psd` at `[540, Y]`. It is an asymmetrical corner swoop that must sit snugly in the upper-left margin.
* **In/Out Timing**: Active from **`0.00s`** up to the exact moment the footage ends (e.g. `15.00s`). It **must cut off when the White Solid appears** so it never bleeds onto the clean outro card.

### 2. Website URL at Bottom Center (`www.zigmaelectricals.com`)
* **Layer Name**: `www.zigmaelectricals.com` (or `TEXT_FOOTER_URL`).
* **Typography**: `Helvetica-Bold`, size **`32px`**, tracking **`40`**, Center-Justified (`ParagraphJustification.CENTER_JUSTIFY`).
* **Placement**: Centered at **`Position = [540, 1845]`**.
* **Styling**: Subtle Drop Shadow + Deep Glow 2 (Radius `35`, Exposure `0.20`).
* **In/Out Timing**: Active from **`0.00s`** up to the footage end. It **cuts off when the White Solid appears**.

### 3. End-Card Brand Logo Outro (`White Solid 1` + `ASSET_ZIGMA_LOGO`)
* **Duration**: Holds for **`3.0s – 3.5s`** at the very conclusion of the video.
* **Backdrop Layer (`White Solid 1`)**:
  - Pure `#FFFFFF` solid (`1080 × 1920`), centered at `[540, 960]`, scale `[100, 100]`.
  - InPoint: Start of outro (e.g. `15.00s`). OutPoint: Comp end (e.g. `18.50s`).
* **Vector Logo Mark (`ASSET_ZIGMA_LOGO`)**:
  - Source: `(Footage)/ZIGMA LOGO.pdf` (vector master mark).
  - Placement: Centered at **`Position = [540, 960]`**.
  - Scale: Exactly **`52.7%`** (produces ~674px width, leaving pristine ~203px margins).
  - Continuously Rasterize (`collapseTransformation = true`) enabled for razor-sharp vector rendering.
  - InPoint: Start of outro. OutPoint: Comp end.
* **Outro Foley SFX (`SFX_09_Sub_Brand_Outro`)**:
  - Source: `SFX_05_Cinematic_Sub_Outro.wav`.
  - Starts exactly when `White Solid 1` snaps on (e.g. `15.00s`), audio level set to **`-2.0 dB`**.

---

## 3. Footage Pacing & The 50% Stretch Instruction

* **Default Pacing**: 100% normal speed.
* **"Make all videos longer by 50%" / 150% Speed Stretch**:
  - Apply **`150% Stretch`** across all sliced video cuts (`Frame 1`, `Frame 2`... `Frame N`).
  - Example: A 10.0s 8-cut sequence becomes **15.0s** of footage.
  - Snap all cuts head-to-tail with **0 frame gaps and 0 overlaps**.
  - Proportionally stretch and retime all text kinetic animators, buoyant floating expressions, CTA button entrance, and Foley SFX.
  - The total composition duration becomes $15.0\text{s} + 3.5\text{s} = \mathbf{18.50\text{s}}$ (444 frames @ 24fps).

---

## 4. Timeline Layer Stacking Architecture (Top to Bottom)

To prevent visual occlusion and guarantee clean transitions, always structure the After Effects composition in this exact hierarchy:

| Index Range | Layer Type | Layer Name / Content | In / Out Time | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Top (1)** | Audio / AV | `SFX_09_Sub_Brand_Outro` | Outro Start → Comp End | Sub-bass impact on end-card (`-2.0 dB`) |
| **Top (2)** | AV Layer | `ASSET_ZIGMA_LOGO` | Outro Start → Comp End | Centered vector logo at `[540, 960]`, scale `52.7%` |
| **Top (3)** | Solid | `White Solid 1` | Outro Start → Comp End | `#FFFFFF` solid backdrop (1080 × 1920) |
| **4** | Text | `www.zigmaelectricals.com` | `0.00s` → Outro Start | Persistent bottom URL (`[540, 1845]`) |
| **5** | AV Layer | `Logo_place.psd` | `0.00s` → Outro Start | Top-left brand header swoop (`[254, 63]`, 62%) |
| **6** | Text | `Shop Now →` (or `Order Now`) | CTA Start → Outro Start | CTA button action copy (parented to BG) |
| **7** | Shape | `CTA_BUTTON_BG` | CTA Start → Outro Start | Rounded rectangle button in product accent |
| **8..N** | Text | Feature Callouts (`COMFORT.`, etc.) | Scene Start → Scene End | Stacked copy with word animators & buoyant drift |
| **N+1..M** | Video Cuts | `Frame 8`, `Frame 7` ... `Frame 1` | Contiguous intervals | Head-to-tail footage cuts (0 gap, 0 overlap) |
| **Audio** | Audio / AV | Foley Suite (`SFX_08` ... `SFX_01`) | Synchronized to cuts | Transition whooshes, risers, and chimes |
| **Bottom** | Audio / AV | `Music_Bed_...` | `0.00s` → Comp End | Soundtrack bed at `-3.0 dB` with outro fade |

---

## 5. Audio Design & Foley Balancing Standards

> [!IMPORTANT]
> **Unique Music Track Every Video**: Never reuse the same soundtrack across different products. Select an upbeat, high-energy groove from `05_Audio & SFX/` matching the product category.

### Audio Mixing Standard Levels:
1. **Master Music Bed**:
   - Master volume during product showcase: **`-3.0 dB`**.
   - Timing: Runs from `0.00s` to comp end.
   - Fade automation: Holds at `-3.0 dB` until ~0.2s before the outro, then executes a smooth **exponential fade down to `-45.0 dB`** at the comp end.
2. **Foley Suite Levels**:
   - **Intro Reveal Swoosh** (`WHOOSH 0.wav`): **`-4.0 dB`**.
   - **Cut Wipe Swooshes** (`14 Fast Whoosh B.wav`, `4 fast whooshes.wav`, `17 Simple_Whoosh.wav`): **`-5.0 dB` to `-6.0 dB`**.
   - **Climax Bass Riser / Hit** (`WHOOSH (RISE TO HIT).wav`): **`-4.0 dB`** (rising tension into final hero/dial cut).
   - **CTA Button Chime** (`Doorbell.wav`): **`-4.0 dB`** (lands precisely when CTA button scales in).
   - **Outro Sub-Bass Brand Impact** (`SFX_05_Cinematic_Sub_Outro.wav`): **`-2.0 dB`** (lands exactly on `White Solid 1`).

---

## 6. Typography, Kinetic Animation & Deep Glow Standards

* **Layer Naming Standard (MANDATORY)**:
  Every text layer **must be named after its exact copy** (e.g. `COMFORT.`, `WARMTH.`, `Safety Assurance`, `Cool Touch Body`, `Silent Operation`, `Long Cord`, `Built to last the season.`, `One dial. That's it.`). Never use generic names like `Text 1` or `Headline`.
* **Stacked Copy (Max 2 Words Per Line)**:
  Use line breaks (`\r`) so copy is easily readable on vertical mobile screens.
* **Kinetic Word-Based Animators (MANDATORY)**:
  - Text Animator > Range Selector > Advanced > **`Based On: Words`** (`ADBE Text Range Type2 = 3`).
  - Duration: `0.75s – 0.85s` (~20–24 frames).
  - Easing: Asymmetric luxury curve — Start Key (0%): `speed: 0, influence: 35%`; End Key (100%): `speed: 0, influence: 85%`.
  - Properties: Displacement `[0, 25, 0]` with optical blur `[20, 20]`.
* **Deep Glow 2 Standards (MANDATORY EVERYTIME)**:
  - **Always set Deep Glow 2 Radius strictly to `35` (or 35%)**.
  - **Exposure**: `0.245` on callouts; `0.20` on footer URL.
  - Never use 70 or 100 to prevent blinding over-bloomed text.
* **Buoyant Sinusoidal Drift Expression**:
  Apply to callout text positions to keep text living and floaty:
  ```javascript
  var t = Math.max(0, time - inPoint);
  var blend = Math.min(1.0, t / 0.4);
  var seed = index * 1.45;
  var xW = Math.cos(t * 1.4 + seed) * 2.5 * blend;
  var yW = Math.sin(t * 1.9 + seed) * 4.0 * blend;
  value + [xW, yW, 0];
  ```
* **CTA Button Rhythmic Breathing Expression**:
  Apply to CTA button shape scale:
  ```javascript
  var t = Math.max(0, time - inPoint);
  var blend = Math.min(1.0, t / 0.5);
  var s = Math.sin(t * 3.2) * 1.8 * blend;
  [value[0] + s, value[1] + s];
  ```

---

## 7. Directory Architecture & File Locations (MANDATORY TO ALWAYS REMEMBER)

* **Active Working Directory (DESKTOP ONLY)**: 
  ```text
  /Users/designdrop/Desktop/zigma/product/
  ```
  - **ALL working files MUST live here**: The active After Effects project file (`.aep`), the `(Footage)/` subfolder containing all video cuts, audio tracks, and copied brand assets.
  - **Never place working `.aep` files or raw footage directly in Google Drive**.
* **Permanent Skills Repository (SHARED DRIVE ONLY)**:
  ```text
  /Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/Script/Skill Antigravity/
  ```
  - ALL skills (`SKILL.md`, procedures, scripts) must permanently reside here, symlinked to `~/.gemini/config/skills/`.
* **Google Drive Role (Assets & Outputs ONLY)**:
  - **Brand Assets**: `/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Asect/`
  - **Final Render Deliverables**: `/Users/designdrop/Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/My Drive/Zigma/Output/<Comp_Name>.mp4`

---

## 8. Operational Rules & Lessons Learned (Strict & Absolute)

1. **Preserve User Changes (MANDATORY EVERYTIME)**:
   - Always inspect the timeline first before running modifying scripts.
   - Never overwrite, revert, or remove user adjustments (e.g. manual repositioning of `Logo_place.psd` to `[254, 63]`, fine-tuned text coordinates, custom audio mixing levels).
2. **Never Omit the End-Card Outro**:
   - Even if the user's prompt only lists the feature cuts, **ALWAYS append `White Solid 1` + `ASSET_ZIGMA_LOGO` + `SFX_09_Sub_Brand_Outro`** holding for 3.0s – 3.5s.
3. **No Automatic Background Renders**:
   - Keep the project open and active in After Effects. Never run background `aerender` unless explicitly instructed with: `"export"`, `"render"`, or `"start"`.
4. **Self-Contained Packaging**:
   - Collect all referenced footage, audio, and logo files into `(Footage)/` with **0 missing dependencies**.


