# Adobe Illustrator Universal Menu Automation Specification

This document maps all 10 tabs of the Adobe Illustrator menu bar into automated, programmatic calls for the `autonomous-ad-designer` pipeline.

---

## 1. Quick Invocation Guide

Use `scripts/illustrator_menu_controller.js`:

```javascript
const { executeFastCommand, clickMenuItemPath, executeDOMScript } = require('./illustrator_menu_controller');

// Fast native command execution
executeFastCommand('outline'); // Converts all selected text to outlines
executeFastCommand('expand');  // Expands appearances and strokes
executeFastCommand('fitin');   // Fits artboard on screen

// UI Path execution for deep submenus
clickMenuItemPath('Effect > Stylize > Drop Shadow...');
clickMenuItemPath('Window > Pathfinder');

// Full DOM Scripting
executeDOMScript(`
    var doc = app.activeDocument;
    var rect = doc.pathItems.rectangle(800, 200, 400, 200);
    var col = new RGBColor(); col.red = 255; col.green = 212; col.blue = 75;
    rect.fillColor = col;
`);
```

---

## 2. Complete Tab-by-Tab Automation Mapping

### 1. Illustrator (App Settings)
- **Safe Headless Execution**: `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;`
- **Coordinate System Normalization**: `app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;`

### 2. File Tab (Lifecycle, IO & Export)
- **Create Canvas**: `app.documents.add(DocumentColorSpace.RGB, 1080, 1080)`
- **Place Hero/Reference**: `doc.placedItems.add()`
- **Batch Export**:
  - PNG-24: `doc.exportFile(file, ExportType.PNG24, pngOptions)`
  - Print PDF: `doc.saveAs(file, pdfOptions)`
  - Package: `app.executeMenuCommand('Package')`

### 3. Edit Tab (Clipboard & Palette)
- **Paste in Front (Exact X/Y)**: `app.executeMenuCommand('pasteFront')` (`Cmd + F`)
- **Paste in Place**: `app.executeMenuCommand('pasteInPlace')` (`Shift + Cmd + V`)
- **Global Recolor**: Iterating through `doc.pathItems` or `app.executeMenuCommand('Recolor Art')`

### 4. Object Tab (Vector Primitives, Transforms & Masks)
- **Group / Ungroup**: `app.executeMenuCommand('group')` / `app.executeMenuCommand('ungroup')`
- **Clipping Mask**: `app.executeMenuCommand('makeMask')` (`Cmd + 7`)
- **Compound Path**: `app.executeMenuCommand('compoundPath')` (`Cmd + 8`)
- **Expand Appearance**: `app.executeMenuCommand('expandStyle')`
- **Outline Stroke**: `app.executeMenuCommand('Live Outline Stroke')`
- **Transform Each**: `app.executeMenuCommand('Transform Each')`

### 5. Type Tab (Typography Engine)
- **Create Area Text**: `doc.textFrames.areaText(boundaryPath)`
- **Apply Typographic Scale**: `charAttr.size`, `charAttr.tracking`, `charAttr.textFont`
- **Create Outlines (Zero missing font errors)**: `app.executeMenuCommand('outline')` (`Shift + Cmd + O`)

### 6. Select Tab (Precision Filtering & First Aid)
- **Select All**: `app.executeMenuCommand('selectall')`
- **Select Same Fill Color**: `app.executeMenuCommand('Find Fill Color menu item')`
- **Select Same Stroke Weight**: `app.executeMenuCommand('Find Stroke Weight menu item')`
- **Purge Stray Points**: Filter `doc.pathItems` where `pathPoints.length <= 1` or unpainted.
- **Purge Empty Text Frames**: Filter `doc.textFrames` where content is whitespace.

### 7. Effect Tab (Live Appearances & Luxury Styling)
- **Raster Resolution Check**: `doc.rasterEffectSettings.resolution = 300`
- **Live Drop Shadow**: `app.executeMenuCommand('Live Drop Shadow')`
- **Live Gaussian Blur**: `app.executeMenuCommand('Live Gaussian Blur')`
- **Live Pathfinder**: `app.executeMenuCommand('Live Pathfinder Add')`
- **3D & Materials**: `app.executeMenuCommand('Live Round 3D')`

### 8. View Tab (Canvas Verification)
- **Fit Artboard in Window**: `app.executeMenuCommand('fitin')` (`Cmd + 0`)
- **Fit All Artboards**: `app.executeMenuCommand('fitall')` (`Opt + Cmd + 0`)
- **Toggle Outline View (Wireframe)**: `app.executeMenuCommand('preview')` (`Cmd + Y`)
- **Smart Guides / Rulers**: `app.executeMenuCommand('smartGuides')` / `app.executeMenuCommand('ruler')`

### 9. Window Tab (Panel Orchestration)
- **Reset Workspace**: `app.executeMenuCommand('Reset Essentials')`
- **Docked Panels**:
  - Layers: `app.executeMenuCommand('Layers Palette')`
  - Pathfinder: `app.executeMenuCommand('Pathfinder')`
  - Color & Swatches: `app.executeMenuCommand('Color')` / `app.executeMenuCommand('Swatches')`
  - Transform: `app.executeMenuCommand('Transform')`

### 10. Help Tab (Dynamic Command Fallback)
- Wrapped in automated `try/catch` handlers with auto-fallback to DOM manipulation.
