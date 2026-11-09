#!/usr/bin/env node

/**
 * CLI Animator: Illustrator to After Effects Automation
 * Usage:
 *   node cli_animator.js --file "/path/to/design.ai" [--output "/path/to/output.aep"]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--file' && args[i + 1]) {
            options.file = path.resolve(args[++i]);
        } else if (args[i] === '--output' && args[i + 1]) {
            options.output = path.resolve(args[++i]);
        }
    }
    return options;
}

function runAppleScript(app, jsxCode) {
    const tmpJsx = `/tmp/run_${Date.now()}_${Math.random().toString(36).substring(7)}.jsx`;
    fs.writeFileSync(tmpJsx, jsxCode);

    let osaCmd = '';
    if (app === 'illustrator') {
        osaCmd = `osascript -e 'tell application "Adobe Illustrator" to do javascript (file "${tmpJsx}")'`;
    } else if (app === 'aftereffects') {
        osaCmd = `osascript -e 'tell application "Adobe After Effects 2026" to DoScriptFile "${tmpJsx}"'`;
    }

    try {
        const out = execSync(osaCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return out.trim();
    } finally {
        if (fs.existsSync(tmpJsx)) fs.unlinkSync(tmpJsx);
    }
}

async function main() {
    const opts = parseArgs();
    if (!opts.file) {
        console.error("Error: --file argument is required.");
        console.error("Usage: node cli_animator.js --file <path-to-ai> [--output <path-to-aep>]");
        process.exit(1);
    }

    let workingAi = opts.file;
    const desktopDir = path.join(process.env.HOME, 'Desktop');

    // Rule: Never edit master files outside of Desktop directly
    if (!workingAi.startsWith(desktopDir)) {
        const basename = path.basename(workingAi);
        const desktopCopy = path.join(desktopDir, basename);
        console.log(`[Safety] Master file detected outside Desktop. Cloning to: ${desktopCopy}`);
        fs.copyFileSync(workingAi, desktopCopy);
        workingAi = desktopCopy;
    }

    const defaultAep = path.join(desktopDir, path.basename(workingAi, '.ai') + '.aep');
    const targetAep = opts.output || defaultAep;

    console.log(`[1/3] Unpacking Illustrator file: ${workingAi}`);
    const unpackJsxPath = path.join(__dirname, 'unpack_illustrator.jsx');
    const unpackCode = `
        #include "${unpackJsxPath}"
        unpackDocument("${workingAi}", "${workingAi}");
    `;
    runAppleScript('illustrator', unpackCode);
    console.log(`[1/3] Illustrator unpacking complete.`);

    console.log(`[2/3] Constructing After Effects composition: ${targetAep}`);
    const buildJsxPath = path.join(__dirname, 'build_ae_animation.jsx');
    const buildCode = `
        #include "${buildJsxPath}"
        buildAnimation("${workingAi}", "${targetAep}");
    `;
    runAppleScript('aftereffects', buildCode);
    console.log(`[2/3] After Effects animation generated successfully.`);

    console.log(`[3/3] Running verification checks...`);
    const verifyJsxPath = path.join(__dirname, 'verify_ae_comp.jsx');
    const reportPath = `/tmp/ae_verify_report_${Date.now()}.json`;
    const verifyCode = `
        #include "${verifyJsxPath}"
        verifyComp("${reportPath}");
    `;
    runAppleScript('aftereffects', verifyCode);

    if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        console.log(`[Verification] Comp: ${report.compName} (${report.width}x${report.height}, ${report.duration}s @ ${report.fps}fps)`);
        console.log(`[Verification] Total layers: ${report.totalLayers}`);
        if (report.violations.length > 0) {
            console.warn(`[Verification Warning] Violations detected:`, report.violations);
        } else {
            console.log(`[Verification] 100% Passed. Zero violations. 1.0s static hold verified.`);
        }
        fs.unlinkSync(reportPath);
    }

    console.log(`\n🎉 Animation complete! Project saved to: ${targetAep}`);
}

main().catch(err => {
    console.error("FATAL ERROR:", err.message);
    process.exit(1);
});
