#!/usr/bin/env node
/**
 * run_vector_first_aid.js
 * Headless CLI runner for the VectorFirstAid cleanup engine in Adobe Illustrator.
 * Cross-platform (Windows & macOS).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function parseArgs(args) {
    const opts = {
        mode: 'scan', // 'scan' | 'fix-all' | 'fix-selected'
        rules: ['stray', 'unpainted', 'barely-open', 'empty-text', 'groups', 'clip-masks'],
        scope: 'document', // 'document' | 'selection'
        purgeSwatches: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--fix' || arg === '--fix-all') opts.mode = 'fix-all';
        else if (arg === '--scan') opts.mode = 'scan';
        else if (arg === '--selection') opts.scope = 'selection';
        else if (arg === '--purge-swatches') opts.purgeSwatches = true;
        else if (arg === '--rules' && args[i + 1]) {
            opts.rules = args[++i].split(',').map(s => s.trim().toLowerCase());
        }
    }
    return opts;
}

function buildExtendScript(opts) {
    const coreScriptPath = path.resolve(__dirname, 'VectorFirstAidCore.jsx').replace(/\\/g, '/');

    return `
    #include "${coreScriptPath}"
    (function() {
        if (app.documents.length === 0) {
            return JSON.stringify({ error: "No open document in Adobe Illustrator." });
        }
        var doc = app.activeDocument;
        var mode = "${opts.mode}";
        var scope = "${opts.scope}";

        var issues = VectorFirstAidCore.scan(doc, scope);

        var report = {
            docName: doc.name,
            scope: scope,
            strayPoints: issues.strayPoints.length,
            unpaintedPaths: issues.unpaintedPaths.length,
            barelyOpenPaths: issues.barelyOpenPaths.length,
            unclosedFilledPaths: issues.unclosedFilledPaths.length,
            emptyTextFrames: issues.emptyTextFrames.length,
            redundantClippingMasks: issues.redundantClippingMasks.length,
            redundantGroups: issues.redundantGroups.length,
            totalFound: issues.totalCount,
            fixed: 0
        };

        if (mode === "fix-all") {
            var fixedCount = 0;
            fixedCount += VectorFirstAidCore.fixStrayPoints(issues.strayPoints);
            fixedCount += VectorFirstAidCore.fixUnpaintedPaths(issues.unpaintedPaths);
            fixedCount += VectorFirstAidCore.fixBarelyOpenPaths(issues.barelyOpenPaths);
            fixedCount += VectorFirstAidCore.fixUnclosedFilledPaths(issues.unclosedFilledPaths);
            fixedCount += VectorFirstAidCore.fixEmptyTextFrames(issues.emptyTextFrames);
            fixedCount += VectorFirstAidCore.fixRedundantClippingMasks(issues.redundantClippingMasks);
            fixedCount += VectorFirstAidCore.fixRedundantGroups(issues.redundantGroups);

            ${opts.purgeSwatches ? 'VectorFirstAidCore.purgeUnusedResources();' : ''}

            report.fixed = fixedCount;
            app.redraw();
        }

        return "RESULT_JSON:" + JSON.stringify(report);
    })();
    `;
}

function runExtendScript(jsxCode) {
    const tmpJsx = path.join(os.tmpdir(), `vfa_run_${Date.now()}.jsx`);
    fs.writeFileSync(tmpJsx, jsxCode, 'utf8');

    try {
        if (process.platform === 'win32') {
            const psCmd = `
                $ai = [Activator]::CreateInstance([Type]::GetTypeFromProgID("Illustrator.Application"))
                $res = $ai.DoJavaScriptFile("${tmpJsx.replace(/\\/g, '\\\\')}")
                Write-Output $res
            `;
            const encoded = Buffer.from(psCmd, 'utf16le').toString('base64');
            const out = execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { timeout: 30000 }).toString();
            return out;
        } else {
            const cmd = `osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "${tmpJsx}")'`;
            return execSync(cmd, { timeout: 30000 }).toString();
        }
    } finally {
        try { fs.unlinkSync(tmpJsx); } catch (e) {}
    }
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    console.log(`[VectorFirstAid] Starting in '${opts.mode}' mode (Scope: ${opts.scope})...`);

    const script = buildExtendScript(opts);
    try {
        const raw = runExtendScript(script);
        const idx = raw.indexOf("RESULT_JSON:");
        if (idx !== -1) {
            const jsonStr = raw.substring(idx + 12).trim();
            const data = JSON.parse(jsonStr);

            console.log("\n================ VECTOR FIRST AID REPORT ================");
            console.log(`Document:          ${data.docName}`);
            console.log(`Scope:             ${data.scope}`);
            console.log(`Stray Points:      ${data.strayPoints}`);
            console.log(`Unpainted Paths:   ${data.unpaintedPaths}`);
            console.log(`Barely-Open Paths: ${data.barelyOpenPaths}`);
            console.log(`Unclosed Filled:   ${data.unclosedFilledPaths}`);
            console.log(`Empty Text Frames: ${data.emptyTextFrames}`);
            console.log(`Redundant Masks:   ${data.redundantClippingMasks}`);
            console.log(`Single Groups:     ${data.redundantGroups}`);
            console.log(`--------------------------------------------------------`);
            console.log(`Total Issues:      ${data.totalFound}`);
            if (opts.mode === 'fix-all') {
                console.log(`Total Repaired:    ${data.fixed}`);
            }
            console.log("========================================================\n");
        } else {
            console.log(raw.trim());
        }
    } catch (err) {
        console.error("Execution error: " + err.message);
        process.exit(1);
    }
}

main();
