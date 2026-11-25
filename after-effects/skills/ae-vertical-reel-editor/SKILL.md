---
name: ae-vertical-reel-editor
description: General production workflow for editing 9:16 vertical montage reels (1080x1920 @ 30fps) in Adobe After Effects. Enforces portrait media auditing, human/action shot prioritization, 0-2s flash-cut opening hooks, 50fps hero subcomps, selective subtle Easy Ease scale zooms, non-destructive comp versioning, and safe AE 2027 ExtendScript DOM inspection.
triggers:
  - "vertical reel"
  - "instagram reel"
  - "after effects reel"
  - "montage reel"
  - "1080x1920 reel"
---

# Vertical Montage Reel Editor (`ae-vertical-reel-editor`)

Production blueprint for assembling, refining, and collaborating on **`1080×1920` (`9:16`, `30 fps`)** live-action montage reels (hospitality, food & beverage, lifestyle, retail, product showcases) in **Adobe After Effects**.

---

## 1. Pre-Edit Media Audit & Normalization

Before proposing an edit or touching an `.aep` file, profile all candidate clips (`ffprobe` + fast contact-sheet strips):

1. **Portrait Orientation Gate:** Inspect both coded pixel dimensions **and** rotation metadata (`side_data_list` / `tags.rotate`). Exclude unintended landscape clips from `9:16` timelines immediately unless the user explicitly approves cropping/reframing.
2. **Human & Action Shot Priority Tagging:** Categorize every usable portrait clip so high-retention shots are surfaced first:
   - **On-camera human interaction** (biting/eating food, pouring drinks, reactions, service).
   - **Hands / product craft action** (cutting, squeezing, dipping, drizzling, plating, unboxing).
   - **Establishing & atmosphere** (exterior facade, signage, interior architecture, lighting, seating).
   - Explicitly report any unused human-interaction clips so they are never overlooked.
3. **Zero-Repeat Tracking:** Track clip IDs across opening hook, hero beats, mid-cutaways, and outro so establishing/venue shots never repeat in the middle.
4. **Local Reference Analysis:** For pacing references with sub-second (`0–2s`) cuts, prefer analyzing a local `.mp4` reference clip (or extracted frame strip) over scrubbing inside a live web player.

---

## 2. Editorial & Motion Architecture (`1080×1920 @ 30 fps`)

1. **100% Real-Time Default:** Keep clip speed at `100%` (`stretch = 100`) unless slow-motion is explicitly requested.
2. **`0–2s` Flash-Cut Opening Hook (Nested Precomp Pattern):**
   - When an energetic scroll-stopping opener is desired, build a dedicated `~2.0s` nested hook comp containing **`8–10` hard cuts (`0.17s–0.20s` / `5–6 frames @ 30fps`)** alternating **Brand / Environment** ↔ **Hero Action / Human Moment**.
   - Draw hook clips from unused shots/moments so main body shots do not feel repetitive right afterward.
3. **Body Pacing:**
   - Hero subject/product shots: **`1.00s – 1.50s`**.
   - Atmosphere/venue cutaways between hero blocks: **`0.50s – 1.00s`**.
4. **High-FPS Hero Precomps (`50 fps` Nested Subcomps):**
   - For shots needing `Warp Stabilizer`, `Animation Composer` / plugin transitions, speed-ramping, or layered framing inside a `30 fps` master, wrap individual clips in native-framerate precomps (`e.g. 1080×1920 @ 50 fps`) so effects and stabilization evaluate cleanly without master timeline conflicts.
5. **Selective Subtle Zoom (`~30–35%` of Clips, Not All):**
   - When `4K` vertical footage (`2160×3840`) sits at `50%` fit scale in `1080×1920`, animate **`Scale` only on steady hero/plate/architecture/closing shots** smoothly between **`50.0%` and `53.5%–54.0%`** (alternating push-in and pull-out) using Bezier Easy Ease (`KeyframeEase(0, 66.67)`).
   - Never upscale past `100%` native pixel resolution, and leave tight human-face or edge-critical hand-action shots static (`50%`) to preserve framing.
6. **Restrained Accent Transitions:** Use clean hard cuts as the foundation; add `Distorted Zoom Out`, short `0.35s–0.50s` light leaks, or `Fade to Black` sparingly between distinct sections.
7. **Decouple Grading & Audio:**
   - Keep a top `Adjustment Layer` (`enabled = false` until the editor/user wants grading or applies `Lumetri Color`) instead of baking LUTs onto raw clips.
   - For silent reels, set `audioEnabled = false` on **every** footage layer in the master comp **and** inside any nested precomps.

---

## 3. Non-Destructive AE Collaboration Protocol

1. **Approval Before Editing:** Always present a concise table (layer slot, clip, timeline in/out, source segment, zoom direction) and wait for user approval before modifying `.aep` files.
2. **Inspect Live State Every Turn:** Read the **currently open** `app.project` right before editing—never assume layer indices, trims, or filenames survived manual user edits.
3. **Comp Versioning (`v1 → v2 → v3`) vs. Surgical Swaps:**
   - For major structural additions (new opening hook, pacing pass, zoom pass), call `targetComp.duplicate()` to create a clean new version (`v2`, `v3`) and leave prior comps untouched.
   - For explicit single-slot fixes, update only the named layer indices with `layer.replaceSource(newFootageItem, false)` while preserving manual user edits on adjacent layers.
4. **Keep Active Software Open / No Unsolicited Renders:** Save the `.aep`, call `activeComp.openInViewer()`, and keep After Effects open for user review and grading. Do not render `.mp4`/`.mov` exports unless explicitly asked.

---

## 4. After Effects 2027+ ExtendScript Technical Rules

1. **Reliable Execution (`DoScriptFile`):** Execute `.jsx` files via:
   ```bash
   osascript -e 'tell application "Adobe After Effects 2027" to DoScriptFile (POSIX file "/tmp/script.jsx") with override'
   ```
   *(When `Pref_SCRIPTING_FILE_NETWORK_SECURITY` is `"0"`, `File.open("w")` fails silently and inline `DoScript` returns only `"0"` or `"1"`.)*
2. **Read-Only Live DOM Inspection via PNG:** When file writes are disabled and `app.project.dirty` may have unsaved user work, render layer state (`name`, `source`, `inPoint`, `outPoint`, `startTime`, `stretch`, `scale` keyframes, `effects`, `enabled`, `audioEnabled`) onto a temporary comp using `saveFrameToPng(0, new File("/tmp/ae_inspect.png"))` followed by `$.sleep(2500)` (asynchronous PNG write) before `tc.remove()`, then inspect with `read_file`.
3. **3D `Scale` Keyframe Easing Array:** `ADBE Scale` is a 3-element non-spatial property (`[x, y, z]`), so `setTemporalEaseAtKey()` requires an array matching `scaleProp.value.length` (`[ease, ease, ease]`):
   ```javascript
   var ease = new KeyframeEase(0, 66.67);
   var easeArr = [];
   for (var d = 0; d < scaleProp.value.length; d++) easeArr.push(ease);
   for (var k = 1; k <= scaleProp.numKeys; k++) {
     scaleProp.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
     scaleProp.setTemporalEaseAtKey(k, easeArr, easeArr);
   }
   ```
