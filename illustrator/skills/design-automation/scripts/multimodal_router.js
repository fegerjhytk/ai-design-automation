#!/usr/bin/env node

/**
 * multimodal_router.js
 * 
 * Master router for Design Automation:
 * 1. Text Copywriting: Google AI Studio (gemini-3-flash-preview) - 100% Free Tier ($0.00).
 * 2. Audio Voiceover: Google AI Studio TTS (gemini-2.5-flash-preview-tts) - 100% Free Tier ($0.00).
 * 3. Image Generation: Google Flow PRO (Nano Banana 2.1) - Bundled PRO Membership Credits.
 * 4. Video Generation: Google Flow PRO (Omni 1.2 Flash) - Bundled PRO Membership Credits.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";

// 1. Text Copywriting (100% Free Tier via Google AI Studio)
async function generateCopy(prompt) {
  console.log(`[Multimodal Router] Generating ad copy via gemini-3-flash-preview (Free Tier)...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Google AI Studio Error: ${data.error.message}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { success: true, text: text, modality: 'text', model: 'gemini-3-flash-preview', cost: '$0.00' };
}

// 2. Audio Voiceover & Narration (100% Free Tier via Google AI Studio)
async function generateVoiceover(scriptText, voiceName = "Aoede", outputPath) {
  console.log(`[Multimodal Router] Generating narration via gemini-2.5-flash-preview-tts (Free Tier)...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: scriptText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    })
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Google AI Studio TTS Error: ${data.error.message}`);
  }
  const rawBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!rawBase64) throw new Error("No audio data returned from Google AI Studio TTS");

  const pcmBuffer = Buffer.from(rawBase64, 'base64');
  
  // WAV header helper (24kHz, 16-bit mono)
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  const wavBuffer = Buffer.concat([header, pcmBuffer]);
  const dest = outputPath || path.join(process.env.HOME, 'Downloads', `voiceover_${Date.now()}.wav`);
  fs.writeFileSync(dest, wavBuffer);
  console.log(`  ✓ Saved Voiceover: ${dest}`);
  return { success: true, filePath: dest, voice: voiceName, modality: 'audio', model: 'gemini-2.5-flash-preview-tts', cost: '$0.00' };
}

// 3. Image Generation (Google Flow PRO Membership Credits)
async function routeImageGeneration(options = {}) {
  const prompt = options.prompt || 'Luxury architectural modern villa, cinematic golden hour, 85mm lens';
  const aspectRatio = options.aspectRatio || '1:1';
  const count = options.count || 4;

  console.log(`[Multimodal Router] Routing image request to Google Flow PRO (Nano Banana 2.1)...`);
  console.log(`  + Source: Active Google Flow PRO Membership (Credits included, $0 API bill)`);
  console.log(`  + Aspect Ratio: ${aspectRatio}`);
  console.log(`  + Model: Nano Banana 2.1 (x${count} variants)`);

  return {
    success: true,
    modality: 'image',
    engine: 'google-flow-pro',
    model: 'Nano Banana 2.1',
    cost: '$0.00 (PRO Membership Credits)',
    aspectRatio: aspectRatio,
    prompt: prompt,
    instructions: 'Use Google Flow MCP flow_generate_image or fast_nano_banana session bridge.'
  };
}

// 4. Video Generation & Motion (Google Flow PRO or Local After Effects 2026 Engine)
async function routeVideoGeneration(options = {}) {
  const engine = options.engine || (options.local ? 'after-effects' : 'after-effects'); // Defaults to zero-cost local AE
  const prompt = options.prompt || 'Cinematic slow drone reveal of modern villa, golden hour illumination';
  const aspectRatio = options.aspectRatio || '16:9';
  const duration = options.duration || '10s';
  const model = options.model || (engine === 'after-effects' ? 'After Effects 2026 ExtendScript Engine' : 'Omni 1.2 Flash');

  console.log(`[Multimodal Router] Routing motion/video request to ${engine.toUpperCase()} (${model})...`);
  console.log(`  + Engine: ${engine}`);
  console.log(`  + Aspect Ratio: ${aspectRatio}`);
  console.log(`  + Duration: ${duration}`);
  console.log(`  + Cost: $0.00 (Local AE Native Engine / Zero API Cost)`);

  return {
    success: true,
    modality: 'video',
    engine: engine,
    model: model,
    cost: '$0.00 (Zero API cost - Local Native Engine)',
    aspectRatio: aspectRatio,
    duration: duration,
    prompt: prompt,
    instructions: engine === 'after-effects' 
      ? 'Use after_effects_motion_controller.js with puppet, promo, or zigma commercial animation.'
      : 'Use Google Flow MCP flow_generate_video or flow_animate_image.'
  };
}

// 5. Local After Effects Automation Router
async function routeAfterEffectsMotion(options = {}) {
  const mode = options.mode || 'puppet'; // 'puppet', 'promo', 'product', 'buoyancy'
  const { checkAfterEffectsHealth } = require('./after_effects_motion_controller');
  const health = checkAfterEffectsHealth();

  return {
    success: true,
    engine: 'after-effects',
    mode: mode,
    installed: health.installed,
    version: health.version,
    cost: '$0.00 (Local ExtendScript / aerender)',
    skills: health.skillsFound
  };
}

// CLI Execution Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let modality = 'text';
  let prompt = 'Write a 1-sentence luxury real estate ad hook';
  let voice = 'Aoede';
  let ratio = '1:1';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--modality' && args[i + 1]) modality = args[++i];
    if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
    if (args[i] === '--voice' && args[i + 1]) voice = args[++i];
    if (args[i] === '--ratio' && args[i + 1]) ratio = args[++i];
  }

  (async () => {
    try {
      if (modality === 'text') {
        const res = await generateCopy(prompt);
        console.log(`\nResult:\n`, res.text);
      } else if (modality === 'audio') {
        const res = await generateVoiceover(prompt, voice);
        console.log(`\nResult:\n`, res);
      } else if (modality === 'image') {
        const res = await routeImageGeneration({ prompt, aspectRatio: ratio });
        console.log(`\nResult:\n`, res);
      } else if (modality === 'video') {
        const res = await routeVideoGeneration({ prompt, aspectRatio: ratio });
        console.log(`\nResult:\n`, res);
      }
    } catch (err) {
      console.error("Execution error:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  generateCopy,
  generateVoiceover,
  routeImageGeneration,
  routeVideoGeneration,
  routeAfterEffectsMotion
};
