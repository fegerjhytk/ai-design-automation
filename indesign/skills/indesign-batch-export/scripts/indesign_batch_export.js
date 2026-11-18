#!/usr/bin/env node

/**
 * InDesign Batch Export Runner (Headless & Autonomous CLI)
 * Bridges Antigravity agent commands to Adobe InDesign via AppleScript & ExtendScript.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: '',
        output: '',
        format: 'PDF (print)',
        preset: '[High Quality Print]',
        suffix: '',
        subfolders: true,
        singlePages: false,
        alsoIdml: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--input' || arg === '-i') {
            options.input = args[++i];
        } else if (arg === '--output' || arg === '-o') {
            options.output = args[++i];
        } else if (arg === '--format' || arg === '-f') {
            options.format = args[++i];
        } else if (arg === '--preset' || arg === '-p') {
            options.preset = args[++i];
        } else if (arg === '--suffix' || arg === '-s') {
            options.suffix = args[++i];
        } else if (arg === '--single-pages') {
            options.singlePages = true;
        } else if (arg === '--no-subfolders') {
            options.subfolders = false;
        } else if (arg === '--also-idml') {
            options.alsoIdml = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Usage: node indesign_batch_export.js [options]

Options:
  -i, --input <dir>         Path to input directory containing .indd documents (required)
  -o, --output <dir>        Path to output directory (default: <input>/Exports)
  -f, --format <format>     Export format: 'PDF (print)', 'IDML', 'JPG', 'PNG', 'PDF (interactive)', 'ICML' (default: 'PDF (print)')
  -p, --preset <name>       InDesign PDF Export Preset name (default: '[High Quality Print]')
  -s, --suffix <string>     Optional filename suffix
  --single-pages            Split PDF into individual single-page PDF files
  --also-idml               Always generate companion IDML archive alongside primary export
  --no-subfolders           Do not recurse into subdirectories
  -h, --help                Show this help message
`);
}

async function run() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    if (!options.input) {
        console.error("❌ Error: Missing required parameter '--input <directory>'");
        showHelp();
        process.exit(1);
    }

    const resolvedInput = path.resolve(options.input);
    if (!fs.existsSync(resolvedInput)) {
        console.error(`❌ Error: Input path does not exist: ${resolvedInput}`);
        process.exit(1);
    }

    const resolvedOutput = options.output ? path.resolve(options.output) : path.join(resolvedInput, 'Exports');
    if (!fs.existsSync(resolvedOutput)) {
        fs.mkdirSync(resolvedOutput, { recursive: true });
    }

    const scriptPath = path.resolve(__dirname, 'batch_export.jsx');
    if (!fs.existsSync(scriptPath)) {
        console.error(`❌ Error: ExtendScript not found at: ${scriptPath}`);
        process.exit(1);
    }

    console.log(`\n======================================================`);
    console.log(`🚀 Adobe InDesign Batch Export Automation`);
    console.log(`======================================================`);
    console.log(`📂 Input:        ${resolvedInput}`);
    console.log(`📁 Output:       ${resolvedOutput}`);
    console.log(`📄 Format:       ${options.format}`);
    if (options.format.toLowerCase().includes('pdf (print)')) {
        console.log(`🎨 Preset:       ${options.preset}`);
        console.log(`📑 Single Pages: ${options.singlePages}`);
    }
    console.log(`📦 Include IDML: ${options.alsoIdml}`);
    console.log(`🔁 Subfolders:   ${options.subfolders}`);
    console.log(`⏳ Dispatching headless task to Adobe InDesign...\n`);

    // Build AppleScript command
    const appleScript = `
tell application id "com.adobe.InDesign"
    tell script args
        clear
        set value name "inputFolder" value "${resolvedInput}"
        set value name "outputFolder" value "${resolvedOutput}"
        set value name "format" value "${options.format}"
        set value name "preset" value "${options.preset}"
        set value name "suffix" value "${options.suffix}"
        set value name "subfolders" value "${options.subfolders}"
        set value name "singlePages" value "${options.singlePages}"
        set value name "alsoIdml" value "${options.alsoIdml}"
    end tell
    do script (POSIX file "${scriptPath}") language javascript
end tell
`;

    try {
        execSync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024
        });

        console.log(`✅ Adobe InDesign finished processing!`);

        // Check for report log
        const reportPath = path.join(resolvedOutput, 'Batch_Export_Report.txt');
        if (fs.existsSync(reportPath)) {
            console.log(`\n📋 Preflight & Batch Audit Summary:`);
            console.log(`------------------------------------------------------`);
            const reportContent = fs.readFileSync(reportPath, 'utf-8');
            console.log(reportContent);
            console.log(`------------------------------------------------------`);
            console.log(`Detailed report file: file://${reportPath}`);
        } else {
            console.log(`Exported assets located in: file://${resolvedOutput}`);
        }

    } catch (err) {
        console.error(`❌ Execution failed:`, err.message);
        process.exit(1);
    }
}

run();
