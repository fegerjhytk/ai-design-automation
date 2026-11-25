#!/usr/bin/env node

/**
 * ai_video_controller.js
 * 
 * Master AI Video Animation Controller integrated into Design Automation.
 * Unifies:
 * 1. Google Flow MCP AI Video Generation (Omni 1.2 Flash / Veo cinematic video)
 * 2. Google Flow Image-to-Video Animation (flow_animate_image)
 * 3. Reference-Driven Motion Matcher (ae-motion-clone: cascade drop, carousel, elastic pop, stagger slide)
 * 4. Dual-Tier Harmonic Smooth GIF Publisher (ae-comp-to-gif: 50/25 FPS, GIFs_High & GIFs_Web, MP4 purge)
 * 5. Dynamic 9:16 / 16:9 Showcase Composition Builder (build_ai_video_showcase.jsx)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const {
  checkAfterEffectsHealth,
  cloneMotionFromReference,
  exportCompToSmoothGif,
  buildAIVideoShowcaseComp
} = require('./after_effects_motion_controller');

const GOOGLE_FLOW_PLUGIN_DIR = path.resolve(process.env.HOME, '.gemini/config/plugins/google-flow');

/**
 * 1. Health Audit of AI Video Animation Engines
 */
function checkAIVideoEnginesHealth() {
  const aeHealth = checkAfterEffectsHealth();
  const flowFound = fs.existsSync(GOOGLE_FLOW_PLUGIN_DIR);

  return {
    afterEffects: {
      installed: aeHealth.installed,
      version: aeHealth.version,
      running: aeHealth.running,
      motionClone: aeHealth.skillsFound.motionClone,
      compToGif: aeHealth.skillsFound.compToGif,
      puppetAnimations: aeHealth.skillsFound.puppetAnimations,
      zigmaVideoProduction: aeHealth.skillsFound.zigmaVideoProduction
    },
    googleFlow: {
      pluginInstalled: flowFound,
      pluginDir: GOOGLE_FLOW_PLUGIN_DIR,
      modelsAvailable: ['Omni 1.2 Flash (Video)', '🍌 Nano Banana 2.1 (Image Plates)']
    }
  };
}

/**
 * 2. Format Directorial Video Prompt
 * Follows cinema-director-v3 specifications (no text, camera lens, dynamic lighting)
 */
function formatDirectorialVideoPrompt(userPrompt, options = {}) {
  const style = options.style || 'Photorealistic commercial cinematography, anamorphic lens 35mm, 4K crisp fidelity';
  const camera = options.cameraMotion || 'slow steady glide forward, subtle parallax';
  const lighting = options.lighting || 'natural volumetric daylight, high dynamic range';
  
  return [
    `[STYLE: ${style}]`,
    `[CAMERA: ${camera}]`,
    `[LIGHTING: ${lighting}]`,
    `[SCENE: ${userPrompt}]`,
    `[DIRECTIVE: No on-screen text, no typography overlays, hyper-smooth physical fluid dynamics, authentic depth-of-field]`
  ].join(' ');
}

/**
 * 3. Reference-Driven Motion Cloning Interface (ae-motion-clone)
 */
function applyMotionClone(options = {}) {
  return cloneMotionFromReference({
    comp: options.comp || options.compName || 'Main Comp',
    ref: options.ref || null,
    archetype: options.archetype || 'cascade_drop',
    layout: options.layout || 'stacked',
    duration: options.duration || 5.0,
    stagger: options.stagger || 0.12,
    hold: options.hold || 1.9,
    elementsOnly: options.elementsOnly !== false,
    previewGif: options.previewGif || false
  });
}

/**
 * 4. Dual-Tier Smooth GIF Export Interface (ae-comp-to-gif)
 */
function publishSmoothGif(options = {}) {
  return exportCompToSmoothGif({
    comp: options.comp || options.compName,
    duration: options.duration || null,
    fps: options.fps || 'auto',
    out: options.out || null,
    project: options.project || null,
    skipWeb: options.skipWeb || false
  });
}

/**
 * 5. Full Commercial Video Ad Builder
 * Combines AI video footage + kinetic typography + audio narration into an After Effects project
 */
function assembleVideoAdPackage(options = {}) {
  const projectDir = options.projectDir || path.join(process.env.HOME, 'Desktop', options.projectName || 'AI Video Making Showcase');
  const userVideoPath = options.videoPath || null;

  console.log(`[AI Video Controller] Assembling Commercial Video Ad Package...`);
  console.log(`  + Project Dir: ${projectDir}`);
  if (userVideoPath) {
    console.log(`  + Hero AI Video: ${userVideoPath}`);
  }

  const showcaseResult = buildAIVideoShowcaseComp({
    projectDir: projectDir,
    videoPath: userVideoPath
  });

  return {
    success: showcaseResult.success,
    projectDir: projectDir,
    aepPath: path.join(projectDir, `${path.basename(projectDir)}.aep`),
    compName: "AI_Video_Showcase_Promo_9-16",
    output: showcaseResult.output
  };
}

// CLI Testing & Verification Interface
if (require.main === module) {
  const health = checkAIVideoEnginesHealth();
  console.log("====================================================");
  console.log("   AI VIDEO ANIMATION SYSTEM AUDIT (DESIGN AUTO)    ");
  console.log("====================================================");
  console.log("1. After Effects Motion Engines:");
  console.log(`   - AE 2026 Installed:  ${health.afterEffects.installed ? '✓ YES' : '✗ NO'}`);
  console.log(`   - Motion Clone Skill: ${health.afterEffects.motionClone ? '✓ Ready (ae-motion-clone)' : '✗ Missing'}`);
  console.log(`   - Smooth GIF Skill:   ${health.afterEffects.compToGif ? '✓ Ready (ae-comp-to-gif)' : '✗ Missing'}`);
  console.log(`   - Puppet Animations:  ${health.afterEffects.puppetAnimations ? '✓ Ready' : '✗ Missing'}`);
  console.log(`   - Zigma 9:16 Video:   ${health.afterEffects.zigmaVideoProduction ? '✓ Ready' : '✗ Missing'}`);
  console.log("2. Google Flow Cloud AI Video:");
  console.log(`   - Google Flow Plugin: ${health.googleFlow.pluginInstalled ? '✓ Ready' : '✗ Missing'}`);
  console.log(`   - Video Generation:   Omni 1.2 Flash (16:9 / 9:16 Widescreen & Reels)`);
  console.log(`   - Image-to-Video:     flow_animate_image (Reference Animation)`);
  console.log("====================================================");
}

module.exports = {
  checkAIVideoEnginesHealth,
  formatDirectorialVideoPrompt,
  applyMotionClone,
  publishSmoothGif,
  assembleVideoAdPackage
};
