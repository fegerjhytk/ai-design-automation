const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 1. Verify GSD Core Files Existence
console.log('--- Test Suite 1: GSD Infrastructure ---');
const cwd = __dirname;
assert(fs.existsSync(path.join(cwd, '.planning/PROJECT.md')), 'PROJECT.md exists');
assert(fs.existsSync(path.join(cwd, '.planning/ROADMAP.md')), 'ROADMAP.md exists');
assert(fs.existsSync(path.join(cwd, '.planning/REQUIREMENTS.md')), 'REQUIREMENTS.md exists');
assert(fs.existsSync(path.join(cwd, '.planning/STATE.md')), 'STATE.md exists');
assert(fs.existsSync(path.join(cwd, '.planning/config.json')), 'config.json exists');

// 2. Test Design Automation Specs
console.log('\n--- Test Suite 2: Multi-Ratio Design Specs ---');
const bounds = JSON.parse(fs.readFileSync(path.join(cwd, '.planning/specs/layout-bounds.json'), 'utf-8'));
assert(bounds.ratios['1:1'] && bounds.ratios['1:1'].width === 1080, '1:1 ratio defined (1080x1080)');
assert(bounds.ratios['9:16'] && bounds.ratios['9:16'].height === 1920, '9:16 ratio defined (1080x1920)');
assert(bounds.ratios['16:9'] && bounds.ratios['16:9'].width === 1920, '16:9 ratio defined (1920x1080)');

const matrix = JSON.parse(fs.readFileSync(path.join(cwd, '.planning/specs/creative-matrix.json'), 'utf-8'));
assert(matrix.copy_matrix.length >= 2, 'Copy matrix defines at least 2 ad creative variants');
matrix.copy_matrix.forEach((variant) => {
  assert(variant.headline.length <= variant.max_headline_chars, `Variant "${variant.id}" headline within limit (${variant.headline.length}/${variant.max_headline_chars})`);
});

// 3. Test GSD CLI Tool Verifications
console.log('\n--- Test Suite 3: GSD Verification Engine ---');
const gsdTools = '/Users/admin/Desktop/get-shit-done/get-shit-done/bin/gsd-tools.cjs';

// Plan structure check
const planStructureRes = JSON.parse(execSync(`node "${gsdTools}" verify plan-structure .planning/phases/01-creative-brief-specs/01-01-PLAN.md --cwd "${cwd}"`, { encoding: 'utf-8' }));
assert(planStructureRes.valid === true, 'GSD verify plan-structure passed (100% compliant XML tasks)');

// Phase completeness check
const phaseCompletenessRes = JSON.parse(execSync(`node "${gsdTools}" verify phase-completeness 1 --cwd "${cwd}"`, { encoding: 'utf-8' }));
assert(phaseCompletenessRes.complete === true, 'GSD verify phase-completeness passed');

// Artifacts verification check
const artifactsRes = JSON.parse(execSync(`node "${gsdTools}" verify artifacts .planning/phases/01-creative-brief-specs/01-01-PLAN.md --cwd "${cwd}"`, { encoding: 'utf-8' }));
assert(artifactsRes.all_passed === true && artifactsRes.passed === 2, 'GSD verify artifacts passed (specs exist and conform)');

// Key links verification check
const keyLinksRes = JSON.parse(execSync(`node "${gsdTools}" verify key-links .planning/phases/01-creative-brief-specs/01-01-PLAN.md --cwd "${cwd}"`, { encoding: 'utf-8' }));
assert(keyLinksRes.all_verified === true && keyLinksRes.verified === 1, 'GSD verify key-links passed');

// Roadmap progress check
const progressRes = JSON.parse(execSync(`node "${gsdTools}" progress --cwd "${cwd}"`, { encoding: 'utf-8' }));
assert(progressRes.percent === 100 && progressRes.phases[0].status === 'Executed', 'GSD progress status shows Phase 1 fully Executed (100%)');

// 4. Test GSD Context Monitor Hook
console.log('\n--- Test Suite 4: GSD Lifecycle Hooks ---');
const hookPath = '/Users/admin/Desktop/get-shit-done/hooks/gsd-context-monitor.js';
const hookRes = execSync(`node "${hookPath}"`, { encoding: 'utf-8' });
assert(!hookRes.includes('Error'), 'gsd-context-monitor.js executes without errors');

console.log(`\n========================================`);
console.log(`RESULT: ${passedTests}/${totalTests} tests passed successfully!`);
console.log(`========================================\n`);
