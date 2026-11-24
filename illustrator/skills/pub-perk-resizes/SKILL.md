---
name: pub-perk-resizes
description: Audit or produce the static Pub Perks campaign placements from an approved Illustrator master using the established 23-size set, folder structure, naming, QR rules, and print and JPEG exports. Apply to Pub Perks drink-specials resize jobs and completion checks.
---

# Pub Perk Resizes

## Scope and source

- Run Illustrator production and test runs through Antigravity. Use the active Codex chat to diagnose or revise the skill.
- For every test run, stage a copy of the approved master and its linked artwork in a fresh folder on the Desktop before starting the test. Generate the test resizes and exports beside that copy under RESIZES. Preserve the production master, existing Desktop test folders, and prior exports.
- Distinguish review or counting requests from production requests. A review is read-only. If the user has asked to wait for a start cue, wait until they authorize the requested phase.
- Use the supplied, approved Illustrator master and artboard. A3 is the usual master format (297 × 420 mm). Measure the actual artboard, as the December examples labeled A3 contain A4 artboards. Where several revisions or concepts could be the master, identify the approved artwork before producing resizes. The December voucher artboard was a separate concept.
- Preserve the master file and its linked artwork and fonts. Resolve missing dependencies in the approved source workflow. Preserve all supplied copy, offers, prices, logos, legal lines, and artwork. Resize and reposition existing elements as needed for authorized layout adaptation. Get explicit instructions before changing, substituting, adding, or deleting content or design elements beyond the QR rule and approved Ad treatment below.
- Use the examples as layout references. Older campaigns sometimes shortened copy in TV, Website, and other wide placements, omitted elements in small Pub Perks placements, or used a different CTA. These observations confer no authorization to repeat those edits.
- Static deliverables include the Ad, TV Screen, and TV Animation still. When motion graphics are requested for these three master placements, follow the **Motion Extension & After Effects Bridge** protocol below to generate synchronized 10.0-second 30.0 fps After Effects compositions directly from the approved masters.


## Folders and filenames

- **STRICT LOCAL DESKTOP RULE**: Regardless of where the source or master file is located—even if the master file resides inside Google Drive or cloud storage—always create and save all resized Illustrator files and exports strictly on the local **Desktop** under a folder named `RESIZES`. **NEVER** save, copy, sync, or mirror files back to Google Drive or cloud storage unless explicitly asked by the user in the prompt.
Create or reuse `RESIZES` on the Desktop. Store Illustrator sources in `RESIZES/<category>/` and exports in `RESIZES/FINAL OUTPUTS/<category>/`. Use the categories Posters, Social, Pub Perks, Website, and In-House Digital. In an existing project, reuse matching folders with legacy spelling or case and avoid creating duplicates. The December project used `POSTERS`, `SOCIAL`, `PUB PERKS`, `WEBSITE`, and `IN HOUSE DEGITAL`.

### Links folder shortcut for static Illustrator resizes

Create a Links folder shortcut (a folder symlink on macOS) inside each static Illustrator source category folder, pointing to the campaign's physical Links folder. Reuse an existing shortcut when it resolves to the correct target. Verify the target exists and the saved Illustrator artwork opens with all placed assets resolved. Keep one physical asset folder for the campaign and use relative shortcut targets where the folder structure permits. For a Desktop test, stage the physical Links folder with the Desktop master copy and point the resize shortcuts to that local folder. If a real Links directory already exists at a destination, preserve it and inspect its contents before changing the layout.

This rule applies to static Illustrator folders such as POSTERS, SOCIAL, PUB PERKS, WEBSITE, and IN HOUSE DIGITAL. The motion project rules below continue to require physical footage directories and physical assets inside animation projects.

Lead with the placement or shared artboard group name, then use the campaign name. Match each source and export stem where the output represents one placement. Examples:

- `A3_<campaign>.ai`, `A3_<campaign>.pdf`, and `A3_<campaign>.jpg`
- `AD_<campaign>.ai` and `AD_<campaign>.jpg`
- `WEBSITE - <campaign>.ai` and `WEBSITE - <campaign>_1920x1073.jpg`
- `PUB PERKS_<campaign>.ai` and `PUB PERKS_<campaign>_01.jpg` through `_04.jpg`

Use a single multi-artboard AI for Website and one for Pub Perks. Keep their artboard sequence as listed below. Continue any established project naming for an in-progress set, and leave unrelated master proofs under the project's existing `Output` folder.

## Static placement matrix

Dimensions are width × height. Use the specified units. For PDFs, dimensions refer to trim. For JPEGs, artboard sizes identify placements and the delivered pixel dimensions depend on export settings.

| Category | Placement or export suffix | Artboard | Export |
|---|---|---:|---|
| Posters | A0 | 841 × 1189 mm | PDF |
| Posters | A2 | 420 × 594 mm | PDF |
| Posters | A3 | 297 × 420 mm | PDF and JPG |
| Posters | A4 | 210 × 297 mm | PDF and JPG |
| Posters | DL | 110 × 220 mm | PDF |
| Social | Ad | 1080 × 1080 px | JPG |
| Social | Instagram Post | 1080 × 1350 px | JPG |
| Social | Instagram Story | 1080 × 1920 px | JPG |
| Social | Facebook Cover Pic | 1920 × 1005 px | JPG |
| Social | Eventbrite Cover Pic | 2160 × 1080 px | JPG |
| Pub Perks | 01 | 500 × 160 px | JPG |
| Pub Perks | 02 | 500 × 500 px | JPG |
| Pub Perks | 03 | 1300 × 550 px | JPG |
| Pub Perks | 04 | 1920 × 1080 px | JPG |
| Website | Board 1 · `1920x1073` | 1920 × 1073 px | JPEG |
| Website | Board 2 · `430x764` | 430 × 764.444 px | JPEG |
| Website | Board 3 · `774.67x435.75` | 774.670 × 435.752 px | JPEG |
| Website | Board 4 · `386.68x217.51` | 386.686 × 217.511 px | JPEG |
| Website | Board 5 · `238.32x298.2` | 238.56 × 298.2 px | JPEG |
| In-House Digital | Barkers Arm Screen | 210 × 297 mm | JPG |
| In-House Digital | Nightlife | 1920 × 1080 px | JPG |
| In-House Digital | TV Screen | 1920 × 1080 px | JPG |
| In-House Digital | TV Animation still | 1080 × 1920 px | JPG |

## Layout and export conventions

- **QR codes & Mobile Phone Mockup Rule**:
  - The mobile phone graphic and QR code setup must **NEVER** appear in:
    - **Social Media** (Ad, Instagram Post, Instagram Story, Facebook Cover, Eventbrite Cover)
    - **Website** (All Website boards 1 through 5)
    - **In-House Digital Screens** (TV Screen, TV Animation still, Nightlife)
    - **Pub Perks Banners** (01, 02, 03, 04)
  - The mobile setting with QR code is **STRICTLY EXCLUSIVE** to:
    - **Poster formats** (A0, A2, A3, A4, DL)
    - **Barkers Arm Screen** (in In-House Digital)
  - Always verify that the mobile device graphic and QR code are completely stripped from all social, website, TV, and nightlife placements.
- **Website live-content safe zone & centre gap rules**: The site overlays its own live text content above the exported background artwork in the centre.
  - **Centre gap rule (Applies EXCLUSIVELY to Website Board 1 [1920×1073 px] and Board 2 [430×764.444 px])**:
    - These two sizes sit behind the website's live text overlay. A clear, empty margin/gap must be preserved in the centre of the artboard where the site displays its live text.
    - Campaign artwork (logo, headline, subtext, product bottles/cans, splashes, prices, qualifiers) must be placed around this central space, never inside it. The background texture and color fill the whole artboard, but the centre must remain visually free of foreground content.
    - **Website Board 1 (1920 × 1073 px, landscape)**: Preserves an empty vertical centre lane (x ≈ 32%–62% of artboard width, ~614–1190 px). Logo, headline, and subtext sit on the left; product bottles/cans, splashes, and price badges sit on the right; the bottom tagline/legal bar spans underneath.
    - **Website Board 2 (430 × 764.444 px, portrait)**: Preserves an empty horizontal centre band (y ≈ 35%–59% of artboard height, ~268–451 px). Logo, headline, and subtext sit in the top section; product bottles/cans, splashes, price badges, and legal text sit in the lower section.
  - **Website Boards 3 & 4 (774.67 × 435.75 px & 386.68 × 217.51 px) — 16:9 Landscape Ratio**:
    - These two boards do **NOT** use the centre gap rule.
    - They approximately share the 16:9 aspect ratio as TV Screen and Nightlife (1920 × 1080 px); only the dimensions differ.
    - Scale them directly from the 16:9 landscape master proportionally then verify the exact artboard bounds and adjust background coverage for any small ratio difference.
  - **Website Board 5 (238.32 × 298.2 px / 238.56 × 298.2 px) — Compact Portrait Card**:
    - Compact card format with a ~4:5 aspect ratio corresponding closely to the Instagram Post ratio (1080 × 1350 px / 0.8 ratio).
    - Does not use the centre gap rule; scale and adjust proportionally to match the card dimensions.
- **Verify the Website safe zone**: For Boards 1 and 2, ensure the entire centre zone stays clear of foreground artwork before finalizing exports. If foreground elements cannot fit without invading the centre gap or becoming illegible, adjust spacing or alert the user.
- **Square Ad**. Use the approved boxed CTA treatment. The box label reads **BOOK YOUR TABLE** and must follow these rules: (1) **Color** — use the campaign's matching accent color (yellow/orange that matches the Pub Perks design; sample it from the artwork rather than guessing); (2) **Corner roundness** — fully rounded pill shape, not a partial radius; (3) **Text alignment** — centered both horizontally and vertically within the box. Position the box at the lower right of the artboard. Use the wording the user supplies or approves. November's 1400 × 1400 px Ad and **BOOK NOW** are historical references only.
- **Print**. Use the project's requested PDF settings. December used 3 mm bleed on all sides and trim marks on all five print PDFs. November used approximately 3 mm bleed and omitted marks on A0 and A2. Keep bleed, trim marks, and trim size distinct.
- **JPEG**. Match the job's requested or established export settings. The Website examples used 300 ppi in November and 600 ppi in December. For an existing set, match the intended reference export, rather than inferring pixel dimensions from the filename. The December 1920 × 1073 artboard exported at 16000 × 8942 px. Both `.jpg` and `.jpeg` occurred in final folders.

## Illustrator production

- **SCALE ARTWORK WITH ARTBOARD**: When resizing any placement, choose the method based on the target aspect ratio:

  - **Same-ratio sizes** (e.g. A0, A2, A3, A4 — all share the same portrait proportion): Enable **Scale Artwork with Artboard** with **constrain width and height proportions ON**. Set one dimension and the other follows automatically. Verify both exact target dimensions because millimetre rounding can make ISO A-series proportions slightly different.
  - **Different-ratio sizes** (e.g. DL, digital screens, social formats): Use the two-step approach — **Step 1**: constrain ON, scale one dimension proportionally. **Step 2**: constrain OFF for the artboard dimensions only, then reflow intact foreground groups to fit. Keep product artwork, logos, and typography proportional. Adjust background coverage independently.

- **RESIZE ORDER — MASTER SIZES FIRST (Ratio-Based Efficiency Shortcuts)**: Always establish the core master sizes first, then derive placements that share identical or similar ratios to shorten production time without recreating layouts from scratch:
  1. **Master print** — A3 or A4 (297 × 420 mm or 210 × 297 mm). Base for A0 and A2 with proportional artwork scaling. Fit DL to its exact 110 × 220 mm artboard using a dedicated narrow layout.
  2. **Master portrait** — 1080 × 1920 px (tall vertical). Base for Instagram Story, TV Animation still, and tall vertical digital formats.
  3. **Master landscape** — 1920 × 1080 px (wide horizontal 16:9). Base for TV Screen, Nightlife, and other 16:9 landscape formats.
  4. **Master square** — 1080 × 1080 px (Ad). Base for square and square-adjacent formats.
  - **Shared ratio shortcuts**:
    - **Pub Perks 04 (1920 × 1080 px)**: Exactly identical 16:9 landscape format — derive directly from the master landscape (1920 × 1080 px).
    - **Website Boards 3 & 4 (774.67 × 435.75 px & 386.68 × 217.51 px)**: Approximately share the 16:9 aspect ratio as TV Screen and Nightlife (1920 × 1080 px). Scale from the 16:9 master proportionally, verify exact artboard dimensions, and adjust background coverage for small ratio differences.
    - **Website Board 5 (238.32 × 298.2 px)**: Compact portrait card sharing the ~4:5 ratio of Instagram Post (1080 × 1350 px / 0.8 ratio). Scale and adjust to match the card dimensions.
    - **Website Boards 1 & 2**: The only website formats requiring the dedicated **centre margin gap** for live web text overlays.
    - **Remaining formats**: Adjust from the closest ratio master using the two-step Scale Artwork with Artboard method from the placement matrix specs.

- **MANDATORY APPROVAL GATE — SHOW MASTER SLIDES FIRST**:
  Before batching or deriving any remaining placements, you **MUST FIRST generate the master slides and pause for user confirmation**:
  1. Create the key master layouts:
     - **TV Screen / Nightlife Master** (1920 × 1080 px, wide 16:9 landscape)
     - **TV Animation Master** (1080 × 1920 px, tall vertical)
     - **Square Ad Master** (1080 × 1080 px, square with BOOK YOUR TABLE CTA)
  2. **Present to User**: Immediately show/render preview images of what has been made for these master layouts.
  3. **Wait for Confirmation**: Explicitly ask the user for their review and approval. **DO NOT** proceed with batching the remaining 19+ placements (posters, social formats, website boards, Pub Perks banners) until the user confirms and approves the masters.

- This resizing strategy applies specifically to **Pub Perks / Digital Anthropology** resize jobs.

1. Inspect the approved artboard and record its visible content before generating resizes. Identify headline, logo, offer groups with prices and qualifiers, required date and legal copy, QR group, and backgrounds by layer name, text, or verified bounds. Locate the campaign artwork on the artboard even when the pasteboard contains proofs. Work on a copy and record or verify the original master hash. Do not delete a layer or remove a page item solely because of its index in the Illustrator DOM.
2. Build each placement from a fresh copy of the original artwork. In a shared Website or Pub Perks document, duplicate the untouched template for every artboard before applying any transforms. Use each artboard's actual rectangle and coordinate origin. Scale content proportionally and use measured visible bounds to translate it into the intended area. Align print artwork to the new trim after scaling. Build DL as its own narrow layout, and reflow tall and compact digital layouts by fitting intact offer groups into available space. Keep background and bleed geometry independent of foreground layout.
3. Define separate safe areas for headline, each offer, date or legal copy, and QR or Ad CTA as applicable. Fit each intact group proportionally to its assigned area using its full visible width **and** height, then re-read its bounds after placement. Validate against the artboard and its allocated area. Check collisions between separate offers and with text, the CTA, and the frame. For Website boards 1 and 2, reserve the live-content safe zone before calculating the available space for the artwork. Inspect intentional overlaps within each offer as a grouped visual. A placed item moved off the artboard, obscured, masked, or clipped is missing content. Preserve every offer, qualifier, price, and date unless the user explicitly approves omissions. If all required content cannot fit legibly on a small placement, show the draft and ask for the specific content decision. Continue independent placements.
4. Check Website boards 1 and 2 against the reference layout and verify their open center as well as the visible bounds of every product and price. Keep the approved Ad CTA clear of offers, the date, and the trim edge. Apply the QR rule by identifying the actual QR group. Keep Nightlife and TV Screen separately named even when the layout is shared.
5. Set the JPEG scale for the chosen export reference. In Illustrator ExtendScript, the clipping property is `ExportOptionsJPEG.artBoardClipping`. A 100% export scale produces roughly one pixel per artboard point, while 300 ppi corresponds to approximately `300 / 72 * 100` percent. Inspect actual pixels and cropping afterward. When following the November Website reference, use 300 ppi and target the respective actual export sizes in artboard order: 8001 × 4472, 1793 × 3186, 3229 × 1817, 1612 × 907, and 995 × 1244 px. Follow the requested or established reference for other campaigns. Compare every measured width and height with the specified export target. Report expected and actual dimensions and the signed pixel difference even when the variance is acceptable. When exact dimensions are required, resolve the discrepancy before passing the placement.
6. Configure 3 mm of print bleed on every edge when no different job spec is supplied. Extend the background pixels or vectors through the bleed area. Set the document and PDF export options so bleed is included. Measure all four sides between the exported PDF's TrimBox and BleedBox. Each should be approximately 8.504 pt for 3 mm bleed. Also sample rendered artwork between trim and bleed on all four sides. A correctly sized BleedBox can still contain blank pixels. If saving a copied document drops bleed, a tested Illustrator approach is to create the print document with a DocumentPreset and documentBleedOffset, then position the backing using the new artboard's actual rectangle. Match the job's trim-mark convention separately.

## Verification and completion

- Before applying the workflow across the set, render representative proof exports for the scaled poster, narrow DL, compact Pub Perks banner, square Ad, tall digital layout, and Website boards 1 and 2. Open the resulting render in a viewer or image-inspection tool. Inspect the complete design at fit-to-view, then inspect each potentially crowded region at a readable zoom. Check all offers against the master and verify the print and JPEG settings. Preserve a labeled thumbnail or link for each proof reviewed and note what was visible. If a proof fails, correct the layout and open a fresh render before batching its method. Continue distinct placements where their workflow passes.
- Open or render every final export. Inspect the actual PDF and JPEG and compare them with their corresponding editable artboards. A valid filename, matching artboard, readable file, or successful export call does not verify the layout. Check all prices and required copy, QR policy, CTA legibility, Website gaps, PDF trim and four-sided bleed, and actual JPEG pixels. For each placement record generated, dimensions checked, and visually checked separately. Use PASS only if you can point to the inspected render and describe the evidence for all applicable checks. Mark any file you could not open visually as pending. Mark a file as failed if any important artwork, copy, or price is obscured, clipped, unreadable, or outside its safe area. A tool log, script comment, or list of exports is insufficient evidence for a visual pass.
- Count separately by files generated and placements passed. A complete static set has 23 placements, represented by 16 editable Illustrator files, and 25 final files because A3 and A4 each have two formats. A JPG for the TV Animation placement is a still. Report which representative proofs and full-set checks were performed, and any failed or blocked checks.

---

## Motion Extension & After Effects Bridge (`pub-perk-animation` Integration)

When motion graphics are requested for the approved static master placements (**TV Screen**, **TV Animation**, and **Square Ad**), apply this automated pipeline:

### 1. The 3 Motion Master Placements
1. **TV Screen** (`1920 × 1080 px`, 16:9 landscape) -> `Tv SCREEN- <campaign>.aep`
2. **TV Animation** (`1080 × 1920 px`, 9:16 vertical) -> `Tv Animation_Pub Perks - <campaign>.aep`
3. **Square Ad** (`1080 × 1080 px`, 1:1 square) -> `AD_Pub Perks - <campaign>.aep`

### 2. Mandatory Operational Invariants
1. **Strict Minimal Project Folder Structure & Zero Extra Files Protocol**:
   - Master `.ai` files must NEVER be overwritten.
   - For each motion placement, the project folder must contain **ONLY the minimal required files**:
     ```
     <Project_Folder>/
     ├── <Project_Name>.aep          # The ONLY file at the project root
     ├── Fotage/                     # Dedicated physical footage directory
     │   └── <Name>_Unpacked.ai      # Single source of truth for AE comp layers (or _Unpacked_v2.ai if versioned)
     └── Links/                      # Optional physical directory for linked raster artwork (if packaged)
     ```
   - **STRICT MANDATORY RULES — ZERO EXTRA FILES (Do NOT add extra files unless strictly needed)**:
     - **NO loose unpacked `.ai` files at project root**: The unpacked `.ai` artwork lives **EXCLUSIVELY inside `Fotage/`**. NEVER duplicate, copy, or hard-link the unpacked file into the project root directory.
     - **NO shortcut folders, aliases, or symlinks**:
       - **NEVER create shortcut folders, aliases, or symlinks for Footage** (e.g. NEVER run `symlinkSync('Fotage', 'Footage')` or create a shortcut/alias folder).
       - NEVER create symlinks inside `Fotage/` (e.g. `Fotage/Links -> ../Links` or `Fotage/Fonts -> ../Fonts`).
       - Access all project assets directly from their real physical directory without shortcut or symlink indirection.
     - **NO backup clutter**: Absolutely NO `.bak`, `.bak2`, `*_backup.ai`, or dated backup files left in the project directory or inside `Fotage/`.
     - **NO temporary or lock files**: Clean up all `~ai*.tmp`, `.DS_Store` accumulation, or lingering scratch files.
     - **NO scratch scripts in project folders**: All ExtendScript (`.jsx`) and helper automation scripts MUST be executed headlessly from `/tmp` and deleted immediately; never save temporary scripts inside the user's project folder.
     - **Unpack with PDF Compatibility**: Always save the unpacked artwork with `pdfCompatible = true` directly into `Fotage/<Name>_Unpacked.ai` so After Effects reads every layer cleanly.
2. **Background Star Separation & Center-Anchor Rotation Protocol**:
   - In Illustrator: If `BG_Stars` contains multiple groups (e.g. 2 big starburst groups in opposite corners), release the clipping mask (`clipped = false`), delete the clipping mask path, and divide the artwork into discrete named top-level layers (`BG_Stars_1`, `BG_Stars_2`, etc.).
   - In After Effects:
     - Import the `.ai` file as `ImportAsType.COMP_CROPPED_LAYERS` so each star layer is cropped to its exact vector bounding box and its **Anchor Point** is automatically positioned at the geometric center of each star.
     - This ensures each star rotates smoothly in place around its own center without orbiting across the screen.
     - Stack star layers directly above `BG_Base` (and beneath `Header_Specials`, `BG_Disclaimer`, and offers).
     - **Rotation**: Linear rotation from 0.0s to 9.0s followed by a static hold through 10.0s, alternating clockwise ($0^\circ \to +180^\circ$) and counter-clockwise ($0^\circ \to -180^\circ$).
     - **Entrance**: Smooth opacity fade-in ($0\% \to 100\%$) over the first $0.5\text{s}$ (frames 0–15).
     - **Motion Blur**: Enable `motionBlur = true` on both layers.
3. **Multi-Software Lifecycle Management**:
   - When using 2 or more applications simultaneously (Illustrator CC + After Effects CC), keep both applications open and running throughout execution.
   - Upon completion, **keep both projects open** in Illustrator and After Effects so the user can immediately preview, scrub, and inspect the live composition.
4. **No Video Exporting (Keep Project Open)**:
   - Do NOT render or export video deliverables (`.mp4`, `.mov`, `.gif`) upon completion unless explicitly requested by the user.
   - Save native project files (`.aep`, `.ai`) and keep the composition active in After Effects.
5. **Timeline & Static Hold Rules**:
   - **Total Comp Duration**: Exactly **10.0 seconds** at **`30.0 fps`** (total 300 frames).
   - **Active Timeline**: Strictly frames 0 to 270 ($0.0\text{s}$ to $9.0\text{s}$).
   - **Static Hold**: Strict **1.0-second static hold** between **`9.0s` and `10.0s`** (frames 270 to 300). All layers, including stars, must remain visually static. A settling keyframe may occur at 9.0s; no keys may occur after 9.0s. Verify evaluated property values at every remaining frame so expressions are also checked.
   - **Comp Renderer**: Use Classic 3D. Historically its scripting identifier is `ADBE Advanced 3d`; check the installed version supports this identifier and verify the selected renderer in the app. The similarly named Advanced 3D UI option is a separate engine. Do not infer a renderer solely from its internal name.
6. **Strict Invariant — Preserve All User Edits Inside Animation & Artwork**:
   - **ALWAYS keep and protect any changes, edits, or manual adjustments made by the user inside the animation or artwork**, even while you are actively working on other elements or stages.
   - **NEVER** revert, overwrite, reset, or discard the user's manual keyframes, timing adjustments, layer tweaks, custom easings, scale/position nudges, copy changes, or font selections unless the user explicitly instructs you to modify that specific item.
   - Any automated adjustments or script runs must be surgical and non-destructive: update ONLY the targeted layer/property without resetting the rest of the user's composition.

### 3. Standardized 30.0 FPS Choreography Spine
- **Background Elements (present for 0.0s–10.0s, rotation ends at frame 270)**:
  - `BG_Base`, `BG_Border`, `Header_Specials`: Static at bottom of layer stack.
  - `BG_Stars_1` (Top-Left): Linear rotation through frame 270, then static through the end ($0^\circ \to +180^\circ$), 0.5s fade-in.
  - `BG_Stars_2` (Bottom-Right): Linear rotation through frame 270, then static through the end ($0^\circ \to -180^\circ$), 0.5s fade-in.
- **Header Sequence (`0.17s` – `1.50s`)**:
  - `Header_Logo`: 80px drop from above at frame 5 (f5–f21) + opacity fade (f5–f17).
  - `Header_Title`: Unified drop with both campaign title and "specials" at frame 17 (f17–f33) + opacity fade (f17–f29).
  - `BG_Disclaimer` (*"18+ only"*): Horizontal slide from left at frame 27 (f27–f45) + opacity fade (f27–f40).
- **4-Step Product Choreography (Offers 1, 2, 3)**:
  - Stagger: Offer 1 at frame 40 ($1.33\text{s}$), Offer 2 at frame 90 ($3.00\text{s}$), Offer 3 at frame 140 ($4.67\text{s}$).
  - Step 1: Placed item scale $92\% \rightarrow 100\%$ + opacity fade (15 frames).
  - Step 2: Badge pop-bounce scale $0\% \rightarrow 108\% \rightarrow 100\%$ (15 frames, starts $+11$ frames).
  - Step 3: Title ribbon horizontal slide $\pm 80\text{px} \rightarrow 0\text{px}$ (18 frames, starts $+21$ frames).
  - Step 4: PriceTag 3D fold-down flap on X-axis $-90^\circ \rightarrow +16^\circ \rightarrow -6^\circ \rightarrow 0^\circ$ (20 frames, starts $+33$ frames).
- **Offer 4 & Black Box Footer Choreography (frames 189–270 / `6.30s` – `9.00s`)**:
  - In placements featuring the black footer callout bar (e.g. *"Your next visit could be on us. -> [Book now]"* or *"BOOK YOUR TABLE"*), split the artwork into 4 discrete vector layers in Illustrator:
    1. `Footer_Box` (or `Offer4_Base`): The solid black footer background container.
    2. `Footer_Text` (or `Offer4_Text`): The typography / copy (*"Your next visit could be on us."*).
    3. `Footer_Arrow`: The directional indicator / arrow vector.
    4. `CTA_Button` (or `Offer4_PriceTag`): The pill button (*"Book now"* or *"BOOK YOUR TABLE"*).
  - **4-Step Footer Sequence**:
    - **Step 1 — Black Box Entrance (f195–f213 / 18 frames)**: `Footer_Box` slides up smoothly from below the frame (`Position [x, y + 120] -> [x, y]`) with cubic easing + opacity fade (`0% -> 100%`).
    - **Step 2 — Copy Slide from Left (f201–f216 / 15 frames)**: `Footer_Text` slides in horizontally from the left (`Position [x - 150, y] -> [x, y]`) with smooth deceleration + opacity fade, starting +6 frames after the box begins.
    - **Step 3 — Arrow Slide from Left (f205–f217 / 12 frames)**: `Footer_Arrow` slides in horizontally from the left (`Position [x - 80, y] -> [x, y]`) with opacity fade, leading the eye toward the CTA button.
    - **Step 4 — CTA Button Pop-Bounce (f215–f230 / 15 frames)**: `CTA_Button` pops in with an elastic overshoot scale bounce (`Scale 0% -> 108% -> 100%`), followed by an organic attention pulse, settling into absolute static rest by frame 270 ($9.00\text{s}$).

### 4. Automated Execution & Verification
The bridge includes its own `scripts/build_ae_animation.jsx` dependency. Run it through Antigravity only when motion production is requested. Prepare an approved single-artboard copy with visible, uniquely named top-level layers before calling the bridge. Required names include BG_Base, Header_Logo, Header_Title, Offer1–Offer3 each with _Product, _Badge, _Title, and _PriceTag, plus fourth-offer or CTA layers as present in the approved artwork. Transfer artwork to these layers using an explicit reviewed content mapping while preserving appearance and stacking. The bridge validates the prepared structure and rejects a grouped master instead of claiming it has unpacked it. It never guesses content roles or discards artwork.

Use a fresh project output folder. Existing unpacked AI and AEP outputs trigger a failure to preserve manual edits. The builder is for new projects; update existing compositions surgically in Antigravity. The --master option resolves multiple source files. The --placement option validates the artboard dimensions.

Run the unified bridge runner:
```bash
node <loaded-skill-directory>/scripts/motion_bridge.js --folder "/path/to/Campaign_Folder"
```
Automated verification tests must pass before handoff:
1. `comp.numLayers` matches unpacked layer count.
2. `comp.frameRate === 30.0` and `comp.duration === 10.0`.
3. Missing footage count `=== 0`.
4. Static hold audit confirms zero late keys and unchanged evaluated property values on frames 270–299, including expression-driven layers.
5. Any failed or unreadable check exits with a failure and identifies the affected property or layer. A missing audit report also fails. Generated files remain unverified until corrected.
6. Perform a visual preview in After Effects after numeric checks, including nested compositions and effects. Property sampling alone does not prove the final render remains visually static.

