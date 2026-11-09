#!/usr/bin/env node

/**
 * after_effects_motion_controller.js
 * 
 * Master After Effects Controller integrated into AI Design Automation:
 * Unifies the 4 After Effects skills:
 * 1. after-effects-puppet-animations (Reading flow, kinetic puppet animation from .ai layers)
 * 2. pub-perk-animation (Automated 10s multi-offer promo motion graphics to .aep)
 * 3. zigma-commercial-video-production (9:16 mobile product videos, floating buoyancy physics, 3D callout badges)
 * 4. zigma-start-opener-video (Timeline architecture and opener sequences)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const SKILLS_DIR = path.resolve(__dirname, '../../');
const PUPPET_SKILL_DIR = path.join(SKILLS_DIR, 'after-effects-puppet-animations');
const PUB_PERK_SKILL_DIR = path.join(SKILLS_DIR, 'pub-perk-animation');
const ZIGMA_PROD_SKILL_DIR = path.join(SKILLS_DIR, 'zigma-commercial-video-production');
const ZIGMA_OPENER_SKILL_DIR = path.join(SKILLS_DIR, 'zigma-start-opener-video');

const AE_APP_NAME = process.env.AFTER_EFFECTS_APP || 'Adobe After Effects 2026';
const AE_APP_PATH = '/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app';
const AERENDER_PATH = '/Applications/Adobe After Effects 2026/aerender';

/**
 * 1. Health & Environment Audit
 */
function checkAfterEffectsHealth() {
  const result = {
    installed: false,
    version: null,
    running: false,
    aerender: false,
    skillsFound: {
      puppetAnimations: fs.existsSync(PUPPET_SKILL_DIR),
      pubPerkAnimation: fs.existsSync(PUB_PERK_SKILL_DIR),
      zigmaProduction: fs.existsSync(ZIGMA_PROD_SKILL_DIR),
      zigmaOpener: fs.existsSync(ZIGMA_OPENER_SKILL_DIR),
    }
  };

  if (fs.existsSync(AE_APP_PATH)) {
    result.installed = true;
  }

  if (fs.existsSync(AERENDER_PATH)) {
    result.aerender = true;
    try {
      const v = execSync(`"${AERENDER_PATH}" -version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      result.version = v.trim();
    } catch (e) {
      if (e.stdout) result.version = e.stdout.trim();
    }
  }

  try {
    const pgrep = execSync('pgrep -il "after effects"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    result.running = pgrep.trim().length > 0;
  } catch (e) {
    result.running = false;
  }

  return result;
}

/**
 * 2. Execute ExtendScript directly in Adobe After Effects
 */
function executeAEScript(jsxCode, timeoutMs = 120000) {
  const tmpJsx = path.join('/tmp', `ae_run_${Date.now()}_${Math.random().toString(36).substring(7)}.jsx`);
  fs.writeFileSync(tmpJsx, jsxCode, 'utf8');

  const osaCmd = `tell application "${AE_APP_NAME}" to DoScriptFile "${tmpJsx}"`;
  try {
    const res = spawnSync('osascript', ['-e', `with timeout of ${Math.round(timeoutMs / 1000)} seconds\n${osaCmd}\nend timeout`], {
      encoding: 'utf8',
      timeout: timeoutMs + 5000,
      maxBuffer: 10 * 1024 * 1024
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    if (res.status !== 0) {
      return { success: false, error: res.stderr || 'AppleScript DoScriptFile failed' };
    }
    return { success: true, output: res.stdout.trim() };
  } finally {
    if (fs.existsSync(tmpJsx)) {
      try { fs.unlinkSync(tmpJsx); } catch (_) {}
    }
  }
}

/**
 * 3. Reading Flow & Puppet Animation (after-effects-puppet-animations)
 */
function animatePuppetFlow(aiFilePath, options = {}) {
  const cliScript = path.join(PUPPET_SKILL_DIR, 'scripts', 'cli_puppet_animator.js');
  if (!fs.existsSync(cliScript)) {
    throw new Error(`Puppet animation script not found at: ${cliScript}`);
  }

  const duration = options.duration || 10;
  const fps = options.fps || 24;
  const flow = options.flow || 'columns';
  const outAep = options.output || aiFilePath.replace(/\.ai$/i, '.aep');

  console.log(`[After Effects] Running reading-flow puppet animation on: ${path.basename(aiFilePath)}`);
  console.log(`  + Flow: ${flow} | Duration: ${duration}s | FPS: ${fps}`);

  const args = [
    cliScript,
    '--file', aiFilePath,
    '--output', outAep,
    '--duration', String(duration),
    '--fps', String(fps),
    '--flow', flow
  ];

  const res = spawnSync('node', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Puppet animation failed: ${res.stderr || res.stdout}`);
  }

  return {
    success: true,
    aepPath: outAep,
    duration,
    fps,
    flow,
    stdout: res.stdout.trim()
  };
}

/**
 * 4. Multi-Layer Promotional Animation (pub-perk-animation)
 */
function animatePromoComp(aiFilePath, options = {}) {
  const cliScript = path.join(PUB_PERK_SKILL_DIR, 'scripts', 'cli_animator.js');
  if (!fs.existsSync(cliScript)) {
    throw new Error(`Pub-perk animator script not found at: ${cliScript}`);
  }

  const outAep = options.output || aiFilePath.replace(/\.ai$/i, '.aep');
  console.log(`[After Effects] Generating 10s Promo Motion Graphics Comp for: ${path.basename(aiFilePath)}`);

  const args = [cliScript, '--file', aiFilePath, '--output', outAep];
  const res = spawnSync('node', args, { encoding: 'utf8' });

  if (res.status !== 0) {
    throw new Error(`Promo animation failed: ${res.stderr || res.stdout}`);
  }

  return {
    success: true,
    aepPath: outAep,
    stdout: res.stdout.trim()
  };
}

/**
 * 5. Floating Wave Buoyancy & Physics (zigma-commercial-video-production)
 */
function applyBuoyancyPhysics(compName = "Main Comp", layerNames = []) {
  const buoyancyScript = path.join(ZIGMA_PROD_SKILL_DIR, 'scripts', 'apply_wave_buoyancy.jsx');
  if (!fs.existsSync(buoyancyScript)) {
    throw new Error(`Buoyancy script not found at: ${buoyancyScript}`);
  }

  const scriptCode = `
    (function() {
      var buoyancyFile = new File("${buoyancyScript.replace(/"/g, '\\"')}");
      if (buoyancyFile.exists) {
        $.evalFile(buoyancyFile);
      }
      return "OK||Buoyancy physics applied to active composition";
    })();
  `;

  return executeAEScript(scriptCode);
}

/**
 * 6. Video Rendering via aerender
 */
function renderAEPComposition(aepPath, compName, outputPath) {
  if (!fs.existsSync(AERENDER_PATH)) {
    throw new Error(`aerender not found at: ${AERENDER_PATH}`);
  }
  if (!fs.existsSync(aepPath)) {
    throw new Error(`AEP file not found at: ${aepPath}`);
  }

  console.log(`[After Effects] Rendering composition "${compName}" to: ${outputPath}`);
  const cmd = `"${AERENDER_PATH}" -project "${aepPath}" -comp "${compName}" -output "${outputPath}"`;
  const res = execSync(cmd, { encoding: 'utf8' });
  return { success: true, outputPath, stdout: res };
}

/**
 * 7. AI Video Services Showcase Automation (15s Video + Kinetic Graphics + SFX)
 */
function buildAIVideoShowcaseComp(options = {}) {
  const projectDir = options.projectDir || path.join(process.env.HOME, 'Desktop', 'AI Video Making Showcase');
  const userVideoPath = options.videoPath || null;
  const scriptPath = path.join(__dirname, 'build_ai_video_showcase.jsx');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Showcase comp builder not found at: ${scriptPath}`);
  }

  const audioDir = path.join(projectDir, '(Footage)', 'Audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const sfxLibraryDir = path.join(
    process.env.HOME,
    'Library/CloudStorage/GoogleDrive-deepaanshukumar@gmail.com/Shared drives/Zept/After effect effect_assect/05_Audio & SFX'
  );

  const whooshB = path.join(sfxLibraryDir, 'SFX/Sound Effects/Whooshes/14 Fast Whoosh B.wav');
  const whooshSimple = path.join(sfxLibraryDir, 'SFX/Sound Effects/Whooshes/17 Simple_Whoosh.wav');
  const flash = path.join(sfxLibraryDir, 'SFX/Sound Effects V4/camera shot flash 2.mp3');

  if (fs.existsSync(whooshB) && !fs.existsSync(path.join(audioDir, '14 Fast Whoosh B.wav'))) {
    fs.copyFileSync(whooshB, path.join(audioDir, '14 Fast Whoosh B.wav'));
  }
  if (fs.existsSync(whooshSimple) && !fs.existsSync(path.join(audioDir, '17 Simple_Whoosh.wav'))) {
    fs.copyFileSync(whooshSimple, path.join(audioDir, '17 Simple_Whoosh.wav'));
  }
  if (fs.existsSync(flash) && !fs.existsSync(path.join(audioDir, 'camera shot flash 2.mp3'))) {
    fs.copyFileSync(flash, path.join(audioDir, 'camera shot flash 2.mp3'));
  }

  if (userVideoPath && fs.existsSync(userVideoPath)) {
    const destVideo = path.join(projectDir, '(Footage)', 'user_ai_video.mp4');
    fs.copyFileSync(userVideoPath, destVideo);
  }

  console.log(`[After Effects] Building AI Video Showcase Composition in After Effects 2026...`);
  console.log(`  + Project Dir: ${projectDir}`);

  const runCode = `
    (function() {
      var builder = new File("${scriptPath.replace(/"/g, '\\"')}");
      if (builder.exists) {
        $.evalFile(builder);
      }
      return "OK||Showcase comp built successfully";
    })();
  `;

  return executeAEScript(runCode);
}

// CLI Testing & Verification Interface
if (require.main === module) {
  const health = checkAfterEffectsHealth();
  console.log("=== AFTER EFFECTS AUTOMATION HEALTH AUDIT ===");
  console.log(`  Installed:    ${health.installed ? '✓ YES' : '✗ NO'} (${AE_APP_PATH})`);
  console.log(`  Version:      ${health.version || 'Unknown'}`);
  console.log(`  aerender:     ${health.aerender ? '✓ Available' : '✗ Missing'}`);
  console.log(`  Live Running: ${health.running ? '● Active' : '○ Standby / Not running'}`);
  console.log(`  Skills Integrated:`);
  console.log(`    - Puppet Animations:   ${health.skillsFound.puppetAnimations ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - Pub Perk Promo Comp: ${health.skillsFound.pubPerkAnimation ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - Zigma Video Prod:    ${health.skillsFound.zigmaProduction ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - Zigma Opener Video:  ${health.skillsFound.zigmaOpener ? '✓ Ready' : '✗ Missing'}`);
  console.log("=============================================");
}

module.exports = {
  checkAfterEffectsHealth,
  executeAEScript,
  animatePuppetFlow,
  animatePromoComp,
  applyBuoyancyPhysics,
  renderAEPComposition,
  buildAIVideoShowcaseComp
};
