#!/usr/bin/env node

/**
 * indesign-doc-diff.js
 * CLI engine for deep comparison, typography extraction, and preflight inspection of Adobe InDesign (.indd) files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ARGS = process.argv.slice(2);

function printHelp() {
    console.log(`
InDesign Document Diff & Typography Inspector (indesign-doc-diff)
================================================================

Usage:
  node indesign-doc-diff.js --compare <fileA.indd> <fileB.indd> [options]
  node indesign-doc-diff.js --inspect-typo <file.indd> [options]

Options:
  --exclude-content        Exclude text copy differences to focus purely on layout, geometry, tables, and typography
  --exclude-dots-color     Exclude status dot colors (Green, Orange, Grey, etc.) from swatch comparisons
  --json                   Output raw JSON delta report
  --markdown               Output formatted GitHub-flavored markdown (default)
  --help                   Show this help message
`);
}

if (ARGS.length === 0 || ARGS.includes('--help')) {
    printHelp();
    process.exit(0);
}

const isJson = ARGS.includes('--json');
const excludeContent = ARGS.includes('--exclude-content');
const excludeDotsColor = ARGS.includes('--exclude-dots-color') || ARGS.includes('--exclude-dot-colors');

let mode = null;
let fileA = null;
let fileB = null;

for (let i = 0; i < ARGS.length; i++) {
    if (ARGS[i] === '--compare') {
        mode = 'compare';
        fileA = ARGS[i + 1];
        fileB = ARGS[i + 2];
        i += 2;
    } else if (ARGS[i] === '--inspect-typo') {
        mode = 'inspect-typo';
        fileA = ARGS[i + 1];
        i += 1;
    }
}

if (!mode || !fileA || (mode === 'compare' && !fileB)) {
    console.error("Error: Invalid arguments. Please specify --compare <fileA> <fileB> or --inspect-typo <file>");
    printHelp();
    process.exit(1);
}

const SCRIPT_TEMPLATE_PATH = path.join(__dirname, 'indesign_inspector.jsx');

function inspectDocument(docPath) {
    const absDocPath = path.resolve(docPath);
    if (!fs.existsSync(absDocPath)) {
        throw new Error(`File not found: ${absDocPath}`);
    }

    const tmpJsonPath = path.join(os.tmpdir(), `indd_inspect_${Date.now()}_${Math.floor(Math.random() * 10000)}.json`);
    const tmpJsxPath = path.join(os.tmpdir(), `indd_script_${Date.now()}_${Math.floor(Math.random() * 10000)}.jsx`);

    let jsxContent = fs.readFileSync(SCRIPT_TEMPLATE_PATH, 'utf8');
    jsxContent = jsxContent.replace('%%TARGET_DOC_PATH%%', absDocPath.replace(/\\/g, '\\\\'));
    jsxContent = jsxContent.replace('%%OUTPUT_JSON_PATH%%', tmpJsonPath.replace(/\\/g, '\\\\'));

    fs.writeFileSync(tmpJsxPath, jsxContent, 'utf8');

    try {
        const appleScript = `tell application id "com.adobe.InDesign" to do script (POSIX file "${tmpJsxPath}") language javascript`;
        execSync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, { stdio: 'pipe' });

        if (!fs.existsSync(tmpJsonPath)) {
            throw new Error(`InDesign inspector did not produce output at ${tmpJsonPath}`);
        }

        const rawJson = fs.readFileSync(tmpJsonPath, 'utf8');
        const data = JSON.parse(rawJson);
        if (data.error) {
            throw new Error(`InDesign Error: ${data.error}`);
        }
        return data;
    } finally {
        try { if (fs.existsSync(tmpJsxPath)) fs.unlinkSync(tmpJsxPath); } catch (e) {}
        try { if (fs.existsSync(tmpJsonPath)) fs.unlinkSync(tmpJsonPath); } catch (e) {}
    }
}

function runInspectTypo(docPath) {
    const data = inspectDocument(docPath);

    if (isJson) {
        console.log(JSON.stringify(data, null, 2));
        return;
    }

    // Build human-friendly Markdown report
    console.log(`\n# Typography & Spacing Hierarchy: ${data.name}`);
    console.log(`**File Path:** \`${data.filePath}\``);
    console.log(`**Page Count:** ${data.pagesCount} pages | **Dimensions:** ${data.documentPreferences.pageWidth} x ${data.documentPreferences.pageHeight} pt\n`);

    console.log(`## 1. Page Margins & Layout Grid`);
    console.log(`| Page | Margins (T / B / L / R) | Columns | Gutter | Parent Master |`);
    console.log(`| :--- | :--- | :--- | :--- | :--- |`);
    data.margins.forEach((m, idx) => {
        const master = data.appliedMasters[idx] || "None";
        console.log(`| Page ${idx + 1} | Top: ${m.top} pt, Bottom: ${m.bottom} pt, Left: ${m.left} pt, Right: ${m.right} pt | ${m.columnCount} col | ${m.columnGutter} pt | ${master} |`);
    });

    console.log(`\n## 2. Typographic Elements & Styles Observed`);
    console.log(`| Element Context | Sample Text | Font & Style | Size | Leading | Tracking | Align |`);
    console.log(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);

    data.pages.forEach(p => {
        p.textFrames.forEach(tf => {
            tf.paragraphs.forEach(pr => {
                if (pr.size > 0 && pr.font !== "Minion Pro") {
                    console.log(`| Page ${p.pageIndex} Frame ${tf.index} | "${pr.snippet.substring(0, 30)}" | ${pr.font} ${pr.style} | **${pr.size} pt** | ${pr.leading} | ${pr.tracking} | ${pr.align} |`);
                }
            });
        });
    });

    console.log(`\n## 3. Table Architecture & Cell Insets`);
    data.pages.forEach(p => {
        p.tables.forEach(tb => {
            console.log(`* **Page ${p.pageIndex} Table ${tb.tableIndex}:**`);
            console.log(`  - Dimensions: **${tb.rowsCount} rows × ${tb.columnsCount} columns**`);
            console.log(`  - Column Widths: \`[${tb.columnWidths.map(w => w + ' pt').join(' | ')}]\``);
            console.log(`  - Cell Insets (Padding): Top: **${tb.cellInsets[0]} pt**, Bottom: **${tb.cellInsets[1]} pt**, Left: **${tb.cellInsets[2]} pt**, Right: **${tb.cellInsets[3]} pt**`);
            if (tb.bannerRowsCount > 0) {
                console.log(`  - Category Banner Rows (${tb.bannerRowsCount}): ${tb.bannerRows.map(b => `"${b.title}" (${b.fill})`).join(', ')}`);
            }
        });
    });

    console.log(`\n## 4. Fonts Preflight Status`);
    console.log(`| Font Name | Style | InDesign Status |`);
    console.log(`| :--- | :--- | :--- |`);
    data.fonts.forEach(f => {
        const statusBadge = f.status === 'INSTALLED' ? '✅ INSTALLED' : '⚠️ ' + f.status;
        console.log(`| ${f.name} | ${f.fontStyleName} | ${statusBadge} |`);
    });
}

function runCompare(docPathA, docPathB) {
    const dataA = inspectDocument(docPathA);
    const dataB = inspectDocument(docPathB);

    const diff = {
        docA: { name: dataA.name, path: dataA.filePath, pages: dataA.pagesCount },
        docB: { name: dataB.name, path: dataB.filePath, pages: dataB.pagesCount },
        pageCountDiff: dataA.pagesCount !== dataB.pagesCount,
        masterDifferences: [],
        tableDifferences: [],
        legendGroupingDifferences: [],
        linkPreflight: {
            docA: { missing: 0, total: dataA.links.length },
            docB: { missing: 0, total: dataB.links.length }
        },
        fontPreflight: {
            docA: { notAvailable: [] },
            docB: { notAvailable: [] }
        },
        swatchesDiff: {
            docACount: dataA.swatches.length,
            docBCount: dataB.swatches.length,
            uniqueToA: [],
            uniqueToB: []
        },
        structuralShiftNotes: []
    };

    // Preflight links
    dataA.links.forEach(l => { if (l.status.includes('MISSING')) diff.linkPreflight.docA.missing++; });
    dataB.links.forEach(l => { if (l.status.includes('MISSING')) diff.linkPreflight.docB.missing++; });

    // Preflight fonts
    dataA.fonts.forEach(f => { if (f.status.includes('NOT_AVAILABLE')) diff.fontPreflight.docA.notAvailable.push(`${f.name} (${f.fontStyleName})`); });
    dataB.fonts.forEach(f => { if (f.status.includes('NOT_AVAILABLE')) diff.fontPreflight.docB.notAvailable.push(`${f.name} (${f.fontStyleName})`); });

    // Swatches
    const isDotColorName = (name) => {
        const lower = name.toLowerCase();
        return lower.includes('green') || lower.includes('orange') || lower.includes('grey') || lower.includes('gray') || lower.includes('dot');
    };

    const swA = new Set(dataA.swatches.map(s => s.name));
    const swB = new Set(dataB.swatches.map(s => s.name));
    dataA.swatches.forEach(s => {
        if (!swB.has(s.name)) {
            if (!excludeDotsColor || !isDotColorName(s.name)) {
                diff.swatchesDiff.uniqueToA.push(s.name);
            }
        }
    });
    dataB.swatches.forEach(s => {
        if (!swA.has(s.name)) {
            if (!excludeDotsColor || !isDotColorName(s.name)) {
                diff.swatchesDiff.uniqueToB.push(s.name);
            }
        }
    });

    // Applied Master diff
    const maxPages = Math.max(dataA.pagesCount, dataB.pagesCount);
    for (let p = 0; p < maxPages; p++) {
        const mA = dataA.appliedMasters[p] || "None/NA";
        const mB = dataB.appliedMasters[p] || "None/NA";
        if (mA !== mB) {
            diff.masterDifferences.push({ page: p + 1, masterA: mA, masterB: mB });
        }
    }

    // Tables comparison
    const tablesA = [];
    dataA.pages.forEach(p => p.tables.forEach(t => tablesA.push({ page: p.pageIndex, ...t })));
    const tablesB = [];
    dataB.pages.forEach(p => p.tables.forEach(t => tablesB.push({ page: p.pageIndex, ...t })));

    const maxTables = Math.max(tablesA.length, tablesB.length);
    for (let t = 0; t < maxTables; t++) {
        const tA = tablesA[t];
        const tB = tablesB[t];
        if (!tA || !tB || tA.rowsCount !== tB.rowsCount || tA.columnsCount !== tB.columnsCount) {
            diff.tableDifferences.push({
                tableIndex: t + 1,
                tableA: tA ? `P${tA.page}: ${tA.rowsCount} rows × ${tA.columnsCount} cols` : "N/A",
                tableB: tB ? `P${tB.page}: ${tB.rowsCount} rows × ${tB.columnsCount} cols` : "N/A"
            });
        }
    }

    // Legend Grouping comparison (e.g. status dots + labels)
    for (let p = 0; p < Math.min(dataA.pagesCount, dataB.pagesCount); p++) {
        const pA = dataA.pages[p];
        const pB = dataB.pages[p];
        if (pA.groupsCount !== pB.groupsCount || pA.ovalsCount !== pB.ovalsCount) {
            diff.legendGroupingDifferences.push({
                page: p + 1,
                docA: `${pA.groupsCount} groups, ${pA.ovalsCount} ovals, ${pA.textFramesCount} frames`,
                docB: `${pB.groupsCount} groups, ${pB.ovalsCount} ovals, ${pB.textFramesCount} frames`
            });
        }
    }

    if (dataA.pagesCount !== dataB.pagesCount) {
        diff.structuralShiftNotes.push(`Total page count discrepancy: ${dataA.name} has ${dataA.pagesCount} pages, while ${dataB.name} has ${dataB.pagesCount} pages.`);
        diff.structuralShiftNotes.push(`Table distribution requires more spreads, shifting subsequent editorial and back cover sections.`);
    }

    if (isJson) {
        console.log(JSON.stringify(diff, null, 2));
        return;
    }

    // Markdown Output
    console.log(`\n# InDesign Document Comparison Report`);
    console.log(`* **Document A:** \`${dataA.name}\` (${dataA.pagesCount} pages)`);
    console.log(`* **Document B:** \`${dataB.name}\` (${dataB.pagesCount} pages)\n`);

    console.log(`### 1. Document Structure & Page Layout Shifts`);
    if (diff.pageCountDiff) {
        console.log(`* ⚠️ **Page Count Mismatch:** Document A has **${dataA.pagesCount} pages**, Document B has **${dataB.pagesCount} pages**.`);
        diff.structuralShiftNotes.forEach(note => console.log(`  - ${note}`));
    } else {
        console.log(`* ✅ Page counts match (${dataA.pagesCount} pages).`);
    }

    if (diff.masterDifferences.length > 0) {
        console.log(`\n**Applied Parent/Master Spread Divergence:**`);
        console.log(`| Page | Document A Master | Document B Master |`);
        console.log(`| :--- | :--- | :--- |`);
        diff.masterDifferences.forEach(m => console.log(`| Page ${m.page} | ${m.masterA} | ${m.masterB} |`));
    }

    console.log(`\n### 2. Table Geometries & Row Counts`);
    if (diff.tableDifferences.length > 0) {
        console.log(`| Table | Document A | Document B | Difference |`);
        console.log(`| :--- | :--- | :--- | :--- |`);
        diff.tableDifferences.forEach(td => console.log(`| Table #${td.tableIndex} | ${td.tableA} | ${td.tableB} | Row count variation |`));
    } else {
        console.log(`* ✅ All tables have matching row and column geometries.`);
    }

    console.log(`\n### 3. Object Grouping & Legend Hierarchy`);
    if (diff.legendGroupingDifferences.length > 0) {
        console.log(`| Page | Document A Structure | Document B Structure | Impact |`);
        console.log(`| :--- | :--- | :--- | :--- |`);
        diff.legendGroupingDifferences.forEach(g => {
            console.log(`| Page ${g.page} | ${g.docA} | ${g.docB} | Standalone/Ungrouped elements vs. Group |`);
        });
    } else {
        console.log(`* ✅ Grouping hierarchies are consistent.`);
    }

    console.log(`\n### 4. Asset Links Preflight`);
    console.log(`* **Document A:** ${diff.linkPreflight.docA.total} links total (${diff.linkPreflight.docA.missing > 0 ? `⚠️ ${diff.linkPreflight.docA.missing} BROKEN` : '✅ All Active'})`);
    console.log(`* **Document B:** ${diff.linkPreflight.docB.total} links total (${diff.linkPreflight.docB.missing > 0 ? `⚠️ ${diff.linkPreflight.docB.missing} BROKEN` : '✅ All Active'})`);

    console.log(`\n### 5. Fonts Preflight & Missing Font Warnings`);
    if (diff.fontPreflight.docA.notAvailable.length > 0) {
        console.log(`* ⚠️ **Document A Missing Fonts:** ${diff.fontPreflight.docA.notAvailable.join(', ')}`);
    } else {
        console.log(`* ✅ Document A: All fonts installed.`);
    }
    if (diff.fontPreflight.docB.notAvailable.length > 0) {
        console.log(`* ⚠️ **Document B Missing Fonts:** ${diff.fontPreflight.docB.notAvailable.join(', ')}`);
    } else {
        console.log(`* ✅ Document B: All fonts installed.`);
    }

    console.log(`\n### 6. Swatches Palette Delta`);
    console.log(`* **Document A Swatches:** ${diff.swatchesDiff.docACount} | **Document B Swatches:** ${diff.swatchesDiff.docBCount}`);
    if (diff.swatchesDiff.uniqueToA.length > 0) {
        console.log(`* Extra in Document A: \`${diff.swatchesDiff.uniqueToA.slice(0, 10).join(', ')}${diff.swatchesDiff.uniqueToA.length > 10 ? '...' : ''}\``);
    }
    if (diff.swatchesDiff.uniqueToB.length > 0) {
        console.log(`* Extra in Document B: \`${diff.swatchesDiff.uniqueToB.slice(0, 10).join(', ')}${diff.swatchesDiff.uniqueToB.length > 10 ? '...' : ''}\``);
    }
}

if (mode === 'compare') {
    runCompare(fileA, fileB);
} else if (mode === 'inspect-typo') {
    runInspectTypo(fileA);
}
