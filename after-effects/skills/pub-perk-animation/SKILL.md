---
name: pub-perk-animation
description: >-
  Automates professional 10-second motion graphics animations in Adobe After Effects from
  Adobe Illustrator (.ai) files. Implements a 4-step product choreography (Bottle -> Badge -> Title on Bottle -> Bottom PriceTag),
  continuous rotating background stars, smooth 85% cubic-bezier easing, an active 0-9s timeline with a 1s static hold,
  and headless ExtendScript automation without video rendering.
triggers:
  - "pub perk animation"
  - "pub perks animation"
  - "pub peark animation"
  - "/pub-perk-animation"
  - "animate in after effects"
  - "animate illustrator file"
  - "ae animation"
  - "make animation"
  - "drink specials animation"
---

# Pub Perk Animation Skill (`pub-perk-animation`)

This skill automates the complete pipeline from a multi-offer Adobe Illustrator design (`.ai`) to an animated Adobe After Effects project (`.aep`).

---

## 1. Safety & Architecture Rules

1. **Read-Only Master Files**:
   - Master files (e.g. in Google Drive or shared network drives) must NEVER be modified directly.
   - Files are automatically duplicated to `~/Desktop/<Filename>.ai` before unpacking or processing.
2. **No Video Exporting / Rendering (Keep Project Open)**:
   - The skill creates, arranges, animates, and saves `.aep` project files directly.
   - Do NOT render or export video (`.mp4`, `.mov`) unless explicitly requested by the user.
   - When complete, keep the active project open in After Effects so the user can immediately preview and edit.
3. **Asset Staging in Dedicated Footage Folder (NO Shortcut / Symlink Folders)**:
   - Unpacked Illustrator files (`<Filename>_Unpacked.ai`) must strictly be placed inside a real physical `Fotage` (or `Footage`) folder inside the project directory, never in the root folder.
   - **STRICT MANDATORY RULE — NO SHORTCUT / SYMLINK FOLDERS**: Never create shortcut folders, aliases, or symlinks for Footage (e.g. NEVER symlink `Footage -> Fotage` or vice versa). Do NOT create shortcut/alias folders in the project directory. Use a real directory directly without aliases.
4. **Multi-Software Coordination**:
   - When using 2 or more creative tools (Illustrator + After Effects), keep them open while working and active upon completion.
5. **Timeline Duration Rules**:
   - **Total Comp Duration**: Exactly **10.0 seconds** at **30.0 fps** (300 frames).
   - **Active Animation**: Occurs strictly between **$0.0\text{s}$ and $9.0\text{s}$** (frames 0 to 270).
   - **Static Hold**: Strict **$1.0\text{s}$ static hold** between **$9.0\text{s}$ and $10.0\text{s}$** (frames 270 to 300, zero keyframes on content layers, allowing viewers to absorb the final design).
   - **Comp Renderer**: Set to Classic 3D (`comp.renderer = "ADBE Advanced 3d"`), enabling 2D motion blur and 3D folding transforms simultaneously.
6. **Preserve User Edits Inside the Animation (Strict Invariant)**:
   - **ALWAYS preserve and respect any changes, edits, or manual adjustments made by the user inside the animation or Illustrator artwork**, even while you are actively working on other tasks or layers.
   - **NEVER** revert, wipe, reset, or overwrite the user's manual keyframes, timing shifts, layer modifications, custom easings, scale/position adjustments, or font choices unless the user explicitly orders you to change that specific element.
   - All automated updates must be non-destructive and surgical: only touch the exact target element requested by the user, leaving every other user edit completely intact.

---

## 2. Motion Choreography Standards (30.0 fps Frame-Locked)

### Header Sequence ($0.17\text{s}$ – $1.50\text{s}$)
- **`Header_Logo`**: 80px drop from $Y - 80\text{px} \rightarrow Y$ starting at frame 5 (f5–f21 = $0.167\text{s}$–$0.700\text{s}$, Ease-In 60% / Ease-Out 85%) + opacity fade (f5–f17).
- **`Header_Title`**: Unified drop with both campaign title and "specials" at frame 17 (f17–f33 = $0.567\text{s}$–$1.100\text{s}$, Ease-In 60% / Ease-Out 85%) + opacity fade (f17–f29).
- **`BG_Disclaimer`** (*"18+ only"*): Horizontal slide from left at frame 27 (f27–f45 = $0.900\text{s}$–$1.500\text{s}$, Ease-In 60% / Ease-Out 85%) + opacity fade (f27–f40).
- **`Header_Specials`**: Static outer border frame (no keyframes).

### 4-Step Product Choreography (Per Offer)
Offers are staggered along the timeline:
- **`Offer1`**: starts at Frame 40 ($1.333\text{s}$)
- **`Offer2`**: starts at Frame 90 ($3.000\text{s}$)
- **`Offer3`**: starts at Frame 140 ($4.667\text{s}$)

For each offer item (`OfferN`):
1. **Bottle / Product (`OfferN_Product`)**:
   - Scale up from 92% to 100% over 15 frames ($0.50\text{s}$ duration) with Ease-In 60% to Ease-Out 85%.
   - Opacity fade from 0% to 100% (15 frames).
2. **Circle with Rate (`OfferN_Badge`)**:
   - Starts $+11$ frames after product.
   - Pop-scale bounce: 0% $\rightarrow$ 108% (9 frames) $\rightarrow$ 100% (6 frames, total 15 frames) with Ease-Bounce 45%.
   - Opacity fade from 0% to 100% (8 frames).
3. **Name with Shape Placed on Bottle (`OfferN_Title`)**:
   - Starts $+21$ frames after product.
   - Horizontal slide in from $\pm 80\text{px}$ offset to final resting position over 18 frames ($0.60\text{s}$ duration, Ease-In 60% / Ease-Out 85%).
   - Opacity fade from 0% to 100% (14 frames).
   - Sits in front of the bottle in the layer stack.
4. **Bottom Text / Price Tag (`OfferN_PriceTag`)**:
   - Starts $+33$ frames after product.
   - 3D fold-down flap on X-axis: $-90^\circ \rightarrow +16^\circ$ (10 frames) $\rightarrow -6^\circ$ (5 frames) $\rightarrow 0^\circ$ (5 frames, total 20 frames / $0.67\text{s}$ duration).
   - Opacity fade from 0% to 100% (7 frames).

### Callout Box (`Offer4`) ($6.30\text{s}$ – $9.00\text{s}$ / Frames 189–270)
- **`Offer4_Base`**: Slide in from bottom-left/bottom at frame 189 ($6.30\text{s} \rightarrow 6.90\text{s}$ / f189–f207) + opacity fade (f189–f200).
- **`Offer4_Text`**: Opacity fade in at frame 200 ($6.67\text{s} \rightarrow 7.00\text{s}$ / f200–f210).
- **`Offer4_PriceTag`**: 3D fold-down flap on X-axis at frame 208 ($6.93\text{s} \rightarrow 7.60\text{s}$ / f208–f228), followed by a subtle attention pulse (f228 $\rightarrow$ f246 $\rightarrow$ f258 $\rightarrow$ f270) settling at 100% scale cleanly at frame 270 ($9.00\text{s}$).

### CTA Button (`CTA_Button`, Square Ad Placement)
- For square ad placements featuring a **`BOOK YOUR TABLE`** pill button:
- Pop-in bounce at frame 215 ($7.17\text{s}$): scale 0% $\rightarrow$ 108% (f226) $\rightarrow$ 100% (f234 = $7.80\text{s}$) + opacity fade (f215–f223).
- Attention pulse: f248 ($100\%$) $\rightarrow$ f258 ($105\%$) $\rightarrow$ f266 ($100\%$), settling cleanly at frame 266 ($8.87\text{s}$) before the 9.0s static hold.

### Background Elements ($0.0\text{s}$ – $10.0\text{s}$ / Frames 0–300)
- **`BG_Base`, `BG`, `BG_Border`, `Header_Specials`**: Static throughout 10.0s.
- **`BG_Stars_*` / `BG_Star_*` (Separated Star Groups & Center-Anchor Rotation)**:
  - If background stars are grouped together under a clipping mask in Illustrator, release the clipping mask (`clipped = false`), remove the clipping path, and split into separate top-level layers (`BG_Stars_1` for Top-Left, `BG_Stars_2` for Bottom-Right).
  - In After Effects, import as `COMP_CROPPED_LAYERS` so each star's Anchor Point is placed at its geometric center, enabling clean in-place rotation without orbiting across the screen.
  - Stacked directly above `BG_Base`.
  - Continuous linear rotation across all 300 frames ($0.0\text{s} - 10.0\text{s}$), alternating clockwise ($0^\circ \to +180^\circ$) and counter-clockwise ($0^\circ \to -180^\circ$).
  - Smooth 0.5s opacity fade-in ($0\% \to 100\%$, frames 0–15).
  - Motion blur enabled (`motionBlur = true`) on each star layer.


---

## 3. Automation Usage

Run directly via the CLI runner or have the agent execute it:

```bash
# Animate an Illustrator file end-to-end:
node ~/.gemini/config/skills/pub-perk-animation/scripts/cli_animator.js --file ~/Desktop/MyDesign.ai

# Or with custom AEP output path:
node ~/.gemini/config/skills/pub-perk-animation/scripts/cli_animator.js --file ~/Desktop/MyDesign.ai --output ~/Desktop/FinalAnimation.aep
```

### Script Components:
- **`unpack_illustrator.jsx`**: Unpacks Illustrator artwork into discrete named layers with `pdfCompatible = true`.
- **`build_ae_animation.jsx`**: Headless ExtendScript importing `.ai` into After Effects as `COMP_CROPPED_LAYERS` and building all keyframes and easing curves.
- **`verify_ae_comp.jsx`**: Automated verification test inspecting all keyframes, duration, motion blur, and confirming the 1.0s static hold.
