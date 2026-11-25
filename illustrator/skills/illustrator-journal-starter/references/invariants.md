# Invariant Design Rules (illustrator-journal-starter)

These rules are mandatory and non-negotiable for all journal canvas generations:

## 1. Verbatim Content Preservation
- **Never edit, rewrite, shorten, paraphrase, or hallucinate copy.**
- The text provided in the brief must appear **word-for-word** on the artboards.
- Punctuation, dashes, numbers, and casing from the brief must be preserved exactly as given.

## 2. Strictly Zero Vector Generation (No Icons, No Logos, No Cards)
- **Never attempt to draw vector icons, logos, monograms, badges, wireframes, or decorative card shapes.**
- The user handles all graphic/vector design. The skill/agent must NEVER generate synthetic vector illustrations or icons.
- Only place typography (clean, unflattened, editable text frames) and imagery.

## 3. Per-Slide Reference Placement Outside Artboards (ALWAYS According to Slide)
> [!IMPORTANT]
> **STRICT INVARIANT: If the user provides a link for reference, you HAVE TO PLACE IT OUTSIDE OF THE ARTBOARD ACCORDING TO SLIDE ALWAYS.**
- **Slide-by-Slide 1:1 Mapping**:
  - When a reference design link or image set is provided (e.g., an Instagram carousel, multi-slide link, or collection of reference images), **ALWAYS extract each individual reference slide and place it outside of its corresponding artboard**.
  - Slide 1 reference -> Placed outside Artboard 1 (`Slide_01_ReferenceOutside`, aligned directly above the artboard: `left = abLeft`, `top = abTop + refH + 80`, scaled to match artboard width `W`).
  - Slide 2 reference -> Placed outside Artboard 2 (`Slide_02_ReferenceOutside`, aligned directly above Artboard 2).
  - Slide 3 reference -> Placed outside Artboard 3 (`Slide_03_ReferenceOutside`, aligned directly above Artboard 3).
  - Slide `N` reference -> Placed outside Artboard `N` (`Slide_N_ReferenceOutside`, aligned directly above Artboard `N`).
  - **Never place only a single slide's reference** when a multi-slide carousel reference is given.
  - This allows the user to visually cross-check and verify content accuracy slide-by-slide directly against each respective artboard.
- All extracted text must be placed **on the artboard** as editable typography reflecting the design's visual hierarchy.

## 4. Rapid Shortened Execution (No Over-Understanding Delays)
- Do not stall execution with extensive multi-step questionnaires when the user provides a reference design or brief.
- Automatically detect aspect ratio from attached images (`sips`), default to clean Modern typography (`Montserrat-Bold` / `Inter-Regular`), extract all verbatim copy, place the reference image outside the artboard, place the text on the artboard, and finish in seconds.

## 5. Enforce In-Place Updates & Never Clear Canvas
- **Do not delete or recreate entire layers or workspaces; update existing elements in-place by name or ID without clearing the canvas.**
- Target existing named elements (`<Slide_Name>_Photo`, `<Slide_Name>_SubText`, `<Slide_Name>_MainHighlight`) when updating an open document.

## 6. Keep Documents Open in Memory (Zero Closing & Zero Reopen Cycles)
- **Keep the target document open in memory throughout the execution; strictly eliminate closing and reopening files.**
- Never run `app.quit()`, never close active documents with `close(SaveOptions.DONOTSAVECHANGES)` while the user is actively working.
- **Zero Reopen Cycles**: Never close a file and reopen it from disk (`app.open()`) to refresh state. Work directly in the active open document in memory (`app.activeDocument`).
- Save in-place with `doc.save()` or `doc.saveAs(saveTarget, saveOpts)` with `pdfCompatible = true; compressed = true;` so macOS Finder QuickLook previews and icon thumbnails render the design artwork cleanly. Keep the document open and ready for immediate editing.

## 7. Preserve User Live Edits & Branch to New Artboard on Divergence
- The user actively makes changes inside Illustrator while work is underway.
- **Never overwrite or revert manual edits made by the user.**
- If there is a discrepancy between the user's manual design direction and the script/agent's path, **do not overwrite the modified artboard**; instead, **add a new artboard** (`doc.artboards.add(...)`) and perform the work on the new artboard, preserving the user's manual artboard intact.

## 8. Brief Heading = File Name Only
- The top line / title of the brief (e.g. `1. SHINE A LIGHT - World Children’s Day (Nov 20)`) is the **File Name** only (e.g. `SHINE A LIGHT - World Children's Day (Nov 20).ai`).
- **Never** place the file name or document title as a text frame onto Artboard 1 unless explicitly requested by the user.
- Only place the actual `SLIDE 1` .. `SLIDE N` copy on the artboards.

## 9. Artboard Image Clipping on Full-Bleed Imagery
- When a background photo is placed to cover an artboard, clip it inside artboard bounds.
- When a reference design is supplied to match copy against, place it **outside of the artboard** on the canvas/pasteboard.

## 10. Continuous Paragraph Text with Auto-Sizing Applied (Never Split Related Copy into 2-3 Fragmented Parts)
- **Text data near each other are part of each other**: Related sentences, address lines, event details, or clauses that visually or semantically belong together must **NEVER be broken into multiple fragmented text frames** (do not split into artificial Part 1 / Part 2 / Part 3 pieces, and do not create separate point text frames for each individual line).
- **Keep as Continuous Cohesive Paragraphs**: Enter the copy into a single continuous text frame formatted as a cohesive paragraph (using natural line breaks `\n` within the same text frame where appropriate).
- **Mandatory Area Type Options Auto-Size Applied**: Every paragraph text frame must have **Auto Size** applied (`Type > Area Type Options... > [✔] Auto Size`). The frame height dynamically calculates from the actual rendered lines and leading (`Math.ceil((lineCount * leading) + (fontSize * 0.5))`), snapping the bounding box snugly to the text with zero overset text and zero empty space. Furthermore, the native Illustrator Auto-Size Type action (`adobe_SLOAreaTextDialog` key `1952539754` value 1) is applied to the frame so live typing or editing in Illustrator automatically resizes the text box in real time.
- **Always Tick / Open Hyphenate**: Every paragraph text frame must always have **Hyphenate** enabled (`tf.textRange.paragraphAttributes.hyphenation = true`) in the Paragraph panel so words cleanly hyphenate across lines without awkward spacing or unintended overflow.
- This ensures the text looks identical to the design while remaining fully continuous, clean, and easily editable by the user without juggling disconnected floating text snippets.
- **Shell Variable Safety (`$` Preservation)**: Always write the brief to a temp file using a single-quoted heredoc (`cat << 'EOF' > /tmp/brief.txt`) and pass `--brief-file /tmp/brief.txt` so currency amounts like `$18` are never expanded/stripped by bash/zsh.

## 11. Clean Two-Layer Canvas Architecture (Strictly Zero Vectors)
- **Layer 1 (Bottom)**: `Images` (linked photos / outside reference design).
- **Layer 2 (Top)**: `Text` (clean, unflattened editable area & point text frames).
- Strictly zero synthetic vector shapes, icons, logos, badges, or decorative card frames.

## 12. Direct Native Image Placement (`~/Downloads` — Zero `.PSD` Conversion)
- **Download images directly in their native format (`.jpg`, `.png`) to `~/Downloads`**.
- **Do NOT convert images to `.psd`** (`sips -s format psd` is removed to eliminate conversion overhead).
- **Never embed raster images** (`pItem.embed()` is strictly forbidden). Placed images remain linked native image files.

## 12. High-Speed Execution (<1s ExtendScript) & AppleEvent Timeout Prevention
- Set `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;` and use `app.activeDocument = doc;` instead of `doc.activate();` so background AppleEvents never block in macOS `aeInteractWithUser`.
- Skip relinking `existingImg.file = imgFile` during in-place updates if `existingImg.file.fsName === imgFile.fsName`.
- When saving master `.ai` files via ExtendScript, set `saveOpts.pdfCompatible = true; saveOpts.compressed = true;`. This guarantees macOS Finder thumbnails and Spacebar QuickLook previews display the artwork cleanly without the blank "saved without PDF Content" warning, while keeping document saves fast (~1-3s).
- Download all assets in parallel before invoking ExtendScript, and reuse existing files in `~/Downloads` if already downloaded.

## 13. Strictly Zero JPEG Exports (Save Master .ai to Desktop & Keep Open)
- **Never generate or export JPEG files or previews** (`~/Desktop/Output`). The user explicitly does NOT want JPEG outputs.
- **Only save the master `.ai` file directly to `~/Desktop`** (`~/Desktop/<FileName>.ai`).
- **Ensure the document is open and active in Adobe Illustrator** for immediate user editing and design work.
- **Strict Zero-Drive Policy**: Never upload, export, or write files to Google Drive (`~/Library/CloudStorage/GoogleDrive-...`), Dropbox, OneDrive, iCloud Drive, or any external drive.
