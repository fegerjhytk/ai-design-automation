#!/usr/bin/env node

/**
 * after_effects_motion_controller.js
 * 
 * Master After Effects Controller integrated into AI Design Automation:
 * Unifies the After Effects skills:
 * 1. after-effects-puppet-animations (Reading flow, kinetic puppet animation from .ai layers)
 * 2. pub-perk-animation (Automated 10s multi-offer promo motion graphics to .aep)
 * 3. zigma-video-production (9:16 mobile product videos, start/opener architecture, floating buoyancy, 3D callout badges)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function resolveSkillDir(skillName) {
  const candidates = [
    path.resolve(__dirname, '../../', skillName),
    path.resolve(__dirname, '../../../after-effects/skills', skillName),
    path.resolve(__dirname, '../../../indesign/skills', skillName),
    path.resolve(__dirname, '../../../illustrator/skills', skillName),
    path.join(process.env.HOME || '', '.gemini/config/skills', skillName)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

const SKILLS_DIR = resolveSkillDir('design-automation') === path.resolve(__dirname, '..')
  ? path.resolve(__dirname, '../../')
  : path.join(process.env.HOME || '', '.gemini/config/skills');
const PUPPET_SKILL_DIR = resolveSkillDir('after-effects-puppet-animations');
const PUB_PERK_SKILL_DIR = resolveSkillDir('pub-perk-animation');
const ZIGMA_SKILL_DIR = resolveSkillDir('zigma-video-production');
const QC_DIFF_SKILL_DIR = resolveSkillDir('design-qc-visual-diff');
const AE_MOTION_CLONE_SKILL_DIR = resolveSkillDir('ae-motion-clone');
const AE_COMP_TO_GIF_SKILL_DIR = resolveSkillDir('ae-comp-to-gif');
const AE_VERTICAL_REEL_SKILL_DIR = resolveSkillDir('ae-vertical-reel-editor');

const AE_DETECTED_YEAR = fs.existsSync('/Applications/Adobe After Effects 2027/Adobe After Effects 2027.app')
  ? '2027'
  : '2026';
const AE_APP_NAME = process.env.AFTER_EFFECTS_APP || `Adobe After Effects ${AE_DETECTED_YEAR}`;
const AE_APP_PATH = `/Applications/Adobe After Effects ${AE_DETECTED_YEAR}/Adobe After Effects ${AE_DETECTED_YEAR}.app`;
const AERENDER_PATH = `/Applications/Adobe After Effects ${AE_DETECTED_YEAR}/aerender`;

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
      zigmaVideoProduction: fs.existsSync(ZIGMA_SKILL_DIR),
      qcVisualDiff: fs.existsSync(QC_DIFF_SKILL_DIR),
      motionClone: fs.existsSync(AE_MOTION_CLONE_SKILL_DIR),
      compToGif: fs.existsSync(AE_COMP_TO_GIF_SKILL_DIR),
      verticalReelEditor: fs.existsSync(AE_VERTICAL_REEL_SKILL_DIR),
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
 * 5. Floating Wave Buoyancy & Physics (zigma-video-production)
 */
function applyBuoyancyPhysics(compName = "Main Comp", layerNames = []) {
  const buoyancyScript = path.join(ZIGMA_SKILL_DIR, 'scripts', 'apply_wave_buoyancy.jsx');
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
  const res = spawnSync(AERENDER_PATH, ['-project', aepPath, '-comp', compName, '-output', outputPath], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (res.status !== 0) {
    throw new Error(`aerender failed with code ${res.status}: ${res.stderr || res.stdout}`);
  }
  return { success: true, outputPath, stdout: res.stdout };
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

  // Resolve SFX library path dynamically from env or active Google Drive storage
  let sfxLibraryDir = process.env.SFX_LIBRARY_DIR || '';
  if (!sfxLibraryDir) {
    const cloudStorageDir = path.join(process.env.HOME, 'Library/CloudStorage');
    if (fs.existsSync(cloudStorageDir)) {
      try {
        const driveFolders = fs.readdirSync(cloudStorageDir).filter(f => f.startsWith('GoogleDrive-'));
        for (const df of driveFolders) {
          const candidate = path.join(cloudStorageDir, df, 'Shared drives/Zept/After effect effect_assect/05_Audio & SFX');
          if (fs.existsSync(candidate)) {
            sfxLibraryDir = candidate;
            break;
          }
        }
      } catch (_) {}
    }
  }

  const whooshB = sfxLibraryDir ? path.join(sfxLibraryDir, 'SFX/Sound Effects/Whooshes/14 Fast Whoosh B.wav') : '';
  const whooshSimple = sfxLibraryDir ? path.join(sfxLibraryDir, 'SFX/Sound Effects/Whooshes/17 Simple_Whoosh.wav') : '';
  const flash = sfxLibraryDir ? path.join(sfxLibraryDir, 'SFX/Sound Effects V4/camera shot flash 2.mp3') : '';

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

/**
 * 8. Pre-Flight Artwork Audit for Animation (via design-qc-visual-diff)
 * Audits vector artwork, fonts, and swatches before importing into After Effects
 */
function preflightArtworkForAnimation(aiPath) {
  console.log(`[After Effects Pre-Flight] Auditing vector artwork for animation integrity: ${aiPath || "active"}`);
  const runnerPath = path.join(QC_DIFF_SKILL_DIR, 'scripts', 'qc_runner.py');
  if (!fs.existsSync(runnerPath)) {
    return { success: false, error: "design-qc-visual-diff skill not found" };
  }
  const args = aiPath ? ['--file', aiPath] : ['--active'];
  const res = spawnSync('python3', [runnerPath, ...args], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (res.status !== 0) {
    return { success: false, error: res.stderr || 'QC audit failed', output: res.stdout };
  }
  return { success: true, output: res.stdout };
}

/**
 * 9. Visual Change Diffing for Video Animation & Storyboard Revisions
 * Generates side-by-side image comparison, marked diffs with bounding boxes/pins,
 * and an interactive HTML split-screen curtain slider.
 */
function generateAnimationVisualDiff(beforePath, afterPath, outputDir, mode = 'all') {
  console.log(`[After Effects Proofing] Generating Visual Change Diff (${mode} mode)...`);
  const enginePath = path.join(QC_DIFF_SKILL_DIR, 'scripts', 'visual_diff_engine.py');
  if (!fs.existsSync(enginePath)) {
    return { success: false, error: "visual_diff_engine.py not found in design-qc-visual-diff" };
  }
  const out = outputDir || path.join(process.env.HOME, 'Downloads', 'AE_Visual_Diff');
  const args = ['run', '--with', 'pillow', 'python3', enginePath, '--before', beforePath, '--after', afterPath, '--mode', mode, '--output', out];
  const res = spawnSync('uv', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (res.status !== 0) {
    return { success: false, error: res.stderr || 'Visual diff generation failed', output: res.stdout };
  }
  return { success: true, outputDir: out, log: res.stdout };
}

/**
 * 10. Reference-Driven Motion Cloning (ae-motion-clone)
 * Extracts motion choreography, physical trajectories (cascade drop, carousel scroll, elastic pop, stagger slide)
 * from reference videos/URLs and injects them directly into any composition.
 */
function cloneMotionFromReference(options = {}) {
  const cloneScript = path.join(AE_MOTION_CLONE_SKILL_DIR, 'scripts', 'clone_motion.sh');
  if (!fs.existsSync(cloneScript)) {
    throw new Error(`ae-motion-clone script not found at: ${cloneScript}`);
  }

  const compName = options.compName || options.comp;
  if (!compName) {
    throw new Error(`--comp <CompName> is required for motion cloning.`);
  }

  const args = ['--comp', compName];
  if (options.ref) args.push('--ref', options.ref);
  if (options.archetype) args.push('--archetype', options.archetype);
  if (options.layout) args.push('--layout', options.layout);
  if (options.duration) args.push('--duration', String(options.duration));
  if (options.stagger) args.push('--stagger', String(options.stagger));
  if (options.hold) args.push('--hold', String(options.hold));
  if (options.elementsOnly !== false) args.push('--elements-only');
  else args.push('--include-text');
  if (options.previewGif) args.push('--preview-gif');

  console.log(`[After Effects] Cloning reference motion into comp: "${compName}"...`);
  console.log(`  + Archetype: ${options.archetype || 'cascade_drop'} | Layout: ${options.layout || 'as-is'}`);
  if (options.ref) console.log(`  + Reference: ${options.ref}`);

  const res = spawnSync(cloneScript, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (res.stdout) console.log(res.stdout.trim());
  if (res.stderr) console.error(res.stderr.trim());

  if (res.status !== 0) {
    throw new Error(`Motion clone execution failed.`);
  }

  const resultPath = '/tmp/ae_motion_result.json';
  let details = {};
  if (fs.existsSync(resultPath)) {
    try { details = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch (_) {}
  }

  return {
    success: true,
    compName,
    archetype: options.archetype || 'cascade_drop',
    details
  };
}

/**
 * 11. Harmonic Smooth GIF Export (ae-comp-to-gif)
 * Converts AE comp into 50/25/20 FPS GIFs inside Output/GIFs_High & Output/GIFs_Web
 * with automated intermediate MP4 cleanup.
 */
function exportCompToSmoothGif(options = {}) {
  const exportScript = path.join(AE_COMP_TO_GIF_SKILL_DIR, 'scripts', 'ae_to_gif.sh');
  if (!fs.existsSync(exportScript)) {
    throw new Error(`ae-comp-to-gif script not found at: ${exportScript}`);
  }

  const compName = options.compName || options.comp;
  if (!compName) {
    throw new Error(`exportCompToSmoothGif requires --comp <CompName>`);
  }

  const args = ['--comp', compName];
  if (options.duration) args.push('--duration', String(options.duration));
  if (options.fps) args.push('--fps', String(options.fps));
  if (options.out) args.push('--out', options.out);
  if (options.project) args.push('--project', options.project);
  if (options.skipWeb) args.push('--skip-web');

  console.log(`[After Effects] Exporting smooth GIF via ae-comp-to-gif...`);
  console.log(`  + Comp: ${compName}`);
  console.log(`  + Duration: ${options.duration ? options.duration + 's' : 'Comp Duration'}`);
  console.log(`  + FPS: ${options.fps || 'auto (harmonic 50/25)'}`);

  const res = spawnSync(exportScript, args, { encoding: 'utf8', stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`Smooth GIF export execution failed.`);
  }

  return {
    success: true,
    compName,
    duration: options.duration,
    fps: options.fps || 'auto'
  };
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
  console.log(`    - Zigma Video Prod:    ${health.skillsFound.zigmaVideoProduction ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - QC & Visual Diff:    ${health.skillsFound.qcVisualDiff ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - AE Motion Clone:     ${health.skillsFound.motionClone ? '✓ Ready' : '✗ Missing'}`);
  console.log(`    - AE Smooth GIF:       ${health.skillsFound.compToGif ? '✓ Ready' : '✗ Missing'}`);
  console.log("=============================================");
}

module.exports = {
  checkAfterEffectsHealth,
  executeAEScript,
  animatePuppetFlow,
  animatePromoComp,
  applyBuoyancyPhysics,
  renderAEPComposition,
  buildAIVideoShowcaseComp,
  preflightArtworkForAnimation,
  generateAnimationVisualDiff,
  cloneMotionFromReference,
  exportCompToSmoothGif
};
