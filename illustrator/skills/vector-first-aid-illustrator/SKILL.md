---
name: vector-first-aid-illustrator
description: "Diagnose, repair, and clean up messy Adobe Illustrator vector files, stray points, unpainted paths, barely-open paths, redundant clipping masks, single-child groups, empty text frames, and fragmented text lines without requiring third-party plugins. Replicates Astute Graphics' VectorFirstAid panel."
version: 1.0.0
triggers:
  - "vector first aid"
  - "vectorfirstaid"
  - "cleanup illustrator vector"
  - "fix vector document"
  - "illustrator cleanup"
  - "remove stray points"
  - "merge text lines illustrator"
  - "clean up open paths"
---

# VectorFirstAid for Adobe Illustrator (ExtendScript & CLI)

A native, standalone cleanup and optimization toolkit for **Adobe Illustrator** that replicates the functionality of Astute Graphics' **VectorFirstAid** panel. It diagnoses and fixes technical errors, structural junk, and geometry flaws commonly found in CAD/EPS/PDF imports or traced artwork.

---

## 1. Quick Start

### Mode A: Interactive ScriptUI Panel (Inside Adobe Illustrator)
The script has been installed directly into Illustrator's user scripts folder:

1. In Adobe Illustrator, open any document.
2. Go to **File > Scripts > VectorFirstAid** (or press `Ctrl+F12` / `Cmd+F12` and choose `VectorFirstAid.jsx`).
3. Click **Check Document** to scan for technical errors.
4. Select any item in the audit list and click **Show** to highlight it on canvas, or click **Fix Selected** / **Fix All** to repair everything in one atomic undo step.

Script Location:
* **Interactive Panel**: [VectorFirstAid.jsx](file:///C:/Users/DEEP/.gemini/config/skills/vector-first-aid-illustrator/scripts/VectorFirstAid.jsx)
* **User Presets**: `C:\Users\DEEP\AppData\Roaming\Adobe\Adobe Illustrator 29 Settings\en_US\x64\Scripts\VectorFirstAid.jsx`

---

### Mode B: Headless CLI Runner (Terminal / Background Tasks)
You can run automated diagnostic scans or fixes headlessly from the command line:

```bash
# Non-destructive scan of active document:
node C:/Users/DEEP/.gemini/config/skills/vector-first-aid-illustrator/scripts/run_vector_first_aid.js --scan

# Scan only the current selection:
node C:/Users/DEEP/.gemini/config/skills/vector-first-aid-illustrator/scripts/run_vector_first_aid.js --scan --selection

# Automatically fix all detected issues:
node C:/Users/DEEP/.gemini/config/skills/vector-first-aid-illustrator/scripts/run_vector_first_aid.js --fix-all

# Fix all issues and purge unused swatches:
node C:/Users/DEEP/.gemini/config/skills/vector-first-aid-illustrator/scripts/run_vector_first_aid.js --fix-all --purge-swatches
```

---

## 2. Capabilities & Rules Supported

| Rule / Feature | What It Does | Why It Matters |
| :--- | :--- | :--- |
| **Remove Stray Points** | Deletes isolated single-anchor points with no fill or stroke. | Stray points corrupt bounding boxes, inflate file size, and cause Pathfinder calculation failures. |
| **Remove Unpainted Paths** | Deletes invisible non-clipping paths that lack both fill and stroke. | Leftover geometry from PDF/CAD imports that clutters selections. |
| **Close Barely-Open Paths** | Closes paths whose start and end anchor points are within $\le 2.5\text{ pt}$ distance. | Prevents gap leaks during live paint and rasterization errors. |
| **Close Unclosed Filled Paths** | Automatically sets `closed = true` on filled paths left unclosed. | Fixes rendering glitches and uneven stroke endings. |
| **Remove Empty Text Frames** | Purges text frames containing zero characters or only whitespace/tabs. | Invisible rogue text boxes that mess up alignment tools. |
| **Collapse Redundant Clipping Masks**| Removes empty masks or masks that wrap only a single item. | Simplifies complex PDF clipping groups. |
| **Flatten Single-Child Groups** | Unwraps unnecessary single-child nested groups. | Flattens redundant group hierarchies for cleaner editing. |
| **Merge Text Lines** | Recombines disconnected point text lines into a single multiline frame. | Fixes fragmented sentences caused by opening PDFs in Illustrator. |
| **Purge Unused Resources** | Removes unreferenced color swatches, symbols, and graphic styles. | Drastically reduces `.ai` file size. |

---

## 3. Architecture & File Inventory

* `scripts/VectorFirstAid.jsx`: Complete standalone ScriptUI dialog with interactive controls, quick tools, results listbox, and zoom-to-issue highlighting.
* `scripts/VectorFirstAidCore.jsx`: Pure ExtendScript logic library containing inspection algorithms and repair handlers.
* `scripts/run_vector_first_aid.js`: Node.js CLI runner for terminal automation and agent tasks.
