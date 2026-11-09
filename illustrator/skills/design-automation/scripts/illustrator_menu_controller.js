#!/usr/bin/env node

/**
 * illustrator_menu_controller.js
 * 
 * Provides universal, programmatic execution of ANY Adobe Illustrator menu command
 * across the entire menu bar:
 * File | Edit | Object | Type | Select | Effect | View | Window | Help
 * 
 * Supports three execution modes:
 * 1. Fast Native executeMenuCommand (headless ExtendScript string via execFileSync)
 * 2. Universal AppleScript UI Path Navigation (triggers any menu/submenu item)
 * 3. Direct DOM Script Execution (creates objects, modifies paths, styles typography)
 */

const { execFileSync } = require('child_process');

// Master native executeMenuCommand lookup table
const FAST_MENU_COMMANDS = {
  // File
  "new": "new",                          // File > New
  "open": "open",                        // File > Open
  "close": "close",                      // File > Close
  "save": "save",                        // File > Save
  "saveas": "saveas",                    // File > Save As
  "package": "Package",                  // File > Package
  
  // Edit
  "undo": "undo",                        // Edit > Undo
  "redo": "redo",                        // Edit > Redo
  "cut": "cut",                          // Edit > Cut
  "copy": "copy",                        // Edit > Copy
  "paste": "paste",                      // Edit > Paste
  "pasteFront": "pasteFront",            // Edit > Paste in Front (Cmd+F)
  "pasteBack": "pasteBack",              // Edit > Paste in Back (Cmd+B)
  "pasteInPlace": "pasteInPlace",        // Edit > Paste in Place (Shift+Cmd+V)
  "recolor": "Recolor Art",              // Edit > Edit Colors > Recolor Artwork
  
  // Object
  "group": "group",                      // Object > Group (Cmd+G)
  "ungroup": "ungroup",                  // Object > Ungroup (Shift+Cmd+G)
  "lock": "lock",                        // Object > Lock > Selection
  "unlockAll": "unlockAll",              // Object > Unlock All
  "hide": "hide",                        // Object > Hide > Selection
  "showAll": "showAll",                  // Object > Show All
  "makeMask": "makeMask",                // Object > Clipping Mask > Make (Cmd+7)
  "releaseMask": "releaseMask",          // Object > Clipping Mask > Release
  "compoundPath": "compoundPath",        // Object > Compound Path > Make (Cmd+8)
  "noCompoundPath": "noCompoundPath",    // Object > Compound Path > Release
  "expand": "Expand3",                   // Object > Expand...
  "expandStyle": "expandStyle",          // Object > Expand Appearance
  "outlineStroke": "Live Outline Stroke",// Object > Path > Outline Stroke
  "rasterize": "rasterize",              // Object > Rasterize...
  "transformEach": "Transform Each",     // Object > Transform > Transform Each

  // Type
  "outline": "outline",                  // Type > Create Outlines (Shift+Cmd+O)
  "findFont": "Find Font",               // Type > Find/Replace Font...

  // Select
  "selectAll": "selectall",              // Select > All (Cmd+A)
  "deselectAll": "deselectall",          // Select > Deselect (Shift+Cmd+A)
  "inverse": "Inverse",                  // Select > Inverse
  "sameFill": "Find Fill Color menu item", // Select > Same > Fill Color
  "sameStroke": "Find Stroke Color menu item", // Select > Same > Stroke Color
  "sameWeight": "Find Stroke Weight menu item", // Select > Same > Stroke Weight

  // Effects & Styles
  "dropShadow": "Live Drop Shadow",      // Effect > Stylize > Drop Shadow
  "roundedCorners": "Live Rounded Corners",
  "feather": "Live Feather",
  "gaussianBlur": "Live Gaussian Blur",
  "pathfinderAdd": "Live Pathfinder Add",
  "round3D": "Live Round 3D",

  // View
  "fitin": "fitin",                      // View > Fit Artboard in Window (Cmd+0)
  "fitall": "fitall",                    // View > Fit All in Window (Opt+Cmd+0)
  "actualsize": "actualsize",            // View > Actual Size (100%)
  "zoomIn": "zoomin",                    // View > Zoom In
  "zoomOut": "zoomout",                  // View > Zoom Out
  "preview": "preview",                  // View > GPU/CPU Preview (Cmd+Y)
  "showGrid": "showGrid",                // View > Show Grid
  "showGuides": "showGuides",            // View > Show Guides
  "lockGuides": "lockGuides",            // View > Lock Guides
  "smartGuides": "smartGuides",          // View > Smart Guides (Cmd+U)
  "ruler": "ruler",                      // View > Rulers

  // Window
  "layers": "Layers Palette",            // Window > Layers (F7)
  "pathfinder": "Pathfinder",            // Window > Pathfinder
  "color": "Color",                      // Window > Color (F6)
  "swatches": "Swatches",                // Window > Swatches
  "transform": "Transform",              // Window > Transform
  "resetEssentials": "Reset Essentials"  // Window > Workspace > Reset
};

function dismissActiveTool() {
  try {
    execFileSync("osascript", ["-e", 'tell application "System Events" to tell process "Adobe Illustrator" to key code 53'], { timeout: 2000 });
  } catch(e) {}
}

function executeFastCommand(commandKey) {
  dismissActiveTool();
  const cmd = FAST_MENU_COMMANDS[commandKey] || commandKey;
  const script = `app.executeMenuCommand("${cmd}"); app.redraw();`;
  const appleScript = `tell application "Adobe Illustrator" to do javascript ${JSON.stringify(script)}`;
  try {
    execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: 10000 });
    return { success: true, mode: "fast", command: cmd };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function clickMenuItemPath(menuPath) {
  const parts = Array.isArray(menuPath) ? menuPath : menuPath.split('>').map(s => s.trim());
  if (parts.length < 2) {
    throw new Error("Menu path requires at least a Top Menu and Item, e.g. 'View > Fit Artboard in Window'");
  }

  let appleScript = '';
  if (parts.length === 2) {
    const [menuBarItem, item] = parts;
    appleScript = `
tell application "System Events"
    tell process "Adobe Illustrator"
        set frontmost to true
        click menu item "${item}" of menu 1 of menu bar item "${menuBarItem}" of menu bar 1
    end tell
end tell`;
  } else if (parts.length === 3) {
    const [menuBarItem, subMenu, item] = parts;
    appleScript = `
tell application "System Events"
    tell process "Adobe Illustrator"
        set frontmost to true
        click menu item "${item}" of menu 1 of menu item "${subMenu}" of menu 1 of menu bar item "${menuBarItem}" of menu bar 1
    end tell
end tell`;
  } else if (parts.length === 4) {
    const [menuBarItem, sub1, sub2, item] = parts;
    appleScript = `
tell application "System Events"
    tell process "Adobe Illustrator"
        set frontmost to true
        click menu item "${item}" of menu 1 of menu item "${sub2}" of menu 1 of menu item "${sub1}" of menu 1 of menu bar item "${menuBarItem}" of menu bar 1
    end tell
end tell`;
  }

  try {
    execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: 10000 });
    return { success: true, mode: "ui_path", path: parts.join(' > ') };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function executeDOMScript(jsCode, timeoutMs = 60000) {
  dismissActiveTool();
  const appleScript = `tell application "Adobe Illustrator" to do javascript ${JSON.stringify(jsCode)}`;
  try {
    const raw = execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: timeoutMs });
    return { success: true, mode: "dom_script", output: raw.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  node illustrator_menu_controller.js --fast <commandKey> (e.g. outline, expandStyle, fitin)");
    console.log("  node illustrator_menu_controller.js --path 'Effect > Stylize > Drop Shadow...'");
    console.log("  node illustrator_menu_controller.js --dom 'app.activeDocument.pathItems.length'");
    process.exit(0);
  }

  if (args[0] === '--fast' && args[1]) {
    const res = executeFastCommand(args[1]);
    console.log(JSON.stringify(res, null, 2));
  } else if (args[0] === '--path' && args[1]) {
    const res = clickMenuItemPath(args[1]);
    console.log(JSON.stringify(res, null, 2));
  } else if (args[0] === '--dom' && args[1]) {
    const res = executeDOMScript(args.slice(1).join(' '));
    console.log(JSON.stringify(res, null, 2));
  }
}

module.exports = { executeFastCommand, clickMenuItemPath, executeDOMScript, FAST_MENU_COMMANDS };
