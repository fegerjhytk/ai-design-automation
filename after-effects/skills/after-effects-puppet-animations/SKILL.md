---
name: after-effects-puppet-animations
description: >-
  Prepare and animate Illustrator artwork in After Effects with ordered reading flow,
  complete visible-artwork coverage, intact complex appearances and group opacity,
  requested timing, batch processing, and one linked AI/AEP pair per input.
---

# Illustrator → After Effects reading-flow animation

Use the user's requested duration (default 10 seconds), actual Illustrator artboard dimensions, and a deliberate visual reading sequence. Edit the installed Antigravity scripts when fixing this workflow; do not merely provide a separate patch and claim the skill changed.

## Preserve the design

- Keep the original source unchanged. Work on a copy outside Desktop/Downloads before producing the final linked AI.
- Never ungroup, expand, outline, rasterize, flatten, alter opacity/blending, or split objects with complex effects, masks, clipping or group opacity. Animate the intact unit through AE layer transforms.
- Illustrator's scripting DOM does not reliably expose every live appearance. Treat an unverified group as protected. A group at 100% opacity is not proof that it has no effects. Do not infer safety from group size or text presence.
- Protected groups count as one animation unit; every visible descendant must be covered by that unit. Do not claim their children were independently animated.
- Safe independent objects may be promoted to separate top-level layers only after checking their ancestor appearance and verifying a before/after render. If a shared effect/opacity applies to a parent, preserve that entire parent. When safety cannot be established, stop structural decomposition and explain the specific grouped content that limits independent motion.
- Do not discard objects using midpoint/off-canvas heuristics. Preserve pasteboard artwork in the source; inspect which objects actually overlap the selected artboard. Report intentionally hidden objects separately.
- Resolve missing links/fonts before delivering a supposedly complete animation. Do not silently ignore a missing image. Never recreate or replace a logo without authorization.
- Preserve source color management and AE project depth. Forcing 8 bpc does not guarantee accurate color.

## Illustrator workspace: one working document

- Keep at most **one workflow-owned Illustrator document/tab open at a time**. Reuse the supplied file's existing document session or one working copy; do not open both alongside multiple review copies. Preserve all existing user-owned documents without closing, saving or rearranging them.
- Work inside the supplied file and its actual artboards. Do not create extra artboards, documents or tabs for inspection, tests, individual objects, SVG reviews, previews or intermediate saves.
- Handle filesystem copies, manifests, SVG parsing, comparison renders and other diagnostics in the background/cache. A temporary file on disk is not a reason to open it in Illustrator. Prefer filesystem inspection and exports from the existing document session.
- Some exports can change Illustrator's document identity. Track and restore that same session rather than reopening the original or exported file and leaving an additional tab behind. Before using the runner, ensure its preparation/export path follows this rule; instructions alone do not change the helper's behavior.
- Open an additional Illustrator document only when a required host operation genuinely cannot use the current session. Explain the specific need, keep that exception temporary, and close only that workflow-owned document as soon as the operation finishes. Never accumulate four or five working tabs.
- Process multiple supplied files sequentially. Finish and release the previous workflow-owned working document before opening the next; do not open a batch simultaneously. Retain only the requested current/final document for the user.
- When the user requests a skill-only edit, change the skill instructions only. Do not launch Adobe apps, run the animation, open documents or clean up the current workspace unless separately requested.

## Inspect, plan, animate, verify

1. Inspect the file and its appearance, groups, opacity and visible geometry. Identify independent animation units and record a coverage manifest: every visible leaf belongs to exactly one unit, directly or through a protected ancestor. Reuse the open document; don't repeatedly close/reopen it.
2. Build a story order from the layout: top-left logo/headings → left body → right container/headings → cards left-to-right → bottom ribbon/details. For another layout choose top-to-bottom or row-wise left-to-right. Geometry and an explicit reviewed recipe override misleading names such as `Bottom_...` on left body text.
3. Distribute foreground entrances across the active interval, not just the first 4–5 seconds of a 10-second brief. Use ordered neighboring handoffs; avoid distant sections entering out of sequence. Avoid starting many unrelated objects at once.
4. Animate every unit. Backgrounds receive subtle 0.8% breathing that returns to source scale; protected units receive whole-layer motion only. Preserve original opacity, scale, anchor and compositing at rest. Don't automatically turn every object into 3D or enable collapse transformations on complex appearances.
5. Use the requested composition duration, rounded only to the nearest video frame. Default hold is about 10%, capped at one second; explicit hold may be up to two seconds. Finish every key and ambient animation before hold with a shutter margin. Outpoints alone do not create a hold.
6. Validate AI/AE unit names and counts, no missed units, full visible-leaf coverage, monotonic reveal order, requested dimensions/duration, restored resting values and a motion-free hold. Inspect rendered snapshots across the sequence and sample multiple hold frames. Report host tests separately from Node mock tests.
7. If PDF import fails, check actual PDF-compatible save completion and isolate the problematic file/layer. `canImportAs` is not a decode guarantee. Don't retry by destructively altering effects or flattening everything.

## Output and project lifecycle

- Deliver exactly one same-name `.ai` and one `.aep` on Desktop for each input, unless the user requests another destination. AE must link to that final AI path.
- No extra Desktop/Downloads debug scripts, previews, recipes, duplicate AEPs or temporary folders. Put diagnostics, manifests, renders and backups under `~/.cache/antigravity/puppet-animations/` or the working workspace.
- Only remove workflow-created extras after identifying ownership. Use recoverable cleanup; never delete unrelated downloads or other design work. Don't report cleanup if none was necessary.
- Never edit/save/discard an unrelated AE project. Start in an empty project. Between batch inputs, close only the saved project owned by that invocation, and refuse if the user changed it.
- The final AE Project panel should contain the target composition and its Illustrator footage folder; no helper compositions, solids or unused imports. Keep the linked AI permanently.
- Release workflow-owned temporary/review documents immediately after use, even when unrelated user documents are open; never close the unrelated documents. Keep the requested current/final artwork available. `cleanup_illustrator.jsx` currently closes the final prepared document only when no other documents are open; it is not sufficient to enforce temporary-tab cleanup by itself.
- Existing final pairs must be reviewed/archived before replacement, never blindly deleted.

## Runtime

`scripts/cli_puppet_animator.js` loads `vendor/json2.js`, `puppet_core.jsx` and `flow_plan.jsx`, uses a unique cache receipt for each Adobe bridge call, and runs the selected JSX. Illustrator uses its explicit application path/raw scripting event to avoid terminology lookup failures.

```sh
node ~/.gemini/config/skills/after-effects-puppet-animations/scripts/cli_puppet_animator.js \
  --file '/absolute/path/Artwork.ai' --duration 10 --fps 24

# Multiple inputs: one final pair per input, no shared composition.
node ~/.gemini/config/skills/after-effects-puppet-animations/scripts/cli_puppet_animator.js \
  --file '/absolute/path/A.ai' '/absolute/path/B.ai' --duration 10

# Alternative flow and short hold
node ~/.gemini/config/skills/after-effects-puppet-animations/scripts/cli_puppet_animator.js \
  --file '/absolute/path/Artwork.ai' --duration 12 --flow top-bottom --hold-seconds 1
```

The conservative preparation runtime preserves existing top-level units intact. The appearance-review preparer exports a diagnostic SVG, accepts only plain identified container nodes, preserves unknown/opacity/clipping groups, and compares before/after renders before accepting decomposition. Logo → Christmas → Day → left body must be separate foreground units unless a real shared effect prevents separation. Decorative ornaments and pasteboard-only items may receive ambient motion without interrupting that reading order. A missing image is allowed only after explicit user authorization via `--allow-missing-links`; preserve its cached appearance and disclose the unresolved link. The runner refuses insufficient preparation rather than silently animating a whole poster as one clump.

Recipes use `schemaVersion: 3` with a complete `units` map assigning numeric `stage` and optional `background` per actual layer name. They describe ordering; source appearance values always come from the target artwork. Earlier track/extraction schemas require deliberate migration and must not silently fall back to partial auto-animation. See `references/recipe.md` for the current schema and ordering rules.

Run `node scripts/tests/flow-regression.cjs` for current planner and mock-host checks. An actual Illustrator/AE import, visual render and link check are required before declaring a delivered project validated.
