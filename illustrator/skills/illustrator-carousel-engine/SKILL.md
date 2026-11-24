---
name: illustrator-carousel-engine
description: Create, revise, or audit editable multi-artboard carousels, timelines, and social decks in Adobe Illustrator. Use for reference-driven layout, style propagation, typography fitting, linked artwork, or production QA across slides.
---

# Illustrator Carousel Engine

Build or revise one editable Illustrator carousel at a time. Preserve supplied copy, intentional manual edits, and the document's established design. Use the brief and verified reference artboards to guide layout and typography.

## Scope the job

- Identify the requested mode: create, edit, or audit. An audit is read-only unless changes are requested. If the user specifies a start cue, inspect and plan until the cue arrives.
- Establish the source copy and slide order, target document and artboards, style reference, asset sources, and requested outputs. Use the open document when the user identifies it as the destination. If they delegate layout, choose reversible defaults. Resolve ambiguity about the intended content or file before changing it.
- For new work, use a user-specified destination first. The customary default is `~/Desktop/[N]. [TITLE]/[N]. [TITLE].ai` with linked assets in `Links/`. Create a working copy when using a master as a template. A disk copy omits unsaved edits. Use the intended source state and check for destination collisions before writing.
- Use the available, authorized Illustrator integration or supported scripting route. If document access or visual inspection is unavailable, complete the checks you can and state the verification gap.

## Inspect before editing

- Identify the document by its full path when available, or a verified open-document handle when a path cannot identify it. Record the requested artboard names, positions and bounds, target artwork and layers, and relevant copy and styles. Inspect links, fonts, and locked or hidden content where they affect the edit.
- Record enough of the target state to detect changes before the next batch. Recheck document and artboard identity and the relevant artwork after a modal, app switch, or user edit. Treat recent manual changes as the baseline. If the new state conflicts with the requested change, resolve that conflict before touching the affected items.
- Establish which objects belong to each target, especially at shared artboard edges or in threaded stories. Inspect existing guides, brand assets, and styled text before adding equivalents.

## Build and fit

- For a named design reference, use [Reference propagation](references/reference-propagation.md) to map source artwork to target roles and verify the first applied slide before expanding the batch. For a new standard portrait carousel without a reference, use [Layout and typography](references/layout-and-typography.md).
- Apply the [Lisa Kristine Authority Carousel design system](references/layout-and-typography.md#lisa-kristine-authority-carousel) to that series. Preserve its typefaces and image treatment as layouts change. For another project, derive the visual system from its own brief and reference.
- Keep live editable text and proportional glyphs. Preserve punctuation, numbers, and copy order. Adjust frame bounds, line breaks, font size, or leading to fit. Retain meaningful paragraph breaks and verify visible text through the last character.
- Apply changes in small batches to identified objects. Scope a new slide, guide, scrim, or asset to its intended artboard. Match existing guides and objects before creating them so a retry can continue from the document's current state.
- Use [Illustrator scripting and recovery](references/illustrator-scripting.md) when writing ExtendScript or recovering from a partial batch. Use [Artwork and links](references/artwork-and-links.md) for image sourcing, cropping, and relinking.
- Use [Run multi-artboard jobs efficiently](references/run-efficiently.md) when batching inspection, edits, or previews across a deck.

## Verify and deliver

- Check artboard order, copy, type styles and transforms, safe-area fit, and visible overlaps at reading size. Check that cover masks stay within bounds and that links resolve. Compare untouched artboards and manual edits against the starting state where they could have been affected.
- Distinguish document-structure checks from visual verification. A successful script or full text in the DOM does not establish that text rendered or fit. Use an available Illustrator preview or an approved preview snapshot scoped to the relevant artwork. Report any remaining uncertainty.
- Save when requested or inherent in delivering the edited file. Verify the actual destination and save state. Leave the resulting Illustrator document available for inspection when the workflow supports it. Export the formats and artboards the user requested.
- On a failure, establish that the previous operation has ended and inspect what actually changed before retrying. Remove only exact scratch files created for this run after confirming they are not referenced by the document. Report any edits present but unsaved and any unresolved visual or link checks.
