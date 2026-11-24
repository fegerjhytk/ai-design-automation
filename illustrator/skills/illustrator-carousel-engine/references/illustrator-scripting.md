# Illustrator scripting and recovery

Use Illustrator's supported scripting interface when available. Treat the examples here as workflow checks. Verify host-specific API behavior in a disposable document before using an unfamiliar operation on live artwork.

## Target and mutation checks

- Preflight document identity, artboard names and bounds, target parent layers or groups, text stories, links, and fonts before any write. Resolve a live document by full path when available, or by verified open-document handle when a path cannot identify it. A matching filename, active selection, or remembered artboard index is insufficient on its own.
- Capture the state needed to identify existing manual edits and distinguish your additions. Check the current state again immediately before a batch. Use artboard-relative coordinates derived from the current rectangle and map to the scripting coordinate system being used.
- Where supported, explicitly create objects in the intended parent. Verify that the object and its parent are editable. For path-to-area-text conversion, create the path in the intended layer and confirm the resulting frame's parent. Keep other layers' existing lock state. If a requested edit needs a temporary lock or visibility change, scope it to the target and restore it afterward.
- Adding a guide layer can change the active layer. Set an editable content layer active before further creation and before locking Guides. If Illustrator reports Error 8705, recheck the actual target and its ancestor locks, visibility, and active layer before retrying.
- Enter user text as data. Use an encoding-safe input or generated string literals with escaped control characters and Unicode as required by the host. Avoid interpolating raw copy or paths into executable code. Confirm smart punctuation and characters from the source in the resulting document.

## Overset and fit

- Check area type using Illustrator's overflow indicator or a composed-text check validated in the running host. Compare the full expected story with verified visible coverage and render the end of the text. Frame contents alone can include hidden text. An empty last line can be legitimate and can also be absent when overflow exists.
- For threaded text, verify the visible sequence across the complete story, including the final frame. Ensure the edit does not reflow out-of-scope artwork. Use a visual preview when native indicators or text-range evidence are incomplete.
- Use a finite series of fit adjustments with a safe area and a readable size floor. Check after each change and stop when there is no improvement or the bounds would be exceeded. Recheck for clipping even when the frame appears free of overflow.

## Batches, retry, and save

1. Stage uncertain geometry or scripts on a disposable copy when possible. For an in-place job, make a small first batch and verify it before continuing. Give new groups and guides stable identities and check for existing matches before creation.
2. Keep normal Illustrator alerts enabled when a response could affect missing fonts, links, color profiles, or writes. If alert suppression is appropriate for a known operation, restore the previous interaction setting in a finally block. Restore any temporary active layer, locks, and other document state as appropriate for the task.
3. If a command times out, triggers a modal, or fails partway, assume edits may already exist. Before issuing another write, confirm the previous operation has ended through the integration or Illustrator. If completion is uncertain, keep subsequent checks read-only until the operation can be resolved. Reinspect the target and resume only the unfinished changes. Remove or reverse only changes attributable to the failed batch when that will preserve user edits. Keep any useful recoverable state and report where it is if recovery requires a decision.
4. Verify the save in the intended document and path. On failure, read the error and check the document identity, save state, destination availability, and permission to write. After resolving a transient condition within scope, retry the intended path once and verify the result. If the save remains blocked, preserve the open work and report its save state and the cause. Use an alternate destination when the user has delegated that choice.

Adobe reference: [Install and run scripts in Illustrator](https://helpx.adobe.com/au/illustrator/desktop/automate-visualize-data/automate-actions/install-and-run-scripts.html).
