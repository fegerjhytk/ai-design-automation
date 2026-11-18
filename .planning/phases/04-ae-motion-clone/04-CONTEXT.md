# Phase 04 Context: Reference-Driven Motion Matcher Skill (`ae-motion-clone`)

## Problem Statement
Motion designers, art directors, and animators frequently identify reference animations from award-winning design portfolios (such as Behance case studies, Dribbble shots, agency websites, and Reels) that exhibit sophisticated physical motion, playful rhythm, and tactile overshoot bounces (e.g. the Arôme Bakery brand identity reference: `https://www.behance.net/gallery/234862147/Arome-Visual-Identity-Bakery-Branding/modules/1349053657`).

Recreating these motion dynamics manually in Adobe After Effects presents several difficult challenges:
1. **Manual Keyframe Tedium:** Setting individual position, rotation, and scale keyframes across 15–30 layers with custom cubic bezier speed graphs takes hours of manual tweaking.
2. **Missing Natural Physics:** Manual attempts often feel robotic or rubbery because they lack the natural interplay of gravity acceleration ($d = \frac{1}{2}gt^2$), rotational aerodynamic wobble during transit, and damped harmonic overshoot on impact.
3. **Layer Hierarchy & Matte Breakage:** In complex After Effects comps with track mattes (`_mask`), clipping paths, and parented labels, blindly applying motion to individual layers shears child elements away from their masks, causing hideous visual clipping.
4. **Lack of Selective Filtering:** Designers often require element-only motion (e.g., *"apply same animation and don't give text animation, only elements"*) so typography remains crisp and legible while decorative stickers, badges, hero products, and polaroids cascade dynamically into place.
5. **Format & Duration Inflexibility:** Reference clips have fixed durations and aspect ratios (e.g., 3s at 30 fps), whereas target client compositions might require 5s, 8s, or 10s at 50 FPS.

---

## Solution Architecture
Build and deploy the `ae-motion-clone` skill into `~/.gemini/config/skills/ae-motion-clone/`:

### 1. Unified Reference Ingestion Pipeline
* Accepts either:
  * **Local File:** `.mp4`, `.mov`, `.gif`, `.webm`.
  * **Web URL:** Behance gallery module, YouTube link, Loom recording, Vimeo, or direct CDN video URL.
* Automatically downloads media into `~/.gemini/config/skills/ae-motion-clone/cache/` using headless scrapers and FFmpeg.

### 2. Motion Profile & Physics Decomposition Engine (`motion_analyzer.py`)
Analyzes the reference animation and extracts:
* **Cadence & Stagger Rhythm:** Inter-element delay intervals ($\Delta t \approx 0.15\text{s} - 0.25\text{s}$).
* **Physics Archetypes:**
  * **Cascade Drop & Bounce (Arôme / Editorial Style):** High vertical drop ($y = -450\text{px}$ offscreen) $\to$ aerodynamic rotational tilt ($-22^\circ \to +10^\circ$) $\to$ ground strike with downward overshoot ($+28\text{px}$) $\to$ damped rebound and settle.
  * **Continuous Seamless Carousel:** Constant velocity linear drift with seamless loop wraparound.
  * **Spring Pop & Scale Elasticity:** Fast scale expansion ($0\% \to 108\% \to 100\%$) with rotational kick.
  * **Directional Drift / Slide-Up:** Gentle soft-eased positional reveals for typography.
* Computes normalized mathematical motion curves and timing metadata exported as `motion_recipe.json`.

### 3. Semantic Layer Classifier & Filter
Inspects target AE composition layers and categorizes them:
* **Background (`BG`):** Static ground plane (no drop).
* **Typography (`Text` / `Headline`):** Filtered out when `--elements-only` or `--no-text-anim` is specified, or given soft subtle reveals.
* **Hero Products (`Burger`, `Bottle`, `Main Illustration`):** Assigned highest gravitational mass, largest overshoot bounce, and central arrival timing.
* **Secondary Elements (`Stickers`, `Badges`, `Mascots`, `Polaroids`):** Assigned dynamic angular rotation and staggered landing sequences.
* **Track Mattes & Masks (`*_mask`, `clippath`):** Automatically linked to move synchronously with parent layers to prevent clipping.

### 4. ExtendScript Motion Injector (`apply_motion.jsx`)
* Injects clean cubic bezier keyframes using native After Effects `KeyframeEase(speed, influence)`.
* Respects and preserves existing layer transform hierarchies.
* Scales timing proportionally to fit the target composition duration (e.g. 5.0s, 8.0s, 10.0s).

### 5. Automated Verification & Smooth GIF Export
* Integrated with `ae-comp-to-gif` to immediately generate a butter-smooth 50 FPS GIF preview on the Desktop so the designer can inspect and approve the result instantly.
