#!/usr/bin/env node
/**
 * Headless Magnific / Freepik Asset Downloader
 * 
 * Short flags:
 *   -n <limit>       (default: 1)
 *   -o <h|v|s|p>     (orientation: h=horizontal, v=vertical, s=square, p=panoramic)
 *   -t <p|v|psd|all> (type: p=photo, v=vector, psd=psd, all)
 *   -l <p|f|all>     (license: p=premium, f=free, all. default: p)
 *   -a <x|o|all>     (ai: x=exclude, o=only, all. default: x)
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const API_KEY = process.env.MAGNIFIC_API_KEY || "YOUR_MAGNIFIC_API_KEY";
const BASE_URL = "https://api.magnific.com";
const DOWNLOADS_DIR = "/Users/admin/Downloads";

const args = process.argv.slice(2);
let term = "";
let license = "p";       // p (premium default)
let aiMode = "x";        // x (exclude AI default)
let contentType = "p";   // p (photo default)
let orientation = null;  // h, v, s, p
let limit = 1;           // 1 image default

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-n" && args[i + 1]) limit = parseInt(args[++i], 10);
  else if (a === "-o" && args[i + 1]) orientation = args[++i].toLowerCase();
  else if (a === "-t" && args[i + 1]) contentType = args[++i].toLowerCase();
  else if (a === "-l" && args[i + 1]) license = args[++i].toLowerCase();
  else if (a === "-a" && args[i + 1]) aiMode = args[++i].toLowerCase();
  // Support legacy long flags too
  else if (a === "--limit" && args[i + 1]) limit = parseInt(args[++i], 10);
  else if (a === "--orientation" && args[i + 1]) orientation = args[++i].toLowerCase();
  else if (a === "--type" && args[i + 1]) contentType = args[++i].toLowerCase();
  else if (a === "--license" && args[i + 1]) license = args[++i].toLowerCase();
  else if (a === "--ai" && args[i + 1]) aiMode = args[++i].toLowerCase();
  else if (a === "-h" || a === "--help") {
    printHelp();
    process.exit(0);
  } else if (!term) term = a;
  else term += " " + a;
}

function printHelp() {
  console.log(`
Short Syntax:
  dl "query" [-n count] [-o h|v|s] [-t p|v|psd] [-l p|f] [-a x|o]

Defaults (Zero Flags Needed):
  • License:      Premium (-l p)
  • AI:           Excluded (-a x)
  • Type:         Photo (-t p)
  • Count:        1 (-n 1)

Examples:
  dl "car"                 -> 1 premium, non-AI photo of a car
  dl "car" -o h            -> Horizontal photo
  dl "car" -o h -n 3       -> 3 horizontal photos
  dl "dubai skyline" -o v  -> Vertical photo
  dl "logo" -t v           -> Vector graphic
`);
}

if (!term) {
  printHelp();
  process.exit(0);
}

// Map short codes to full values
const orientationMap = { h: "horizontal", v: "vertical", s: "square", p: "panoramic" };
const typeMap = { p: "photo", v: "vector", psd: "psd" };

async function searchAndDownload() {
  const params = new URLSearchParams();
  params.append("term", term);
  params.append("limit", String(limit));

  // Content type
  const resolvedType = typeMap[contentType] || contentType;
  if (resolvedType && resolvedType !== "all") {
    params.append(`filters[content_type][${resolvedType}]`, "1");
  }

  // License (premium by default)
  if (license === "p" || license === "premium") {
    params.append("filters[premium]", "1");
  } else if (license === "f" || license === "free") {
    params.append("filters[free]", "1");
  }

  // AI-generated (exclude by default)
  if (aiMode === "x" || aiMode === "exclude") {
    params.append("filters[ai][excluded]", "1");
  } else if (aiMode === "o" || aiMode === "only") {
    params.append("filters[ai][only]", "1");
  }

  // Orientation
  const resolvedOri = orientationMap[orientation] || orientation;
  if (resolvedOri) {
    params.append(`filters[orientation][${resolvedOri}]`, "1");
  }

  console.log(`[DL] "${term}" | Limit: ${limit} | Orientation: ${resolvedOri || 'any'} | Type: ${resolvedType || 'photo'}`);

  const searchRes = await fetch(`${BASE_URL}/v1/resources?${params.toString()}`, {
    headers: { "x-magnific-api-key": API_KEY, "Accept": "application/json" }
  });

  if (!searchRes.ok) {
    throw new Error(`Search failed: HTTP ${searchRes.status} ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  const items = searchData?.data || [];
  if (items.length === 0) {
    console.log("No items found.");
    return [];
  }

  const downloaded = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dlRes = await fetch(`${BASE_URL}/v1/resources/${item.id}/download`, {
      headers: { "x-magnific-api-key": API_KEY, "Accept": "application/json" }
    });
    if (!dlRes.ok) continue;

    const dlData = await dlRes.json();
    const url = dlData?.data?.url;
    const origName = dlData?.data?.filename || `${item.id}.jpg`;
    const filename = `dl_${item.id}_${origName}`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const dest = path.join(DOWNLOADS_DIR, filename);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (res) => {
        if (res.statusCode !== 200) return reject();
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          const kb = Math.round(fs.statSync(dest).size / 1024);
          console.log(`✓ [${i+1}/${items.length}] Saved: file://${dest} (${kb} KB)`);
          downloaded.push(dest);
          resolve();
        });
      }).on('error', reject);
    });
  }
  return downloaded;
}

searchAndDownload().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
