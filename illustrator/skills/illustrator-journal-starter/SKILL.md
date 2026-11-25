---
name: illustrator-journal-starter
description: Unified Illustrator Design Starting Point & Brand Template Transformation skill. Sets up clean, unflattened journal/carousel canvases from briefs via headless ExtendScript (per-slide outside references, continuous auto-sized & hyphenated paragraphs, zero synthetic vectors, Desktop .ai only) and transforms existing brand templates (brand naming, legacy artifact purge, official SVG marks, 64pt/28pt two-tier hierarchy, 90° geometry, bounds audit).
version: 2.1.0
triggers:
  - "startup illustrator skill"
  - "design starting point"
  - "illustrator journal starter"
  - "setup brief in illustrator"
  - "start carousel from brief"
  - "brand carousel template"
  - "template transformation"
  - "design journal setup"
---

# Illustrator Journal Starter & Design Starting Point (`illustrator-journal-starter`)

Unified skill for **brief-to-canvas journal/carousel setup** and **brand-compliant template transformation** in **Adobe Illustrator**.

Read the mandatory design invariants before executing:
[invariants.md](./references/invariants.md)

---

## 1. Non-Negotiable Invariants (Brief-to-Journal Setup)

1. **100% Verbatim Copy:** Never shorten, rewrite, or hallucinate slide text. Preserve punctuation, dashes, numbers, and casing word-for-word.
2. **Strictly Zero Synthetic Vectors (Brief Setup Mode):** Never draw synthetic vector icons, logos, monograms, badges, or decorative cards when setting up a journal brief canvas—place only typography (`Text` layer) and linked imagery (`Images` layer).
3. **Per-Slide Reference Placement Outside Artboards:**
   > [!IMPORTANT]
   > When a carousel link or multi-slide reference image set is supplied, ALWAYS place each slide's reference directly outside its matching artboard (`Slide_01_ReferenceOutside` above Artboard 1, `Slide_02_ReferenceOutside` above Artboard 2, etc., aligned `left = abLeft`, `top = abTop + refH + 80`, scaled to artboard width `W`). Never place only Slide 1.
4. **Continuous Paragraph Text (Auto-Size + Hyphenate):**
   - Never split cohesive sentences or bullet blocks into fragmented point-text snippets; keep them as continuous paragraph frames (`\n` line breaks inside one frame).
   - Enable **Area Type Options Auto-Size** (`adobe_SLOAreaTextDialog` key `1952539754` = `1`) and **Hyphenate** (`tf.textRange.paragraphAttributes.hyphenation = true`).
5. **Keep Documents Open in Memory (Zero Reopen Cycles):** Never run `doc.close()`, `app.quit()`, or close-and-reopen cycles; work in `app.activeDocument`.
6. **Preserve Live User Edits:** Never overwrite user-modified artboards; on divergence, add a new artboard (`doc.artboards.add(...)`) below the original (`rect[3] - GAP`, within `±8192 pt` canvas limits).
7. **Brief Heading = File Name Only:** Use the brief's title as `~/Desktop/<FileName>.ai` (never place the file title onto Artboard 1).
8. **Direct Native Image Placement & Desktop-Only `.ai` Output:**
   - Download images directly into `~/Downloads` as `.jpg`/`.png` and place as **Linked Items** (`pItem.file = imgFile`, zero `.psd` conversion, zero `.embed()`).
   - Save master `.ai` directly to `~/Desktop` with `pdfCompatible = true; compressed = true;`.
   - **Never export JPEGs (`~/Desktop/Output`) and never write to Google Drive / cloud storage.**

---

## 2. Rapid CLI Setup (`scripts/run_journal_setup.js`)

Write the brief via a single-quoted heredoc (`'EOF'`) so `$` currency values are never expanded by zsh/bash, then run immediately:

```bash
cat << 'EOF' > /tmp/brief.txt
<paste verbatim brief here>
EOF
node /Users/admin/.gemini/config/skills/illustrator-journal-starter/scripts/run_journal_setup.js \
  --brief-file /tmp/brief.txt \
  [--font-main "PlayfairDisplay-Bold"] [--font-sub "Inter-Regular"] [--outside]
```

*(Reference template script also available at `scripts/setup_carousel_starting_point.jsx`.)*

### Verification in CLI Runner
- Inspects every text frame across all artboards (`visibleChars < totalChars ? OVERSET : ALL_TEXT_VISIBLE_OK`) so zero copy is clipped.

---

## 3. Brand Template Transformation Mode (Existing Carousel Decks)

When transforming an existing multi-slide Illustrator template deck into a brand-compliant carousel (`1080 × 1350 pt` 4:5 portrait):

1. **Brand File Naming Sovereignty:** Immediately Save-As using the active brand name (`~/Desktop/<BrandName>_Carousel_Master.ai`)—never leave legacy client names in the active file name.
2. **Legacy Artifact Purge vs. Structural Retention:** Remove obsolete logos, watermarks, and brand-specific shapes while preserving universal divider lines, grid axes, and column guides (adjust type scale/position rather than deleting scaffolding).
3. **Official Brand SVG Marks:** Extract official vector SVG marks from Figma or brand guidelines (never draw synthetic approximations). Adapt light/dark fills per slide contrast and use compact monograms (`~167 × 167 pt`) on narrative slides.
4. **Strict Two-Tier Typography & Punchline Accents:**
   - Consistent headline scale (`64 pt` / `80 pt` leading) and consistent body/subheading scale (`28 pt` / `38–42 pt` leading) across all slides; wrap lines instead of shrinking font sizes.
   - Highlight 2–3 punchline words per headline in the brand accent color.
5. **Sharp 90° Geometry & Area-Text Fallback:** Enforce 90° sharp corners (`CornerType.ROUNDED` forbidden unless brand guidelines require it), convert overflowing point text to bounded Area Text frames, and audit all artboard `geometricBounds` before keeping the file open in Illustrator.
