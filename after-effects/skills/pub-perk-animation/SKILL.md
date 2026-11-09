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
2. **No Video Exporting / Rendering**:
   - The skill creates, arranges, animates, and saves `.aep` project files directly.
   - Do NOT render or export video (`.mp4`, `.mov`) unless explicitly requested by the user.
3. **Timeline Duration Rules**:
   - **Total Comp Duration**: Exactly **10.0 seconds** at **24 fps** (240 frames).
   - **Active Animation**: Occurs strictly between **$0.0\text{s}$ and $9.0\text{s}$**.
   - **Static Hold**: Strict **$1.0\text{s}$ static hold** between **$9.0\text{s}$ and $10.0\text{s}$** (zero keyframes on content layers, allowing viewers to absorb the final design).

---

## 2. Motion Choreography Standards

### Header Sequence ($0.20\text{s}$ – $1.30\text{s}$)
- **`Header_Logo`**: 80px drop from above ($0.20\text{s} \rightarrow 0.75\text{s}$) + opacity fade ($0.20\text{s} \rightarrow 0.60\text{s}$).
- **`Header_Title`**: 80px drop from above ($0.50\text{s} \rightarrow 1.05\text{s}$) + opacity fade ($0.50\text{s} \rightarrow 0.90\text{s}$).
- **`Header_Specials`**: 80px drop from above ($0.75\text{s} \rightarrow 1.30\text{s}$) + opacity fade ($0.75\text{s} \rightarrow 1.15\text{s}$).

### 4-Step Product Choreography (Per Offer)
For each offer item (e.g. `Offer1`, `Offer2`, `Offer3`), animations are staggered in a 4-step sequence:
1. **Bottle / Product (`OfferN_Product`)**:
   - Scale up from 92% to 100% ($0.50\text{s}$ duration) with Ease-In 60% to Ease-Out 85%.
   - Opacity fade from 0% to 100%.
2. **Circle with Rate (`OfferN_Badge`)**:
   - Starts $+0.35\text{s}$ after product.
   - Pop-scale bounce: 0% $\rightarrow$ 108% (at $+0.30\text{s}$) $\rightarrow$ 100% (at $+0.50\text{s}$) with Ease-Bounce 45%.
   - Opacity fade from 0% to 100%.
3. **Name with Shape Placed on Bottle (`OfferN_Title`)**:
   - Starts $+0.70\text{s}$ after product.
   - Horizontal slide in from $\pm 80\text{px}$ offset to final resting position ($0.60\text{s}$ duration).
   - Sits in front of the bottle in the layer stack.
4. **Bottom Text / Price Tag (`OfferN_PriceTag`)**:
   - Starts $+1.10\text{s}$ after product.
   - 3D fold-down flap on X-axis: $-90^\circ \rightarrow +16^\circ \rightarrow -6^\circ \rightarrow 0^\circ$ ($0.65\text{s}$ duration).
   - Opacity fade from 0% to 100%.

### Callout Box (`Offer4`) ($6.30\text{s}$ – $9.00\text{s}$)
- **`Offer4_Base`**: Slide in from left/bottom ($6.30\text{s} \rightarrow 6.90\text{s}$).
- **`Offer4_Text`**: Opacity fade in ($6.65\text{s} \rightarrow 7.00\text{s}$).
- **`Offer4_PriceTag`**: 3D fold-down ($6.95\text{s} \rightarrow 7.60\text{s}$), followed by a subtle attention pulse ($7.60\text{s} \rightarrow 8.20\text{s} \rightarrow 8.60\text{s} \rightarrow 9.00\text{s}$) settling at 100% scale cleanly at $9.00\text{s}$.

### Background Elements ($0.0\text{s}$ – $10.0\text{s}$)
- **`BG_Base`, `BG`, `BG_Border`**: Static throughout 10.0s.
- **`BG_Star_*`**: Continuous subtle linear rotation across the full 10.0s ($+360^\circ$ or $-360^\circ$).

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
