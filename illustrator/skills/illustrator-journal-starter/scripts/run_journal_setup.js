#!/usr/bin/env node
/**
 * run_journal_setup.js (High-Speed Native Image Engine)
 * Headless CLI for illustrator-journal-starter skill.
 * 
 * Features:
 * 1. Parallel asset downloader & web resolver (Google Drive, Framer CMS, Lisa Kristine, direct URLs).
 * 2. Direct native image placement (.jpg / .png in ~/Downloads) — ZERO .psd conversion and ZERO image editing.
 * 3. Never embeds raster images (keeps native images linked).
 * 4. Fast ExtendScript execution: `pdfCompatible = true; compressed = true;` (enables macOS Finder QuickLook previews).
 * 5. Robust clause tokenizer for (01):, em-dashes, and full stops with 100% verbatim copy preservation,
 *    automatically stripping inline image-editing notes on image URL lines.
 * 6. Automated overset text verification.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

function parseArgs(args) {
    const opts = {
        width: 1080,
        height: 1350,
        gap: 100,
        fontMain: 'PlayfairDisplay-Bold',
        fontSub: 'Inter-Regular',
        fontSizeMain: 46,
        leadingMain: 58,
        fontSizeSub: 28,
        leadingSub: 38,
        darkTheme: false,
        placeOutside: false,
        outputDir: path.join(process.env.HOME, 'Desktop'),
        downloadsDir: path.join(process.env.HOME, 'Downloads'),
        briefFile: null,
        briefText: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--brief-file') opts.briefFile = args[++i];
        else if (arg === '--brief') opts.briefText = args[++i];
        else if (arg === '--width') opts.width = parseInt(args[++i], 10);
        else if (arg === '--height') opts.height = parseInt(args[++i], 10);
        else if (arg === '--gap') opts.gap = parseInt(args[++i], 10);
        else if (arg === '--font-main') opts.fontMain = args[++i];
        else if (arg === '--font-sub') opts.fontSub = args[++i];
        else if (arg === '--font-size-main') opts.fontSizeMain = parseInt(args[++i], 10);
        else if (arg === '--leading-main') opts.leadingMain = parseInt(args[++i], 10);
        else if (arg === '--font-size-sub') opts.fontSizeSub = parseInt(args[++i], 10);
        else if (arg === '--leading-sub') opts.leadingSub = parseInt(args[++i], 10);
        else if (arg === '--output-dir') opts.outputDir = args[++i];
        else if (arg === '--dark') opts.darkTheme = true;
        else if (arg === '--outside' || arg === '--ref-outside') opts.placeOutside = true;
    }
    return opts;
}

function detectImageExt(filePath) {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        return '.png';
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
        return '.jpg';
    }
    return null;
}

async function resolveAndDownloadAsset(url, destBaseName, downloadsDir) {
    // Check if native .jpg or .png already exists in ~/Downloads
    for (const ext of ['.jpg', '.png']) {
        const existingPath = path.join(downloadsDir, `${destBaseName}${ext}`);
        if (fs.existsSync(existingPath) && fs.statSync(existingPath).size > 1024) {
            return existingPath;
        }
    }

    let directUrl = url;

    // 1. Google Drive direct link (read-only download)
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        directUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    } else if (url.includes('lisakristine.com') || (!url.match(/\.(jpg|jpeg|png|webp|svg)($|\?)/i) && url.startsWith('http'))) {
        // 2. Webpage portfolio: fetch HTML and extract og:image or high-res framer image in parallel
        try {
            const { stdout: html } = await execPromise(`curl -sL "${url}"`);
            const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
            if (ogMatch && ogMatch[1]) {
                directUrl = ogMatch[1].replace(/&amp;/g, '&');
            } else {
                const imgMatch = html.match(/https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/i);
                if (imgMatch) directUrl = imgMatch[0];
            }
        } catch (e) {
            console.warn(`Could not resolve web URL ${url}, trying direct download...`);
        }
    }

    const tmpRaw = path.join(os.tmpdir(), `${destBaseName}_${Date.now()}.raw`);
    await execPromise(`curl -sL "${directUrl}" -o "${tmpRaw}"`);

    const nativeExt = detectImageExt(tmpRaw);
    if (nativeExt) {
        // Zero conversion overhead: move directly to ~/Downloads as .jpg or .png
        const finalPath = path.join(downloadsDir, `${destBaseName}${nativeExt}`);
        fs.copyFileSync(tmpRaw, finalPath);
        fs.unlinkSync(tmpRaw);
        return finalPath;
    }

    // Fallback only if source is WebP/HEIC (convert to .jpg so Illustrator can link it)
    const finalJpg = path.join(downloadsDir, `${destBaseName}.jpg`);
    await execPromise(`sips -s format jpeg "${tmpRaw}" --out "${finalJpg}" >/dev/null`);
    await execPromise(`rm -f "${tmpRaw}"`);
    return finalJpg;
}

function parseBrief(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error("Empty brief provided");

    // Check if line 0 starts directly with a slide header
    const slideMatchLine0 = lines[0].match(/^(?:SLIDE\s*(\d+)|(\d+)\.)/i);
    let titleLine = "";
    let startIndex = 0;

    if (!slideMatchLine0) {
        // Line 0 is an explicit Title / File Name
        titleLine = lines[0].replace(/^[0-9]+[\.\)]\s*/, '').trim();
        startIndex = 1;
    }

    const slides = [];
    let currentSlide = null;

    // Matches "SLIDE 1 HEADLINE: ...", "SLIDE 1 HEADLINE ...", "SLIDE 1 (HOOK): ...", "SLIDE 1:", "SLIDE 1"
    const slideRegex = /^(?:SLIDE\s*(\d+)(?:\s*\((.*?)\))?|(\d+)\.)(?:\s*[:\-]\s*|\s+HEADLINE\s*[:\-]?\s*|\s+)?(.*)$/i;

    for (let i = startIndex; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^Reference:\s*/i) && slides.length === 0) continue;

        const match = line.match(slideRegex);

        if (match && (match[1] || match[3])) {
            const slideNum = match[1] || match[3] || (slides.length + 1);
            const tag = match[2] || (slideNum == 1 ? 'HOOK' : '');
            let rest = (match[4] || '').trim();
            rest = rest.replace(/^HEADLINE\s*[:\-]?\s*/i, '').trim();

            currentSlide = {
                num: parseInt(slideNum, 10),
                name: `Slide_${slideNum}${tag ? '_' + tag.replace(/[^a-zA-Z0-9]/g, '') : ''}`,
                rawLines: rest ? [rest] : [],
                imageUrl: null,
                imageUrls: [],
                imgLocalPath: null,
                hasBlackBg: false,
                part1: '',
                part2: ''
            };
            slides.push(currentSlide);
        } else if (currentSlide) {
            line = line.replace(/^BODY(?:\s+COPY)?\s*[:\-]?\s*/i, '').trim();
            if (line.length > 0) {
                currentSlide.rawLines.push(line);
            }
        }
    }

    if (!titleLine && slides.length > 0 && slides[0].rawLines.length > 0) {
        titleLine = slides[0].rawLines[0].trim();
    }

    // Process each slide for image links and non-repeating 2-part sentence division
    for (const slide of slides) {
        const cleanedLines = [];

        for (let line of slide.rawLines) {
            // Check for styling directives like "black background" or "BLACK BACKGROUND"
            if (line.match(/\bblack\s+background\b/i)) {
                slide.hasBlackBg = true;
                line = line.replace(/\bblack\s+background\b/gi, '').trim();
            }

            // Check for all markdown image links or raw URLs on the line
            const mdMatches = [...line.matchAll(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi)];
            const rawUrlMatch = line.match(/(https?:\/\/[^\s\)]+)/i);

            if (mdMatches.length > 0) {
                for (const m of mdMatches) {
                    slide.imageUrls.push(m[2]);
                }
                if (!slide.imageUrl) slide.imageUrl = slide.imageUrls[0];
                // Strip the entire image reference line (including any inline image notes like "blur..." or "or this...")
                continue;
            } else if (rawUrlMatch) {
                slide.imageUrls.push(rawUrlMatch[1]);
                if (!slide.imageUrl) slide.imageUrl = rawUrlMatch[1];
                // Strip the image URL line so inline image notes never pollute slide copy
                continue;
            }

            line = line.replace(/^:\s*/, '').trim();
            if (line.length > 0) {
                cleanedLines.push(line);
            }
        }

        // Merge standalone numbered prefix like "(01):" with the line that follows it
        if (cleanedLines.length >= 2 && /^(\(\d+\):|\d+\.)$/.test(cleanedLines[0])) {
            cleanedLines[1] = `${cleanedLines[0]} ${cleanedLines[1]}`;
            cleanedLines.shift();
        }

        const fullText = cleanedLines.join(' ').replace(/\s+/g, ' ').trim();
        let part1 = '';
        let part2 = '';

        // 1. If the brief explicitly has 2 separate copy lines (e.g. Hook Title on line 1 + Sub-line on line 2)
        if (cleanedLines.length >= 2) {
            part1 = cleanedLines[0];
            part2 = cleanedLines.slice(1).join(' ');
        } else {
            // 2. Single block of text: divide after full stop (. ) or em-dash ( — ) without EVER repeating content
            const numLabelMatch = fullText.match(/^(\(\d+\):|\d+\.|\bStep \d+:)\s*(.*)$/i);
            const prefix = numLabelMatch ? (numLabelMatch[1] + ' ') : '';
            const body = numLabelMatch ? numLabelMatch[2] : fullText;

            const firstDot = body.indexOf('. ');
            const dashIdx = body.indexOf(' — ');

            if (firstDot !== -1) {
                // Divide after the full stop
                part1 = (prefix + body.substring(0, firstDot + 1)).trim();
                part2 = body.substring(firstDot + 2).trim();
            } else if (dashIdx !== -1) {
                // Divide after the em-dash
                part1 = (prefix + body.substring(0, dashIdx + 3)).trim();
                part2 = body.substring(dashIdx + 3).trim();
            } else if (body.includes(', ')) {
                const commaIdx = body.indexOf(', ');
                part1 = (prefix + body.substring(0, commaIdx + 1)).trim();
                part2 = body.substring(commaIdx + 2).trim();
            } else {
                // Single undivided sentence (e.g. "(03): A debt as small as $18 can enslave a family for generations.")
                // Split cleanly before modal/verb ("can ", "is ", "are ", "will ", "must ") so zero words are repeated
                const verbMatch = body.match(/^(.*?)\s+\b(can|is|are|was|were|will|must|has|have)\b\s+(.*)$/i);
                if (verbMatch) {
                    part1 = (prefix + verbMatch[1]).trim();
                    part2 = `${verbMatch[2]} ${verbMatch[3]}`.trim();
                } else if (prefix) {
                    part1 = prefix.trim();
                    part2 = body.trim();
                } else {
                    part1 = body;
                    part2 = '';
                }
            }
        }

        slide.part1 = part1;
        slide.part2 = part2; // NEVER fallback to part1 — zero content repetition!
    }

    return { fileTitle: titleLine, slides };
}

function generateExtendScript(opts, parsedData) {
    const scriptPath = path.join(os.tmpdir(), 'generated_journal_setup.jsx');
    const safeTitle = parsedData.fileTitle.replace(/[\/\\:]/g, '_').replace(/"/g, '\\"');
    const saveFilePath = path.join(opts.outputDir, `${safeTitle}.ai`).replace(/"/g, '\\"');

    const slidesJson = JSON.stringify(parsedData.slides.map(s => ({
        name: s.name,
        imgPath: s.imgLocalPath,
        part1: s.part1,
        part2: s.part2
    })), null, 4);

    const jsx = `// High-Speed Headless Illustrator Journal Canvas Generator
#target illustrator
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

(function main() {
    var W = ${opts.width};
    var H = ${opts.height};
    var GAP = ${opts.gap};
    var NUM_SLIDES = ${parsedData.slides.length};
    var FILE_TITLE = "${safeTitle}";

    var SUB_FONT_SIZE   = ${opts.fontSizeSub};
    var SUB_LEADING     = ${opts.leadingSub};
    var MAIN_FONT_SIZE  = ${opts.fontSizeMain};
    var MAIN_LEADING    = ${opts.leadingMain};

    // 1. Locate open document or work directly in active document without closing/opening cycles
    var doc = null;
    for (var d = 0; d < app.documents.length; d++) {
        if (app.documents[d].name.indexOf(FILE_TITLE) !== -1) {
            doc = app.documents[d];
            break;
        }
    }
    if (!doc && app.documents.length > 0) {
        // Work directly in the active open document to eliminate closing/reopening
        doc = app.activeDocument;
    }
    var saveFile = new File("${saveFilePath}");
    if (!doc) {
        if (saveFile.exists) {
            doc = app.open(saveFile);
        } else {
            doc = app.documents.add(DocumentColorSpace.RGB, W, H, NUM_SLIDES, DocumentArtboardLayout.Row, GAP, NUM_SLIDES);
        }
    }
    app.activeDocument = doc;

    // Pre-load Area Type Options Auto-Size action for instant execution
    var actionFile = new File(Folder.temp + "/temp_autosize.aia");
    var aiaPayload = [
        "/version 3",
        "/name [ 15",
        "   4a6f75726e616c4175746f53697a65",
        "]",
        "/isOpen 1",
        "/actionCount 1",
        "/action-1 {",
        "    /name [ 18",
        "        53657441726561547970654f7074696f6e73",
        "    ]",
        "    /keyIndex 0",
        "    /colorIndex 0",
        "    /isOpen 0",
        "    /eventCount 1",
        "    /event-1 {",
        "        /useRulersIn1stQuadrant 0",
        "        /internalName (adobe_SLOAreaTextDialog)",
        "        /localizedName [ 17",
        "            417265612054797065204f7074696f6e73",
        "        ]",
        "        /isOpen 1",
        "        /isOn 1",
        "        /hasDialog 0",
        "        /parameterCount 1",
        "        /parameter-1 {",
        "            /key 1952539754",
        "            /showInPalette 4294967295",
        "            /type (integer)",
        "            /value 1",
        "        }",
        "    }",
        "}"
    ].join("\\n");
    actionFile.open("w");
    actionFile.write(aiaPayload);
    actionFile.close();
    var actionLoaded = false;
    try {
        try { app.unloadAction("JournalAutoSize", ""); } catch(eUnl) {}
        app.loadAction(actionFile);
        actionLoaded = true;
    } catch(eActLoad) {}

    var colBlack = new RGBColor(); colBlack.red = 0; colBlack.green = 0; colBlack.blue = 0;
    var colWhite = new RGBColor(); colWhite.red = 255; colWhite.green = 255; colWhite.blue = 255;

    function getFont(pref, fallback) {
        try { return app.textFonts.getByName(pref); } catch (e) {}
        try {
            var prefClean = pref.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (var f = 0; f < app.textFonts.length; f++) {
                var tfName = app.textFonts[f].name.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (tfName === prefClean || tfName.indexOf(prefClean) !== -1) {
                    return app.textFonts[f];
                }
            }
        } catch (e2) {}
        try { return app.textFonts.getByName(fallback); }
        catch (err) { return app.textFonts[0]; }
    }

    var fontSub  = getFont("${opts.fontSub}", "ArialMT");
    var fontMain = getFont("${opts.fontMain}", "Arial-BoldMT");

    var slides = ${slidesJson};

    // Safe Layer Resolution (Never wipe or recreate layers)
    var layerImages, layerText;
    try { layerImages = doc.layers.getByName("Images"); }
    catch(e) {
        if (doc.layers.length > 0) {
            layerImages = doc.layers[doc.layers.length - 1];
            layerImages.name = "Images";
        } else {
            layerImages = doc.layers.add();
            layerImages.name = "Images";
        }
    }

    try { layerText = doc.layers.getByName("Text"); }
    catch(e) {
        layerText = doc.layers.add();
        layerText.name = "Text";
    }

    function findItemByName(container, name) {
        for (var i = 0; i < container.pageItems.length; i++) {
            if (container.pageItems[i].name === name) return container.pageItems[i];
        }
        return null;
    }

    function findArtboardByName(name) {
        for (var a = 0; a < doc.artboards.length; a++) {
            if (doc.artboards[a].name === name) return { index: a, ab: doc.artboards[a] };
        }
        return null;
    }

    function getRightmostX() {
        var maxRight = 0;
        for (var a = 0; a < doc.artboards.length; a++) {
            var r = doc.artboards[a].artboardRect;
            if (r[2] > maxRight) maxRight = r[2];
        }
        return maxRight;
    }

    for (var i = 0; i < NUM_SLIDES; i++) {
        var s = slides[i];
        var abMatch = findArtboardByName(s.name);
        var ab = null;

        if (abMatch) {
            ab = abMatch.ab;
        } else if (i < doc.artboards.length && doc.artboards[i].name.indexOf("Artboard") === 0) {
            ab = doc.artboards[i];
            ab.name = s.name;
        } else {
            // Append artboard safely within canvas bounds
            var rightX = getRightmostX();
            var nLeft, nTop;
            if (rightX + GAP + W <= 7500) {
                nLeft = rightX + GAP;
                nTop = H;
            } else {
                nLeft = 0;
                nTop = -GAP;
            }
            ab = doc.artboards.add([nLeft, nTop, nLeft + W, nTop - H]);
            ab.name = s.name;
        }

        var rect = ab.artboardRect;
        var abLeft = rect[0];
        var abTop  = rect[1];

        // Check if user has manually repositioned elements on this artboard
        var existingTf1 = findItemByName(layerText, s.name + "_SubText");
        var userDiverged = false;
        if (existingTf1 && Math.abs(existingTf1.left - (abLeft + 80)) > 5) {
            userDiverged = true;
        }

        if (userDiverged) {
            // Non-destructive branching: place variation directly below the original artboard!
            var bLeft = abLeft;
            var bTop = rect[3] - GAP;
            ab = doc.artboards.add([bLeft, bTop, bLeft + W, bTop - H]);
            ab.name = s.name + "_v2";
            rect = ab.artboardRect;
            abLeft = rect[0];
            abTop = rect[1];
            existingTf1 = null;
        }

        var targetPrefix = ab.name;

        // 1. Linked Native Image placement (Outside Reference or Clipped Photo)
        if (s.imgPath) {
            var imgFile = new File(s.imgPath);
            if (imgFile.exists) {
                if (${opts.placeOutside}) {
                    var existingOutside = findItemByName(layerImages, targetPrefix + "_ReferenceOutside");
                    if (existingOutside) {
                        try { existingOutside.file = imgFile; } catch(e) {}
                    } else {
                        var pItem = layerImages.placedItems.add();
                        pItem.file = imgFile;
                        pItem.name = targetPrefix + "_ReferenceOutside";
                        var origW = pItem.width;
                        var origH = pItem.height;
                        var scale = W / origW;
                        var newW = W;
                        var newH = origH * scale;
                        pItem.width  = newW;
                        pItem.height = newH;
                        pItem.left   = abLeft;
                        pItem.top    = abTop + newH + 80; // Aligned directly above each matching artboard
                    }
                } else {
                    var existingGroup = findItemByName(layerImages, targetPrefix + "_ClippedPhoto") ||
                                        findItemByName(layerImages, targetPrefix + "_ClippedPSD");
                    if (existingGroup) {
                        existingGroup.name = targetPrefix + "_ClippedPhoto";
                        var existingImg = findItemByName(existingGroup, targetPrefix + "_Photo") ||
                                          findItemByName(existingGroup, targetPrefix + "_PSD");
                        if (existingImg) {
                            existingImg.name = targetPrefix + "_Photo";
                            var needsRelink = true;
                            try {
                                if (existingImg.file && existingImg.file.fsName === imgFile.fsName) {
                                    needsRelink = false;
                                }
                            } catch (e) {}
                            if (needsRelink) {
                                existingImg.file = imgFile;
                                var origW = existingImg.width;
                                var origH = existingImg.height;
                                var scale = Math.max(W / origW, H / origH);
                                var newW = origW * scale;
                                var newH = origH * scale;
                                existingImg.width  = newW;
                                existingImg.height = newH;
                                existingImg.left   = abLeft + (W - newW) / 2;
                                existingImg.top    = abTop - (H - newH) / 2;
                            }
                        }
                    } else {
                        var clipGroup = layerImages.groupItems.add();
                        clipGroup.name = targetPrefix + "_ClippedPhoto";

                        var pItem = clipGroup.placedItems.add();
                        pItem.file = imgFile;
                        pItem.name = targetPrefix + "_Photo";

                        var origW = pItem.width;
                        var origH = pItem.height;
                        var scale = Math.max(W / origW, H / origH);
                        var newW = origW * scale;
                        var newH = origH * scale;

                        pItem.width  = newW;
                        pItem.height = newH;
                        pItem.left   = abLeft + (W - newW) / 2;
                        pItem.top    = abTop - (H - newH) / 2;

                        var clipMask = clipGroup.pathItems.rectangle(abTop, abLeft, W, H);
                        clipMask.filled = false;
                        clipMask.stroked = false;
                        clipMask.clipping = true;
                        clipGroup.clipped = true;
                    }
                }
            }
        }

        var existingBg = findItemByName(layerImages, targetPrefix + "_BG");
        if (!existingBg && (${opts.placeOutside} || !s.imgPath)) {
            var bgRect = layerImages.pathItems.rectangle(abTop, abLeft, W, H);
            bgRect.fillColor = ${opts.darkTheme} ? colBlack : colWhite;
            bgRect.stroked = false;
            bgRect.name = targetPrefix + "_BG";
        }

        var textColor = ${opts.darkTheme} ? colWhite : colBlack;

        // Dynamic Auto-Sized Paragraph Helper
        function createOrUpdateAutoSizedParagraph(container, name, left, top, width, defaultHeight, text, font, fontSize, leading, color, align) {
            if (!text || text.length === 0) return { tf: null, height: 0 };
            
            var tf = findItemByName(container, name);
            if (tf) {
                tf.contents = text;
            } else {
                var p = container.pathItems.rectangle(top, left, width, defaultHeight);
                tf = container.textFrames.areaText(p);
                tf.name = name;
                tf.contents = text;
            }

            var ca = tf.textRange.characterAttributes;
            if (font) ca.textFont = font;
            ca.size = fontSize;
            ca.autoLeading = false;
            ca.leading = leading;
            if (color) ca.fillColor = color;
            var pa = tf.textRange.paragraphAttributes;
            if (align) pa.justification = align;
            pa.hyphenation = true; // Always tick / enable hyphenate for paragraph text frames

            return { tf: tf, height: tf.height };
        }

        // 2. Sub-Font Text Frame (Part 1) with Auto-Size applied
        var part1DefH = Math.round(H * 0.16);
        var part1Top  = s.imgPath ? (abTop - Math.round(H * 0.52)) : (abTop - Math.round(H * 0.35));
        var res1 = createOrUpdateAutoSizedParagraph(layerText, targetPrefix + "_SubText", abLeft + 80, part1Top, W - 160, part1DefH, s.part1, fontSub, SUB_FONT_SIZE, SUB_LEADING, textColor, Justification.LEFT);
        var part1ActualH = res1.height;

        // 3. Main Font Text Frame (Part 2 - Highlighted) with Auto-Size applied
        var part2DefH = Math.round(H * 0.28);
        var part2Top  = part1Top - (part1ActualH > 0 ? part1ActualH + 20 : 0);
        var res2 = createOrUpdateAutoSizedParagraph(layerText, targetPrefix + "_MainHighlight", abLeft + 80, part2Top, W - 160, part2DefH, s.part2, fontMain, MAIN_FONT_SIZE, MAIN_LEADING, textColor, Justification.LEFT);
    }

    app.redraw();

    // Two-pass native Auto-Size application on all text frames
    if (actionLoaded) {
        for (var f = 0; f < layerText.textFrames.length; f++) {
            var aTf = layerText.textFrames[f];
            if (aTf.kind === TextType.AREATEXT) {
                try {
                    doc.selection = null;
                    aTf.selected = true;
                    app.doScript("SetAreaTypeOptions", "JournalAutoSize");
                } catch(eAction) {}
            }
        }
    }

    // Clear selection so nothing remains highlighted
    try { doc.selection = null; } catch(eSel) {}

    // Unload temporary action
    if (actionLoaded) {
        try {
            app.unloadAction("JournalAutoSize", "");
            actionFile.remove();
        } catch(eUnload) {}
    }

    // High-speed in-place save: pdfCompatible = true enables macOS Finder QuickLook previews & thumbnails!
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    saveOpts.compressed = true;
    try {
        doc.save();
    } catch(eSave) {
        doc.saveAs(saveFile, saveOpts);
    }
})();

`;

    fs.writeFileSync(scriptPath, jsx);
    return { scriptPath, saveFilePath };
}

function runExtendScript(jsxPath) {
    console.log(`Executing ExtendScript in Adobe Illustrator...`);
    const cmd = `osascript -e 'with timeout of 180 seconds
      tell application "Adobe Illustrator" to do javascript (POSIX file "${jsxPath}")
    end timeout'`;
    execSync(cmd, { stdio: 'inherit' });
}

function verifyDocument() {
    const verifyScriptPath = path.join(os.tmpdir(), 'verify_doc.jsx');
    const diagScript = `// Diagnostic text frame overset and auto-size checker
var doc = app.activeDocument;
var out = [];
var autoSizeCount = 0;
for (var i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (tf.kind === TextType.AREATEXT) {
        var visibleChars = 0;
        for (var l = 0; l < tf.lines.length; l++) {
            visibleChars += tf.lines[l].characters.length;
        }
        var totalChars = tf.contents.length;
        if (visibleChars < totalChars) {
            out.push(tf.name + ": OVERSET (" + visibleChars + "/" + totalChars + " chars visible)");
        }

        // Test dynamic auto-size responsiveness
        var origText = tf.contents;
        var h1 = tf.height;
        tf.contents = origText + "\\rTestLine\\rTestLine";
        var h2 = tf.height;
        tf.contents = origText;
        if (h2 > h1) {
            autoSizeCount++;
        } else {
            out.push(tf.name + ": AUTO_SIZE_NOT_RESPONSIVE");
        }
    }
}
out.length === 0 ? ("ALL_TEXT_VISIBLE_OK (" + autoSizeCount + " area frames verified with Auto-Size)") : out.join("\\n");
`;
    fs.writeFileSync(verifyScriptPath, diagScript);
    const checkCmd = `osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "${verifyScriptPath}")'`;
    const res = execSync(checkCmd).toString().trim();
    return res;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    if (/drive|cloudstorage|dropbox|onedrive|\/volumes\//i.test(opts.outputDir)) {
        console.error("STRICT ZERO-DRIVE POLICY: Saving or uploading to any Drive/CloudStorage is forbidden. Only ~/Desktop is allowed.");
        process.exit(1);
    }

    let briefText = opts.briefText;
    if (opts.briefFile && fs.existsSync(opts.briefFile)) {
        briefText = fs.readFileSync(opts.briefFile, 'utf8');
    }

    if (!briefText) {
        console.error("Usage: node run_journal_setup.js --brief '<text>' [options]");
        process.exit(1);
    }

    console.log("Parsing brief...");
    const parsed = parseBrief(briefText);
    console.log(`Document Title: "${parsed.fileTitle}"`);
    console.log(`Slides parsed: ${parsed.slides.length}`);

    // Download all images directly in parallel (zero PSD conversion, zero image editing)
    console.log("Downloading native assets to ~/Downloads in parallel...");
    const downloadPromises = parsed.slides.map(async (slide) => {
        if (slide.imageUrl) {
            const baseName = `${parsed.fileTitle.replace(/[^a-zA-Z0-9]/g, '_')}_slide_${slide.num}`;
            const imgPath = await resolveAndDownloadAsset(slide.imageUrl, baseName, opts.downloadsDir);
            slide.imgLocalPath = imgPath;
            console.log(`✓ Slide ${slide.num} asset ready: ${path.basename(imgPath)}`);
            // If the slide has a second candidate image URL on the same line, download it as _alt too
            if (slide.imageUrls && slide.imageUrls.length > 1) {
                for (let u = 1; u < slide.imageUrls.length; u++) {
                    const altBase = `${baseName}_opt${u + 1}`;
                    const altPath = await resolveAndDownloadAsset(slide.imageUrls[u], altBase, opts.downloadsDir);
                    console.log(`✓ Slide ${slide.num} alternate asset ready: ${path.basename(altPath)}`);
                }
            }
        }
    });

    await Promise.all(downloadPromises);

    const { scriptPath, saveFilePath } = generateExtendScript(opts, parsed);
    const startT = Date.now();
    runExtendScript(scriptPath);
    const elapsed = ((Date.now() - startT) / 1000).toFixed(1);
    console.log(`Illustrator execution complete in ${elapsed}s!`);

    console.log("Verifying text frames in Illustrator...");
    const checkRes = verifyDocument();
    console.log(`Verification result: ${checkRes}`);

    console.log(`Master .ai file ready at: ${saveFilePath}`);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
