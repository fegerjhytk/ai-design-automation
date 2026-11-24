#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function runJsx(application, source, temporary) {
    const file = path.join(temporary, `script-${runJsx.sequence++}.jsx`);
    fs.writeFileSync(file, source);
    const literal = JSON.stringify(file);
    const action = application === 'Adobe Illustrator'
        ? `do javascript (POSIX file ${literal})`
        : `DoScriptFile ${literal}`;
    return execFileSync('osascript', ['-e', `tell application ${JSON.stringify(application)} to ${action}`], {
        encoding: 'utf8', timeout: 180000
    });
}
runJsx.sequence = 0;

function main(args) {
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage: motion_bridge.js --folder <project> [--master <approved.ai>] [--placement auto|tv|vertical|ad]');
        console.log('Requires approved artwork already prepared as named top-level animation layers. Existing outputs are preserved.');
        return;
    }
    const options = { placement: 'auto' };
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (!['--folder', '--master', '--placement'].includes(flag) || !args[i + 1]) {
            throw new Error(`Unknown or incomplete option: ${flag}`);
        }
        options[flag.slice(2)] = args[++i];
    }
    if (!options.folder) throw new Error('--folder is required');
    if (!['auto', 'tv', 'vertical', 'ad'].includes(options.placement)) throw new Error('Invalid placement');
    const folder = path.resolve(options.folder);
    const candidates = fs.readdirSync(folder).filter(name => /\.ai$/i.test(name) && !name.includes('_Unpacked') && !name.startsWith('._'));
    if (!options.master && candidates.length !== 1) throw new Error('Select exactly one approved Illustrator master using --master');
    const master = options.master ? path.resolve(folder, options.master) : path.join(folder, candidates[0]);
    if (!fs.statSync(master).isFile()) throw new Error('Approved master is missing');
    const stem = path.basename(master).replace(/\.ai$/i, '');
    const footage = path.join(folder, 'Fotage');
    if (fs.existsSync(footage) && (fs.lstatSync(footage).isSymbolicLink() || !fs.statSync(footage).isDirectory())) {
        throw new Error('Fotage must be a physical directory');
    }
    const unpacked = path.join(footage, `${stem}_Unpacked.ai`);
    const project = path.join(folder, `${stem}.aep`);
    if (fs.existsSync(unpacked) || fs.existsSync(project)) throw new Error('Existing artwork or animation output found. Use a fresh project folder to preserve manual edits.');
    const builder = path.join(__dirname, 'build_ae_animation.jsx');
    if (!fs.existsSync(builder)) throw new Error('Bundled build_ae_animation.jsx is missing');
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-perk-motion-'));
    const manifest = path.join(temporary, 'layers.json');
    const reportPath = path.join(temporary, 'audit.json');
    try {
        fs.mkdirSync(footage, { recursive: true });
        runJsx('Adobe Illustrator', `
            (function () {
                var doc = app.open(new File(${JSON.stringify(master)}));
                if (doc.artboards.length !== 1) throw new Error('Choose a single approved motion artboard');
                var rect = doc.artboards[0].artboardRect;
                var width = Math.round(rect[2] - rect[0]);
                var height = Math.round(rect[1] - rect[3]);
                var requested = ${JSON.stringify(options.placement)};
                var actual = width === 1920 && height === 1080 ? 'tv' : width === 1080 && height === 1920 ? 'vertical' : width === 1080 && height === 1080 ? 'ad' : '';
                if (!actual || (requested !== 'auto' && actual !== requested)) throw new Error('Motion artboard does not match placement');
                var required = ['BG_Base', 'Header_Logo', 'Header_Title'];
                for (var offer = 1; offer <= 3; offer++) {
                    var parts = ['Product', 'Badge', 'Title', 'PriceTag'];
                    for (var part = 0; part < parts.length; part++) required.push('Offer' + offer + '_' + parts[part]);
                }
                function hasName(list, name) {
                    for (var n = 0; n < list.length; n++) if (list[n] === name) return true;
                    return false;
                }
                var names = [];
                for (var i = 0; i < doc.layers.length; i++) {
                    var layer = doc.layers[i];
                    if (!layer.visible || layer.pageItems.length === 0) throw new Error('Prepare visible non-empty top-level animation layers');
                    if (hasName(names, layer.name)) throw new Error('Duplicate animation layer name: ' + layer.name);
                    names.push(layer.name);
                }
                for (var i = 0; i < required.length; i++) {
                    if (!hasName(names, required[i])) throw new Error('Prepare approved named layers before running bridge. Missing: ' + required[i]);
                }
                if (!hasName(names, 'Offer4_Base') && !hasName(names, 'CTA_Button')) throw new Error('Prepare fourth offer or CTA layers');
                for (var i = 0; i < doc.placedItems.length; i++) {
                    if (!doc.placedItems[i].file.exists) throw new Error('Missing linked artwork');
                }
                var save = new IllustratorSaveOptions();
                save.pdfCompatible = true;
                doc.saveAs(new File(${JSON.stringify(unpacked)}), save);
                var file = new File(${JSON.stringify(manifest)});
                file.open('w'); file.write(JSON.stringify({names:names,width:width,height:height})); file.close();
            })();
        `, temporary);
        if (!fs.existsSync(manifest)) throw new Error('Illustrator layer validation did not produce a manifest');
        const expected = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        runJsx('Adobe After Effects 2026', `
            #include ${JSON.stringify(builder)}
            (function () {
                buildAnimation(${JSON.stringify(unpacked)}, ${JSON.stringify(project)});
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) throw new Error('Target composition is not active');
                var expected = ${JSON.stringify(expected)};
                var failures = [];
                if (comp.frameRate !== 30 || comp.duration !== 10) failures.push('Frame rate or duration');
                if (comp.width !== expected.width || comp.height !== expected.height) failures.push('Composition dimensions');
                if (comp.numLayers !== expected.names.length) failures.push('Layer count');
                for (var i = 0; i < expected.names.length; i++) {
                    try { comp.layer(expected.names[i]); } catch (e) { failures.push('Missing layer: ' + expected.names[i]); }
                }
                for (var i = 1; i <= app.project.numItems; i++) {
                    var item = app.project.item(i);
                    if (item instanceof FootageItem && item.footageMissing) failures.push('Missing footage: ' + item.name);
                }
                function same(a, b) {
                    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a-b) < 0.0001;
                    if (a instanceof Array && b instanceof Array) {
                        if (a.length !== b.length) return false;
                        for (var i=0; i<a.length; i++) if (!same(a[i],b[i])) return false;
                        return true;
                    }
                    return JSON.stringify(a) === JSON.stringify(b);
                }
                function audit(group, label) {
                    for (var i=1; i<=group.numProperties; i++) {
                        var p = group.property(i);
                        if (p.propertyType !== PropertyType.PROPERTY) { audit(p,label+'/'+p.name); continue; }
                        for (var k=1; k<=p.numKeys; k++) if (p.keyTime(k)>9.000001) failures.push(label+'/'+p.name+': late keyframe');
                        if (p.isTimeVarying && p.propertyValueType !== PropertyValueType.NO_VALUE) {
                            try {
                                var base = p.valueAtTime(9,false);
                                for (var frame=271; frame<300; frame++) {
                                    if (!same(base,p.valueAtTime(frame/30,false))) { failures.push(label+'/'+p.name+': moving during hold'); break; }
                                }
                            } catch (e) { failures.push(label+'/'+p.name+': hold could not be verified'); }
                        }
                    }
                }
                for (var i=1; i<=comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    if (layer.inPoint > 9 || layer.outPoint < 10) failures.push(layer.name+': hold visibility');
                    audit(layer,layer.name);
                }
                var file = new File(${JSON.stringify(reportPath)});
                file.open('w'); file.write(JSON.stringify({failures:failures,layers:comp.numLayers,fps:comp.frameRate,duration:comp.duration})); file.close();
            })();
        `, temporary);
        if (!fs.existsSync(reportPath)) throw new Error('After Effects audit report is missing');
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (!Array.isArray(report.failures) || report.failures.length) {
            throw new Error(`Preflight failed: ${JSON.stringify(report.failures)}`);
        }
        console.log(`Preflight passed: ${report.layers} layers, ${report.fps} fps, ${report.duration} seconds. ${project}`);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
}

if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { main };
