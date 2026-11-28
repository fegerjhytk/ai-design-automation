---
name: ai-design-workflow-gemini
description: Standalone AI Design Workflow & Brand-Motion Engine skill for the Gemini app — no MCP required. All pipeline steps (brand strategy, anti-sameness audit, typographic kerning, Illustrator builds, environmental mockups, motion timelines, QC, InDesign, After Effects) are executed directly by the agent as explicit instructions. Compatible with the Gemini mobile and desktop app without any MCP server.
triggers:
  - "ai design workflow"
  - "design workflow"
  - "brand and motion engine"
  - "brand-engine"
  - "unified design pipeline"
  - "design workflow gemini"
---

# AI Design Workflow — Gemini Standalone Skill

> **Gemini App Compatible · No MCP Required**
> This is a fully self-contained skill. Every capability that was previously handled by an MCP tool is now expressed as direct agent instructions. The agent executes all steps itself using shell commands, AppleScript, ExtendScript, Python, and Google Flow prompts.

---

## Core Philosophy

This workflow enforces **distinctiveness over generic competence**. The statistical average of any design category is the enemy. Every project begins with an anti-cliché filter before any creative decision is made.

---

## 1. Environment Check (replaces `design_workflow_status`)

Before starting any project, verify folder access, binaries, and running apps:

```bash
export PATH="/Users/admin/.gemini/antigravity/bin:/Users/admin/.local/bin:$PATH"
NODE_BIN="$(command -v node || echo /Users/admin/.gemini/antigravity/bin/node)"
REPO="/Users/admin/Documents/AI-Design-Automation"

# 1. Check Connected Folder & script permissions
ls -la "$REPO/illustrator/skills/design-automation/scripts/pipeline_runner.js"
ls -la "$REPO/ai-design-workflow/server.js"

# 2. Check Adobe apps running
osascript -e 'tell application "System Events" to get name of every process whose background only is false' | tr ',' '\n' | grep -Ei "illustrator|photoshop|indesign|after.?effects"

# 3. Check Node.js & Python 3
if "$NODE_BIN" --version >/dev/null 2>&1; then
    echo "Node OK: $("$NODE_BIN" --version)"
else
    echo "Node unavailable in this shell — use Python 3 + direct .jsx ExtendScript fallback (Sections 3, 4, 6, 8)"
fi
python3 --version
```

**Expected state before proceeding:**
- **Connected Folders (Gemini app):** Ensure `/Users/admin/Documents/AI-Design-Automation` (and your target project folder on Desktop) is added under **Connected Folders** for the chat; otherwise scripts in `$REPO` will be blocked.
- **Node binary:** Resolved via `NODE_BIN`. If Node is only installed in `~/.local/node/bin/node`, Gemini's sandboxed `/bin/sh` may not have access to it — install Node system-wide (`/usr/local/bin/node` or `/opt/homebrew/bin/node`), or use the **Python 3 + direct `.jsx` ExtendScript** workflow below (no Node required).
- **Executable scripts:** Ensure `pipeline_runner.js` and `server.js` are executable (`-rwxr-xr-x`; fix with `chmod +x` if not).
- **Adobe apps:** Illustrator open with the target `.ai` document; After Effects open for motion; Photoshop closed unless conditioning images.

---

## 2. Brand Anti-Sameness Audit (replaces `brand_anti_sameness_audit`)

Run this mentally/verbally BEFORE creating any color palette, font choice, or image prompt. No tool call needed — this is an agent reasoning step.

### Step 2a — Category Default Matrix

For the given brand category, identify and explicitly block:

| Filter | Extract from category | Block it |
|---|---|---|
| **Color tropes** | Top 2–3 colors used by 90% of competitors | Forbid as dominant primary |
| **Typography tropes** | Default font class (e.g. geometric sans-serif) | Steer opposite (weighted serif, etc.) |
| **Icon tropes** | Cliché symbols (leaves, crests, skylines, bowls) | Prohibit near primary logo |
| **Copy tropes** | Overused buzzwords ("pure", "zen", "exclusive") | Exclude from all headlines |

### Step 2b — Negative Prompt Injection

When generating any AI image (Google Flow / Nano Banana 2.1), prefix with:

```
Negative prompt: generic [CATEGORY] tropes, [CLICHÉ COLOR], bland flat corporate branding,
predictable [CLICHÉ ICON], sterile minimalist sans-serif, generic stock mockups,
washed-out beige aesthetic, sea-of-sameness category defaults.
```

### Step 2c — Heritage Counter-Anchor

Find an authentic historical, material, or geographic truth competitors have overlooked:
- **Origin over cliché** — go deeper than surface-level category symbols
- **Tactile material friction** — pair heritage pigment (cinnabar, oxblood, cobalt) with liquid chrome, brushed aluminum, or refractive optical glass
- **Unexpected contrast** — organic subject + architectural shadow + directional lighting

---

## 3. Typographic Kerning Audit (replaces `audit_typographic_kerning`)

Run optically for every wordmark or display headline before finalizing.

### Optical Trap Pairs to Check

Always inspect these letter combinations manually in Illustrator at 200%+ zoom:

| Pair | Risk | Fix |
|---|---|---|
| `R–A` | Gap looks wide | Tighten by −20 to −40 units |
| `A–V` | Optical hole | Tighten by −30 to −50 units |
| `V–A` | Same as AV | Tighten by −30 to −50 units |
| `T–o` | T overhang gap | Tighten by −25 units |
| `W–A` | Wide feel | Tighten by −20 units |
| `P–e` | Feels loose | Tighten by −15 units |
| `F–a` | Optical gap | Tighten by −20 units |

### ExtendScript Kerning Fix (paste into Illustrator → File → Scripts → Other Script)

```javascript
// Optical kerning calibration for wordmarks
var doc = app.activeDocument;
var sel = doc.selection[0];
if (sel && sel.typename === "TextFrame") {
    var chars = sel.textRange.characters;
    // Apply optical kerning
    sel.textRange.kerningMethod = AutoKernType.OPTICAL;
    // Manually tighten known trap pairs
    for (var i = 0; i < chars.length - 1; i++) {
        var pair = chars[i].contents + chars[i+1].contents;
        var traps = {"RA":-35,"AV":-40,"VA":-40,"To":-25,"WA":-20,"Pe":-15,"Fa":-20};
        if (traps[pair]) {
            chars[i].kerning = traps[pair];
        }
    }
    alert("Kerning calibration applied.");
}
```

---

## 4. Illustrator Identity Build (replaces `illustrator_build_identity`)

Build every brand identity `.ai` file with this exact 4-layer structure. No exceptions.

### Mandatory Layer Stack (top → bottom)

```
Layer 1: Wordmark (Hero)        ← Pure typographic wordmark ONLY. No icons.
Layer 2: Secondary Seals        ← Conceptual symbol/icon lives HERE exclusively (The Bonsai Rule)
Layer 3: Atmospheric Gradients  ← Color fields, texture overlays, brand environment
Layer 4: Packaging Dielines     ← Die-cut guides, bleed marks, structural templates
```

### The Bonsai Rule
> **The conceptual symbol (crest, seal, icon, motif) MUST reside exclusively on the `Secondary Seals` layer. It must never be attached to, grouped with, or placed adjacent to the wordmark on the `Wordmark (Hero)` layer.**

### Build Checklist
- [ ] Wordmark is 100% typographic — no icon attached
- [ ] All 4 layers exist and are named exactly as above
- [ ] Secondary Seals layer is unlocked and visible separately
- [ ] All text is outlined (`Type → Create Outlines`) before delivery
- [ ] Document color mode: CMYK for print, RGB for digital
- [ ] Artboard bleeds: 3mm for print, 0 for digital

### Direct Computer-Use Execution (via `osascript` + ExtendScript)

To execute a `.jsx` build script directly in desktop Adobe Illustrator without MCP:

```bash
osascript -e 'tell application id "com.adobe.illustrator" to do javascript file (POSIX file "/tmp/build.jsx")'
```

---

## 5. Environmental Mockup Staging (replaces `stage_environmental_mockup`)

Generate retail shelf or real-world staging images using Google Flow (Nano Banana 2.1).

### Pre-Generation Checklist
1. **Always ask the user for aspect ratio first:** `16:9` / `4:3` / `1:1` / `3:4` / `9:16`
2. Apply the negative prompt from Step 2b
3. Use Thinking Level: **High**, Count: **4 variants**

### Staging Prompt Templates

**Retail Shelf:**
```
[BRAND NAME] packaging product on a premium retail shelf, studio product photography,
soft diffused overhead lighting, shallow depth of field, hyper-realistic materials,
[BRAND COLOR] dominant, architectural shadow geometry, Hasselblad medium format lens quality.
Negative prompt: [insert from Step 2b]
```

**Lifestyle / Daylight:**
```
[BRAND NAME] product held by human hands in natural golden-hour daylight,
organic texture environment, authentic unretouched skin, 85mm f/1.4 lens bokeh,
[BRAND MATERIAL] tactile surface detail visible.
Negative prompt: [insert from Step 2b]
```

**Moody / Editorial:**
```
[BRAND NAME] product in a dark editorial still-life setup, single key light from left,
deep shadow fill, [BRAND HERITAGE COLOR] cast, luxury magazine aesthetic,
cinematic grain texture, no props or distracting elements.
Negative prompt: [insert from Step 2b]
```

---

## 6. Motion Sync Timeline (replaces `motion_sync_timeline`)

Generate BPM-synchronized word timing and animation code without any MCP call.

### Step 6a — Calculate Word Timing from BPM

```python
# Paste into Python 3 / run in terminal: python3 motion_timing.py
bpm = 120          # ← change to your track BPM
beat_ms = 60000 / bpm          # milliseconds per beat
bar_ms  = beat_ms * 4          # milliseconds per 4-beat bar

words = ["Brand", "Name", "Here", "Tagline"]  # ← your words

print(f"BPM: {bpm} | Beat: {beat_ms:.0f}ms | Bar: {bar_ms:.0f}ms\n")
for i, word in enumerate(words):
    t = i * beat_ms
    print(f"  {t/1000:.2f}s  →  {word}")
```

### Step 6b — GSAP Timeline (HyperFrames)

```javascript
// GSAP BPM-synced word reveal for HyperFrames
const BPM = 120;
const beat = 60 / BPM;
const words = ["Brand", "Name", "Here", "Tagline"];

const tl = gsap.timeline();
words.forEach((word, i) => {
    tl.fromTo(`#word-${i}`,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: beat * 0.8, ease: "power3.out" },
        i * beat
    );
});
```

### Step 6c — After Effects JSX Script

```javascript
// Paste into After Effects: File → Scripts → Run Script File
var comp = app.project.activeItem;
var BPM = 120;
var beat = 60 / BPM;
var words = ["Brand", "Name", "Here", "Tagline"];

for (var i = 0; i < words.length; i++) {
    var layer = comp.layers.addText(words[i]);
    layer.inPoint = i * beat;
    layer.outPoint = (i + 2) * beat;
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    pos.setValueAtTime(i * beat, [comp.width/2, comp.height/2 + 60]);
    pos.setValueAtTime(i * beat + beat * 0.3, [comp.width/2, comp.height/2]);
}
alert("BPM timeline created: " + words.length + " layers at " + BPM + " BPM");
```

---

## 7. Pipeline Actions (replaces `design_workflow_run_action`)

Run validated `pipeline_runner.js` actions directly in Terminal — no MCP server needed.
Supported `--action` values: `audit`, `cleanup`, `fit`, `export`, `qc`, `qc-markers`, `diff`, `ps-status`, `ps-crop`, `ps-mask`, `ps-report`, `ps-slice`, `ps-csv`, `ae-status`, `ai-video-status`, `animate`, `motion-clone`, `comp-to-gif`, `video-ad`, `chrome-status`.

```bash
NODE_BIN="$(command -v node || echo /Users/admin/.gemini/antigravity/bin/node)"
RUNNER="/Users/admin/Documents/AI-Design-Automation/illustrator/skills/design-automation/scripts/pipeline_runner.js"

# Audit vectors in active document
"$NODE_BIN" "$RUNNER" --action audit

# Clean up stray paths and anchors
"$NODE_BIN" "$RUNNER" --action cleanup

# Fit all objects to artboard
"$NODE_BIN" "$RUNNER" --action fit

# Run visual QC pass
"$NODE_BIN" "$RUNNER" --action qc

# Visual diff between two files
"$NODE_BIN" "$RUNNER" --action diff --before "path/to/v1.ai" --after "path/to/v2.ai"

# Check After Effects / Photoshop / Chrome status
"$NODE_BIN" "$RUNNER" --action ae-status
"$NODE_BIN" "$RUNNER" --action ps-status
"$NODE_BIN" "$RUNNER" --action chrome-status

# Export deliverables (only when explicitly requested)
"$NODE_BIN" "$RUNNER" --action export
```

> **Fallback when `node` is unavailable in Gemini's `/bin/sh`:** Run `python3` scripts directly (Section 8) and execute Illustrator / After Effects actions via ES3 ExtendScript (`.jsx`) using `osascript` or `File → Scripts → Other Script…`.

---

## 8. Preflight / Core Engine (replaces `design_workflow_preflight`)

```bash
NODE_BIN="$(command -v node || echo /Users/admin/.gemini/antigravity/bin/node)"
REPO="/Users/admin/Documents/AI-Design-Automation"

# Core-engine unit test suite
python3 -m unittest discover -s "$REPO/core-engine" -p "test_*.py" -v

# Core-engine data-only Illustrator job runner
python3 "$REPO/core-engine/run.py" "path/to/job.json"

# InDesign typography inspection
"$NODE_BIN" "$REPO/indesign/skills/indesign-doc-diff/scripts/indesign-doc-diff.js" --inspect-typo "path/to/document.indd" --json

# InDesign document diff
"$NODE_BIN" "$REPO/indesign/skills/indesign-doc-diff/scripts/indesign-doc-diff.js" --compare "path/to/a.indd" "path/to/b.indd" --json

# InDesign batch export
"$NODE_BIN" "$REPO/indesign/skills/indesign-batch-export/scripts/indesign_batch_export.js" --input "path/to/in" --output "path/to/out"
```

---

## 9. Standard Execution Order

Follow this sequence on every project. Do not skip steps.

```
Step 1 → Environment Check         (Section 1 above)
Step 2 → Anti-Sameness Audit       (Section 2 — always before any creative work)
Step 3 → Typographic Kerning       (Section 3 — before finalizing any wordmark)
Step 4 → Illustrator Build         (Section 4 — 4-layer structure, Bonsai Rule enforced)
Step 5 → Environmental Staging     (Section 5 — confirm aspect ratio first)
Step 6 → QC Gate                   (Section 7 — run qc + diff before delivery)
Step 7 → Motion / Delivery         (Section 6 — GSAP + AE JSX, keep AI/AEP open, quit PS)
```

---

## 9b. Codex Anti-Sameness Review (replaces `codex_review_dispatch`)

When you need a cross-AI critique of a brand identity for sameness / cliché drift, construct this payload and send it to `/ask-codex` or paste into ChatGPT:

```
You are a luxury brand design critic. Review the following brand identity for category clichés,
sea-of-sameness drift, and typographic weakness.

Brand name: [NAME]
Category: [CATEGORY]
Primary color: [COLOR]
Typeface: [FONT]
Key symbol: [ICON or "none — pure wordmark"]
Tagline: [TAGLINE]

Score each dimension 1–10 (10 = maximally distinctive):
1. Color distinctiveness vs category
2. Typographic sovereignty (no icon crutch)
3. Conceptual counter-anchor depth
4. Tagline memorability
5. Overall anti-sameness score

Return: scores, 3 specific risks, and 3 actionable improvements.
```

---

## 10. Sub-Pipeline Routing

| Task | What to do |
|---|---|
| **Brand strategy & anti-sameness** | Follow Sections 2–3 fully + use `anti-sameness-branding` skill |
| **Illustrator layout / carousels** | Use `illustrator-carousel-engine` or `illustrator-artboard-layout` skill |
| **Luxury Meta ads** | Use `autonomous-ad-designer` skill |
| **Campaign resizes (23-size)** | Use `pub-perk-resizes` skill |
| **Vector repair** | Use `vector-first-aid-illustrator` skill |
| **Image → Illustrator recreation** | Use `recreate-image-in-illustrator` skill |
| **QC / visual diff** | Use `design-qc-visual-diff` skill |
| **Illustrator → PowerPoint** | Use `illustrator-to-powerpoint` skill |
| **Illustrator → Canva upload** | Use `canva-illustrator-uploader` skill |
| **InDesign batch export** | Use `indesign-batch-export` skill |
| **InDesign document diff** | Use `indesign-doc-diff` skill |
| **XLSX → InDesign** | Use `klm-aggrea-xlsx-to-indesign` skill |
| **Excel ↔ InDesign cross-check** | Use `excel-doc-crosscheck` skill |
| **After Effects GIF export** | Use `ae-comp-to-gif` skill |
| **After Effects puppet animation** | Use `after-effects-puppet-animations` skill |
| **Pub Perks drink specials animation** | Use `pub-perk-animation` skill |
| **After Effects motion clone** | Use `ae-motion-clone` skill |
| **Vertical reels editor** | Use `ae-vertical-reel-editor` skill |
| **Zigma cinematic video** | Use `zigma-video-production` skill |
| **Audio-video sync** | Use `audio-video-sync-workflow` skill |

---

## 11. Hardcoded Rules (never override)

- 🚫 **No unsolicited renders** — never export `.mp4` / `.mov` / `.pdf` / `.jpg` unless explicitly asked
- 🔒 **Copy is sacred** — preserve client text 100% verbatim, zero paraphrasing
- 🌳 **Bonsai Rule** — icons/seals on `Secondary Seals` layer only, never touching the wordmark
- ✂️ **Quit Photoshop** after conditioning tasks; keep Illustrator + After Effects open
- ❌ **Anti-sameness first** — Section 2 runs before any color, font, or image decision
- 📐 **Ask aspect ratio** before any Google Flow generation
