const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

console.log('=== RUNNING GSD DESIGN AUTOMATION TEST SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

const repoRoot = path.resolve(__dirname, '..');
const planningDir = path.join(repoRoot, '.planning');

// 1. Verify GSD Core Files Existence
console.log('--- Test Suite 1: GSD Infrastructure ---');
assert(fs.existsSync(path.join(planningDir, 'PROJECT.md')), 'PROJECT.md exists');
assert(fs.existsSync(path.join(planningDir, 'ROADMAP.md')), 'ROADMAP.md exists');
assert(fs.existsSync(path.join(planningDir, 'REQUIREMENTS.md')), 'REQUIREMENTS.md exists');
assert(fs.existsSync(path.join(planningDir, 'STATE.md')), 'STATE.md exists');
assert(fs.existsSync(path.join(planningDir, 'config.json')), 'config.json exists');

// 2. Test Design Automation Specs
console.log('\n--- Test Suite 2: Multi-Ratio Design Specs ---');
const bounds = JSON.parse(fs.readFileSync(path.join(planningDir, 'specs/layout-bounds.json'), 'utf-8'));
assert(bounds.ratios['1:1'] && bounds.ratios['1:1'].width === 1080, '1:1 ratio defined (1080x1080)');
assert(bounds.ratios['9:16'] && bounds.ratios['9:16'].height === 1920, '9:16 ratio defined (1080x1920)');
assert(bounds.ratios['16:9'] && bounds.ratios['16:9'].width === 1920, '16:9 ratio defined (1920x1080)');

const matrix = JSON.parse(fs.readFileSync(path.join(planningDir, 'specs/creative-matrix.json'), 'utf-8'));
assert(matrix.copy_matrix.length >= 2, 'Copy matrix defines at least 2 ad creative variants');
matrix.copy_matrix.forEach((variant) => {
  assert(
    variant.headline.length <= variant.max_headline_chars,
    `Variant "${variant.id}" headline within limit (${variant.headline.length}/${variant.max_headline_chars})`
  );
});

// 3. Test GSD CLI Tool Verifications
console.log('\n--- Test Suite 3: GSD Verification Engine ---');
const gsdHome = process.env.GSD_HOME || path.join(__dirname, 'gsd-engine');
const gsdTools = path.join(gsdHome, 'get-shit-done/bin/gsd-tools.cjs');
assert(fs.existsSync(gsdTools), `gsd-tools.cjs found at ${gsdTools}`);

const progressRes = JSON.parse(
  execFileSync(process.execPath, [gsdTools, 'progress', '--cwd', repoRoot], { encoding: 'utf-8' })
);
assert(
  Array.isArray(progressRes.phases) && progressRes.phases.length === 10 && progressRes.total_plans === 10,
  `GSD progress parses all 10 roadmap phases (${progressRes.phases?.length || 0}/10)`
);

// 4. Test GSD Context Monitor Hook
console.log('\n--- Test Suite 4: GSD Lifecycle Hooks ---');
const hookPath = path.join(gsdHome, 'hooks/gsd-context-monitor.js');
assert(fs.existsSync(hookPath), `gsd-context-monitor.js found at ${hookPath}`);
const hookRes = execFileSync(process.execPath, [hookPath], { input: '{}', encoding: 'utf-8' });
assert(!hookRes.includes('Error'), 'gsd-context-monitor.js executes without errors');

console.log(`\n========================================`);
console.log(`RESULT: ${passedTests}/${totalTests} tests passed successfully!`);
console.log(`========================================\n`);
