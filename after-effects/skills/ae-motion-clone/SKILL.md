---
name: ae-motion-clone
description: "General reference-driven motion cloning engine for Adobe After Effects. Extracts animation choreography, physical trajectories (cascade drop, aerodynamic air wobble, overshoot bounce, infinite repeating carousel scroll, elastic pop, stagger slide) from reference videos or web URLs (Behance, YouTube, Loom, MP4, GIF) and applies the exact motion directly to compositions with semantic layer filtering (elements-only) and track-matte synchronization."
---

# Reference-Driven Motion Matcher Skill (`ae-motion-clone`)

The `ae-motion-clone` skill enables designers and engineers to clone animation choreography directly from any reference video or web URL (Behance portfolio case studies, Dribbble shots, Reels, Loom recordings, local MP4/GIFs) and automatically apply that exact physical motion to layers inside Adobe After Effects 2026.

It is designed to be **completely general** and can create any style of motion: cascading physical sticker drops, infinite repeating carousels, elastic scale pops, and directional staggered slides.

---

## Core Capabilities & Motion Archetypes

### 1. `cascade_drop` (Arôme Bakery Style — 4-Phase Lifecycle)
Faithfully clones physics-driven sticker and badge drops:
- **Phase 1: Cascading Drop-In (`0.0s – 1.6s`):** Elements drop in staggered from above the frame ($y = -600\text{px}$) with natural gravitational acceleration, dynamic aerodynamic rotational tilt ($\pm 14^\circ \text{ to } \pm 22^\circ$), ground impact with downward compression bounce ($+30\text{px}$ overshoot), and harmonic damped settle.
- **Phase 2: Clustered Hold (`1.6s – 3.5s`):** Elements hold steadily in an organic, overlapping collage for clear viewing.
- **Phase 3: Cascading Drop-Out (`3.5s – 4.8s`):** Elements accelerate downwards and exit through the bottom ($y = 2100\text{px}$) in a staggered tumble.
- **Phase 4: Seamless Loop Reset (`4.8s – 5.0s`):** Canvas clears back to the clean static headline and background, matching $t = 0.0\text{s}$ for a 100% seamless infinite loop.

### 2. `carousel_scroll` (Slide 10 Social Feed Style — Infinite Continuous Marquee)
Creates continuous, infinite scrolling streams of cards or media:
- **Automatic Pitch Detection:** Measures vertical or horizontal spacing between layers.
- **Repeating Stream Generation:** Duplicates layers into repeating sequence sets (`Repeat 1`, `Repeat 2`) so the stream never runs out of elements.
- **Zero-Discrepancy Loop:** Keyframes the controller across the exact cycle distance over the duration and applies `loopOut("cycle");` so Frame 0 and Frame End match down to the exact pixel.

### 3. `elastic_pop` (Spring & Overshoot)
- Rapid scale spring entrance ($0\% \to 115\% \to 96\% \to 100\%$) with subtle rotational kick for pop-up stickers, icons, and notifications.

### 4. `stagger_slide` (Editorial Directional Slide)
- Smooth directional entry ($+400\text{px}$ offset) with cubic bezier easing curves (influence 85% / 75%).

---

## Semantic Layer Classification & Rules

- **`--elements-only` (Default: `true`):** Preserves typography (headlines, subheads, body text) and background plates in their 100% static, crisp, locked resting state. Only graphic stickers, hero food cutouts, mascots, badges, and polaroids animate.
- **`--layout stacked` (Middle-Filling Collage):** Arranges elements in an organic, overlapping cluster across the center and lower canvas (nestling badges, stickers, and mascots tightly around hero assets, filling empty middle space).
- **Track-Matte Synchronization:** Automatically parents and synchronizes `*_mask` and `clippath` layers to their parent graphics, preventing shearing or clipping during motion.

---

## Command Reference & Usage

### 1. Apply Arôme Cascading Drop with Middle-Filling Stacked Collage
```bash
/Users/admin/.gemini/config/skills/ae-motion-clone/scripts/clone_motion.sh \
  --ref "https://www.behance.net/gallery/234862147/Arome-Visual-Identity-Bakery-Branding/modules/1349053657" \
  --comp "Slide 11" \
  --archetype cascade_drop \
  --layout stacked \
  --elements-only \
  --duration 5.0
```

### 2. Apply Infinite Repeating Carousel Scroll (Continuous Stream)
```bash
/Users/admin/.gemini/config/skills/ae-motion-clone/scripts/clone_motion.sh \
  --comp "Slide 10" \
  --archetype carousel_scroll \
  --duration 5.0
```

### 3. Apply Motion and Immediately Export a 50 FPS Preview GIF
```bash
/Users/admin/.gemini/config/skills/ae-motion-clone/scripts/clone_motion.sh \
  --ref "/path/to/reference.mp4" \
  --comp "Slide 7" \
  --archetype cascade_drop \
  --preview-gif
```

---

## Options & Flags

| Flag | Shorthand | Description | Default |
|---|---|---|---|
| `--comp` | `-c` | Target After Effects composition name (required) | — |
| `--ref` | `-r` | Reference video/GIF file path or web URL (Behance, YouTube, Loom, CDN) | Built-in archetype |
| `--archetype` | `-a` | Motion model: `cascade_drop`, `carousel_scroll`, `elastic_pop`, `stagger_slide` | `cascade_drop` |
| `--layout` | `-l` | Layout mode: `as-is` (preserves design positions) or `stacked` (middle-filling collage) | `as-is` |
| `--elements-only` | — | Locks typography & background; animates only graphic elements | `true` |
| `--include-text` | — | Also animates text layers along with elements | `false` |
| `--duration` | `-d` | Target timeline duration in seconds | `5.0` |
| `--stagger` | `-s` | Stagger delay between cascading element arrivals | `0.12` |
| `--hold` | — | Hold duration at resting layout before exit drop | `1.9` |
| `--preview-gif` | — | Automatically exports a 50 FPS smooth GIF directly to Desktop via `ae-comp-to-gif` | `false` |
