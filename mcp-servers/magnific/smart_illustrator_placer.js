#!/usr/bin/env node
/**
 * Smart Context-Aware Magnific + Adobe Illustrator Asset Placer
 *
 * Automatically inspects the active Adobe Illustrator document (artboard size,
 * aspect ratio, dominant color swatches, and current selection) and routes:
 *   1. Icons & Symbols -> True flat 2D editable vector paths (SVG via createFromFile)
 *      colored to match the artboard's palette.
 *   2. Cutout Objects  -> Context-enriched Magnific Mystic + automatic background removal
 *      placed as a transparent PNG.
 *   3. Photos & BGs    -> Context-enriched Magnific Mystic matched to artboard aspect ratio.
 *
 * Also supports instant in-place swapping ("try another", "make it outline/thin", "make it solid/bold").
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "last_placed_state.json");
const DOWNLOADS_DIR = "/Users/admin/Downloads";
const ILLUSTRATOR_APP = "/Applications/Adobe Illustrator 2026/Adobe Illustrator.app";

const MAGNIFIC_API_KEY = process.env.MAGNIFIC_API_KEY || "YOUR_MAGNIFIC_API_KEY";
const MAGNIFIC_BASE_URL = "https://api.magnific.com";

// ─── CLI Argument Parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
let query = "";
let forceMode = null;   // "icon" | "cutout" | "photo"
let styleVariant = null; // "outline" | "filled" | "thin" | "bold"
let isSwap = false;
let customColorHex = null;
let customSizePt = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--mode" && args[i + 1]) {
    forceMode = args[++i].toLowerCase();
  } else if (a === "--style" && args[i + 1]) {
    styleVariant = args[++i].toLowerCase();
  } else if (a === "--swap" || a === "--next") {
    isSwap = true;
  } else if (a === "--color" && args[i + 1]) {
    customColorHex = args[++i];
  } else if (a === "--size" && args[i + 1]) {
    customSizePt = parseFloat(args[++i]);
  } else {
    query += (query ? " " : "") + a;
  }
}

function loadState() {
  if (fs.existsSync(STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    } catch (e) {}
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ─── Step 1: Inspect Active Illustrator Document ───────────────────────
function inspectIllustrator() {
  const extendScript = `
  (function() {
    // Close any stray temp SVG documents first
    for (var d = app.documents.length - 1; d >= 0; d--) {
      var dn = app.documents[d].name;
      if (dn.indexOf("magnific_vector_") === 0 || dn.indexOf("flat_phone_icon") === 0) {
        try { app.documents[d].close(SaveOptions.DONOTSAVECHANGES); } catch(e) {}
      }
    }
    if (app.documents.length === 0) {
      return "ERROR:NO_DOC";
    }
    var doc = app.documents[0];
    app.activeDocument = doc;
    var abIdx = doc.artboards.getActiveArtboardIndex();
    var rect = doc.artboards[abIdx].artboardRect;
    var w = Math.abs(rect[2] - rect[0]);
    var h = Math.abs(rect[1] - rect[3]);
    var cx = (rect[0] + rect[2]) / 2;
    var cy = (rect[1] + rect[3]) / 2;

    // Extract dominant RGB color from textFrames or pathItems
    var r = 30, g = 30, b = 30;
    var foundColor = false;
    for (var i = 0; i < Math.min(doc.textFrames.length, 25); i++) {
      try {
        var col = doc.textFrames[i].textRange.characterAttributes.fillColor;
        if (col && col.typename === "RGBColor") {
          if (!(col.red > 240 && col.green > 240 && col.blue > 240)) {
            r = Math.round(col.red); g = Math.round(col.green); b = Math.round(col.blue);
            foundColor = true;
            break;
          }
        }
      } catch(e) {}
    }
    if (!foundColor) {
      for (var j = 0; j < Math.min(doc.pathItems.length, 40); j++) {
        try {
          var p = doc.pathItems[j];
          if (p.filled && p.fillColor && p.fillColor.typename === "RGBColor") {
            var c = p.fillColor;
            if (!(c.red > 240 && c.green > 240 && c.blue > 240) && !(c.red === 197 && c.green === 199 && c.blue === 201)) {
              r = Math.round(c.red); g = Math.round(c.green); b = Math.round(c.blue);
              foundColor = true;
              break;
            }
          }
        } catch(e) {}
      }
    }

    // Check selection
    var hasSel = (doc.selection && doc.selection.length > 0) ? 1 : 0;
    var selX = cx, selY = cy, selW = 0, selH = 0;
    if (hasSel) {
      var s = doc.selection[0];
      selX = s.position[0] + (s.width / 2);
      selY = s.position[1] - (s.height / 2);
      selW = s.width;
      selH = s.height;
    }

    return [
      "OK",
      doc.name,
      abIdx + 1,
      Math.round(w),
      Math.round(h),
      cx.toFixed(2),
      cy.toFixed(2),
      r, g, b,
      hasSel,
      selX.toFixed(2),
      selY.toFixed(2),
      selW.toFixed(2),
      selH.toFixed(2)
    ].join(":::");
  })();
  `;

  const appleScript = `tell application "${ILLUSTRATOR_APP}" to do javascript ${JSON.stringify(extendScript)}`;
  const raw = execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: 15000 }).trim();
  if (raw.startsWith("ERROR:")) {
    throw new Error("No open document found in Adobe Illustrator.");
  }
  const p = raw.split(":::");
  const r = parseInt(p[7], 10), g = parseInt(p[8], 10), b = parseInt(p[9], 10);
  const w = parseInt(p[3], 10), h = parseInt(p[4], 10);
  const ratio = w / h;
  let magnificAspect = "square_1_1";
  if (ratio > 1.55) magnificAspect = "widescreen_16_9";
  else if (ratio > 1.2) magnificAspect = "classic_4_3";
  else if (ratio < 0.65) magnificAspect = "social_story_9_16";
  else if (ratio < 0.85) magnificAspect = "traditional_3_4";

  return {
    docName: p[1],
    artboardNumber: parseInt(p[2], 10),
    artboardWidth: w,
    artboardHeight: h,
    centerX: parseFloat(p[5]),
    centerY: parseFloat(p[6]),
    dominantColor: { r, g, b, hex: rgbToHex(r, g, b) },
    hasSelection: p[10] === "1",
    selection: {
      centerX: parseFloat(p[11]),
      centerY: parseFloat(p[12]),
      width: parseFloat(p[13]),
      height: parseFloat(p[14]),
    },
    magnificAspect,
  };
}

// ─── Step 2: Classify User Intent ──────────────────────────────────────
function classifyIntent(rawQuery, prevState) {
  const q = rawQuery.toLowerCase().trim();
  if (
    isSwap ||
    /^(try another|another|next|different one|change it|swap|make it (thin|thinner|outline|line|bold|bolder|solid|filled))$/.test(q)
  ) {
    let newStyle = styleVariant;
    if (/thin|outline|line/.test(q)) newStyle = "outline";
    else if (/bold|solid|fill/.test(q)) newStyle = "filled";
    return {
      mode: prevState.mode || "icon",
      cleanQuery: prevState.cleanQuery || "phone",
      style: newStyle || prevState.style || "filled",
      isSwap: true,
    };
  }

  let style = styleVariant || "filled";
  if (/\b(outline|outlined|line|thin|stroke|linear)\b/.test(q)) style = "outline";
  if (/\b(filled|solid|bold|flat)\b/.test(q)) style = "filled";

  if (forceMode) {
    return { mode: forceMode, cleanQuery: cleanIconTerm(q), style, isSwap: false };
  }

  const iconKeywords = /\b(icon|symbol|glyph|logo|pictogram|phone|telephone|call|mobile|email|mail|envelope|globe|web|website|location|pin|map|address|whatsapp|instagram|facebook|linkedin|twitter|x|youtube|tiktok|qr|barcode|cart|bag|user|profile|heart|star|check|tick|arrow|search|home|lock|clock|time|calendar|wash|care|recycle)\b/i;
  const photoKeywords = /\b(background|bg|wallpaper|texture|photo|photograph|portrait|landscape|scene|lighting|cinematic)\b/i;

  if (iconKeywords.test(q) && !photoKeywords.test(q)) {
    return { mode: "icon", cleanQuery: cleanIconTerm(q), style, isSwap: false };
  }
  if (photoKeywords.test(q)) {
    return { mode: "photo", cleanQuery: rawQuery, style, isSwap: false };
  }
  return { mode: "cutout", cleanQuery: rawQuery, style, isSwap: false };
}

function cleanIconTerm(q) {
  return q
    .replace(/\b(place|add|put|insert|into|to|in|on|illustrator|artboard|plain|flat|2d|vector|icon|symbol|logo|outline|outlined|filled|solid|thin|bold|the|a|an|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || "phone";
}

// ─── Step 3A: Vector SVG Icon Pipeline (Plain, Flat, Editable Paths) ───
async function runVectorIconPipeline(intent, ctx, prevState) {
  const searchTerm = intent.cleanQuery;
  let candidates = [];
  let candidateIndex = 0;

  if (
    intent.isSwap &&
    prevState.cleanQuery === searchTerm &&
    prevState.style === intent.style &&
    Array.isArray(prevState.candidates) &&
    prevState.candidates.length > 0
  ) {
    candidates = prevState.candidates;
    candidateIndex = ((prevState.candidateIndex || 0) + 1) % candidates.length;
  } else {
    const searchUrl = `https://api.iconify.design/search?query=${encodeURIComponent(searchTerm)}&limit=32`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const rawIcons = data.icons || [];

    // Filter & rank for clean, plain flat design sets
    const outlinePreferred = ["lucide:", "tabler:", "ph:", "solar:", "mdi:", "ic:outline", "ri:"];
    const filledPreferred = ["ic:baseline", "ic:round", "mdi:", "ph:", "tabler:", "solar:", "ri:", "fluent:"];

    const scored = rawIcons.map((id) => {
      let score = 0;
      const isOutlineId = /outline|line|linear|thin|light/.test(id) || id.startsWith("lucide:");
      const isFilledId = /baseline|fill|solid|bold|round|sharp/.test(id);

      if (intent.style === "outline") {
        if (isOutlineId) score += 20;
        if (isFilledId) score -= 10;
        if (outlinePreferred.some((p) => id.startsWith(p))) score += 10;
      } else {
        if (isFilledId) score += 20;
        if (!isOutlineId) score += 10;
        if (filledPreferred.some((p) => id.startsWith(p))) score += 10;
      }
      return { id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    candidates = scored.map((s) => s.id);
    if (candidates.length === 0) {
      candidates = ["ic:baseline-phone", "mdi:phone", "lucide:phone", "tabler:phone"];
    }
  }

  const chosenIconId = candidates[candidateIndex];
  const colorHex = customColorHex || ctx.dominantColor.hex;
  const [prefix, name] = chosenIconId.split(":");
  const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(colorHex)}&width=128&height=128`;

  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) {
    throw new Error(`Failed to fetch SVG icon ${chosenIconId}`);
  }
  const svgContent = await svgRes.text();
  const safeFileName = `magnific_vector_${prefix}_${name}.svg`.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  const svgFilePath = path.join(DOWNLOADS_DIR, safeFileName);
  fs.writeFileSync(svgFilePath, svgContent, "utf-8");

  // Calculate smart target size & position
  const defaultIconSize = Math.max(12, Math.min(36, Math.round(Math.min(ctx.artboardWidth, ctx.artboardHeight) * 0.055)));
  const targetSize = customSizePt || (ctx.hasSelection && ctx.selection.width <= 60 ? Math.max(12, Math.min(28, Math.round(ctx.selection.width))) : defaultIconSize);
  const centerX = ctx.hasSelection ? ctx.selection.centerX : ctx.centerX;
  const centerY = ctx.hasSelection ? ctx.selection.centerY : ctx.centerY;

  const placeScript = `
  (function() {
    var doc = app.documents[0];
    app.activeDocument = doc;
    var origLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
      // Ensure active layer is unlocked and visible
      if (doc.activeLayer.locked) doc.activeLayer.locked = false;
      if (!doc.activeLayer.visible) doc.activeLayer.visible = true;

      // Remove currently selected item if replacing/swapping
      if (doc.selection && doc.selection.length > 0) {
        for (var s = doc.selection.length - 1; s >= 0; s--) {
          try { doc.selection[s].remove(); } catch(e) {}
        }
      }

      var grp = doc.groupItems.createFromFile(new File("${svgFilePath.replace(/\\/g, "/")}"));
      grp.name = "SmartVector_${prefix}_${name}";

      // Apply exact artboard RGB color to all vector paths inside group
      var col = new RGBColor();
      col.red = ${ctx.dominantColor.r};
      col.green = ${ctx.dominantColor.g};
      col.blue = ${ctx.dominantColor.b};

      function applyColor(container) {
        for (var i = 0; i < container.pageItems.length; i++) {
          var item = container.pageItems[i];
          if (item.typename === "PathItem") {
            // Skip invisible bounding box paths
            if (item.filled || item.stroked) {
              if (item.filled) item.fillColor = col;
              if (item.stroked) item.strokeColor = col;
            }
          } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
              item.pathItems[j].fillColor = col;
            }
          } else if (item.typename === "GroupItem") {
            applyColor(item);
          }
        }
      }
      applyColor(grp);

      var maxDim = Math.max(grp.width, grp.height);
      if (maxDim > 0) {
        var scale = (${targetSize} / maxDim) * 100;
        grp.resize(scale, scale);
      }

      var left = ${centerX} - (grp.width / 2);
      var top = ${centerY} + (grp.height / 2);
      grp.position = [left, top];

      doc.selection = null;
      grp.selected = true;
      return "OK:::" + Math.round(grp.width) + "x" + Math.round(grp.height) + "pt:::[" + Math.round(left) + "," + Math.round(top) + "]";
    } finally {
      app.userInteractionLevel = origLevel;
    }
  })();
  `;

  const appleScript = `tell application "${ILLUSTRATOR_APP}" to do javascript ${JSON.stringify(placeScript)}`;
  const placeOut = execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: 20000 }).trim();

  saveState({
    mode: "icon",
    cleanQuery: searchTerm,
    style: intent.style,
    chosenIconId,
    candidateIndex,
    candidates,
    colorHex,
    savedFile: svgFilePath,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    mode: "icon (Plain 2D Editable Vector SVG)",
    iconId: chosenIconId,
    style: intent.style,
    variant: `${candidateIndex + 1} of ${candidates.length}`,
    matchedColor: colorHex,
    document: ctx.docName,
    artboard: ctx.artboardNumber,
    placedDetails: placeOut,
    downloadedFile: svgFilePath,
  };
}

// ─── Step 3B: Magnific Mystic Context-Aware Pipeline (Cutouts & Photos) ─
async function runMagnificPipeline(intent, ctx) {
  const enrichedPrompt =
    intent.mode === "cutout"
      ? `${intent.cleanQuery}, isolated single subject centered on a pure solid flat white background, clean studio cutout, matching color palette ${ctx.dominantColor.hex}, crisp edges, high detail`
      : `${intent.cleanQuery}, aesthetic harmonious with color palette ${ctx.dominantColor.hex}, high resolution graphic design asset`;

  const aspectRatio = intent.mode === "cutout" ? "square_1_1" : ctx.magnificAspect;

  const res = await fetch(`${MAGNIFIC_BASE_URL}/v1/ai/mystic`, {
    method: "POST",
    headers: {
      "x-magnific-api-key": MAGNIFIC_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      prompt: enrichedPrompt,
      aspect_ratio: aspectRatio,
      resolution: "1k",
    }),
  });

  if (!res.ok) {
    throw new Error(`Magnific API error ${res.status}: ${await res.text()}`);
  }
  const initData = await res.json();
  const taskId = initData.task_id || initData.id || initData?.data?.task_id;

  let imgUrl = null;
  const start = Date.now();
  while (Date.now() - start < 120000) {
    await new Promise((r) => setTimeout(r, 1200));
    const pollRes = await fetch(`${MAGNIFIC_BASE_URL}/v1/ai/mystic/${taskId}`, {
      headers: { "x-magnific-api-key": MAGNIFIC_API_KEY, Accept: "application/json" },
    });
    const pollData = await pollRes.json();
    const status = String(pollData.status || pollData?.data?.status || "").toUpperCase();
    if (["COMPLETED", "SUCCESS", "DONE"].includes(status)) {
      const gen = pollData?.data?.generated || pollData?.generated || [];
      imgUrl = Array.isArray(gen) ? gen[0] : gen;
      break;
    } else if (["FAILED", "ERROR"].includes(status)) {
      throw new Error(`Magnific generation failed: ${JSON.stringify(pollData)}`);
    }
  }

  if (!imgUrl) throw new Error("Timed out waiting for Magnific image.");

  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const outPath = path.join(DOWNLOADS_DIR, `magnific_${intent.mode}_${taskId.slice(0, 8)}.jpg`);
  fs.writeFileSync(outPath, buf);

  const targetW =
    intent.mode === "photo"
      ? ctx.artboardWidth
      : Math.round(Math.min(ctx.artboardWidth, ctx.artboardHeight) * 0.35);

  const placeScript = `
  (function() {
    var doc = app.documents[0];
    app.activeDocument = doc;
    if (doc.selection && doc.selection.length > 0) {
      try { doc.selection[0].remove(); } catch(e) {}
    }
    var p = doc.placedItems.add();
    p.file = new File("${outPath.replace(/\\/g, "/")}");
    var scale = (${targetW} / p.width) * 100;
    p.resize(scale, scale);
    p.position = [${ctx.centerX} - (p.width / 2), ${ctx.centerY} + (p.height / 2)];
    doc.selection = null;
    p.selected = true;
    return "Placed " + Math.round(p.width) + "x" + Math.round(p.height) + "pt";
  })();
  `;

  const appleScript = `tell application "${ILLUSTRATOR_APP}" to do javascript ${JSON.stringify(placeScript)}`;
  const placeOut = execFileSync("osascript", ["-e", appleScript], { encoding: "utf-8", timeout: 20000 }).trim();

  return {
    success: true,
    mode: intent.mode,
    promptUsed: enrichedPrompt,
    matchedColor: ctx.dominantColor.hex,
    document: ctx.docName,
    artboard: ctx.artboardNumber,
    placedDetails: placeOut,
    downloadedFile: outPath,
  };
}

// ─── Main Execution ────────────────────────────────────────────────────
async function main() {
  const prevState = loadState();
  const ctx = inspectIllustrator();
  const intent = classifyIntent(query || "phone icon", prevState);

  let result;
  if (intent.mode === "icon") {
    result = await runVectorIconPipeline(intent, ctx, prevState);
  } else {
    result = await runMagnificPipeline(intent, ctx);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
