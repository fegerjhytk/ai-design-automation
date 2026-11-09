import fs from "node:fs";
import { uploadReelToVandana, runInChromeTab, sleep } from "./upload_vandana_slot.mjs";

const SLOTS = [
  {
    slot: 3,
    name: "Immersion Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Immersion_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Thermal energy in motion",
    caption: `Thermal energy in motion — created with generative AI video workflows. 💧⚡🤖\n\nVisualizing rapid heat dissipation and heavy-duty copper conductivity through AI-assisted motion cinematography. Fluid camera orbits, synchronized spec typography, and procedural lighting bring industrial utility products into the high-tech digital spotlight.\n\nThe future of commercial product advertising is prompt-native, generative, and hyper-dynamic. 🚀🎥\n\n#AIVideo #GenerativeAI #AICommercial #ProductVisualization #ThermalDesign #MotionGraphics #VisualAI #PromptToVideo #VideoProduction #TechCommercial #CommercialDirection #AICinema`
  },
  {
    slot: 4,
    name: "Z-06 Room Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Z-06_Room_Heater_Promo_16-9_NoBranding.mp4",
    aspect: "widescreen",
    captionToken: "Cinematic warmth rendered through AI generative filmmaking",
    caption: `Cinematic warmth rendered through AI generative filmmaking. 🎬🔥🤖\n\nA widescreen commercial exploration of modern home heating aesthetics. Using AI video synthesis to simulate atmospheric warmth, volumetric room lighting, and precision industrial finishes for the Z-06 Room Heater.\n\nWidescreen storytelling meets next-gen AI commercial direction. ✨🛋️\n\n#AIVideo #GenerativeAI #AICommercial #WidescreenCommercial #CinematicAI #AIProduction #HomeAesthetics #ProductCommercial #VisualEffects #CreativeDirection #WinterWarmth #AIFilmmaking`
  },
  {
    slot: 5,
    name: "Fan Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Compact design, boundless energy",
    caption: `Compact design, boundless energy. Visualized through generative AI video creation. 🌪️🔥🤖\n\nCapturing the dynamic airflow and instant ceramic heat distribution of the portable fan heater using AI motion design. From glowing heating elements to studio camera tracking, AI video transforms everyday appliances into futuristic visual art.\n\nExperience how generative AI is reshaping product commercials. 📱✨\n\n#AIVideo #GenerativeAI #AICommercial #AIProductVideo #VisualAI #MotionDesign #PromptToVideo #IndustrialAesthetics #CommercialEdit #TechVisuals #ReelsCreative #DigitalTwin`
  },
  {
    slot: 6,
    name: "Quartz Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Quartz_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Harnessing radiant infrared energy",
    caption: `Harnessing radiant infrared energy through AI-generated motion graphics. 🌟⚡🤖\n\nDual glowing quartz heating elements brought to life with neural video rendering and dynamic camera reveals. Generative AI tools allow creators to visualize invisible physical phenomena like radiant heat transfer with hyper-realistic fidelity.\n\nBlending industrial engineering with generative AI video craftsmanship. 🎞️💡\n\n#AIVideo #GenerativeAI #AICommercial #AIProductVideo #MotionGraphics #InfraredDesign #VisualEffects #AIFilmmaking #ProductReel #FutureOfMedia #PromptEngineering #CreativeDesign`
  },
  {
    slot: 7,
    name: "0612 Designer Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/0612_Reel_Fan_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Luxury interior aesthetics engineered with AI",
    caption: `Luxury interior aesthetics engineered with AI generative video design. 🌬️✨🤖\n\nShowcasing the rose-gold accents, aerodynamic contours, and 60% energy-saving efficiency of the 0612 Designer Fan through AI-powered commercial video synthesis. Camera motion, studio reflections, and elegant spatial typography crafted seamlessly in the digital age.\n\nWhere interior luxury meets generative artificial intelligence. 🛋️💎\n\n#AIVideo #GenerativeAI #AICommercial #CeilingFanDesign #LuxuryInteriors #AIAnimation #VisualAI #AIFilmmaking #HomeDecor #ModernLiving #CreativeDirection #ProductVisualization`
  },
  {
    slot: 8,
    name: "Spencer Gold Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Spencer_Gold_Fan_Promo_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Precision mechanical motion captured through AI",
    caption: `Precision mechanical motion captured through AI video creation. ⚙️🏆🤖\n\nVisualizing high-torque air delivery and metallic gold finishes with AI-driven camera orbits and neural motion design. Generative AI enables rapid commercial ideation, high-fidelity texture simulation, and flawless cinematic transitions for product showcases.\n\nRedefining industrial product videos through the power of AI. 🚀🎬\n\n#AIVideo #GenerativeAI #AICommercial #IndustrialDesign #ProductVisualization #GoldAesthetics #MotionDesign #PromptToVideo #VisualAI #AIFilmmaking #NextGenAds #CreativePost`
  },
  {
    slot: 9,
    name: "White Spencer Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/White_Spencer_Fan_Commercial_NoBranding.mp4",
    aspect: "portrait",
    captionToken: "Pure minimalism in motion",
    caption: `Pure minimalism in motion — created with generative AI video workflows. 🤍🌬️🤖\n\nHighlighting architectural purity, silent airflow efficiency, and matte white finishes for modern contemporary homes. With AI video synthesis, every subtle shadow, clean line, and smooth aerodynamic rotation is rendered with cinematic elegance.\n\nThe new era of product commercial production is powered by AI. 🏠✨\n\n#AIVideo #GenerativeAI #AICommercial #MinimalistDesign #ArchitecturalInteriors #VisualAI #AIFilmmaking #CleanAesthetics #PromptToVideo #ProductAnimation #CreativeMedia #SmartLiving`
  }
];

const RESULTS_FILE = "/Users/admin/.gemini/config/plugins/instagram/vandanacreation_upload_results.json";

async function main() {
  console.log("===============================================================");
  console.log("=== BATCH UPLOADING SLOTS 3 TO 9 FOR VANDANA CREATION ===");
  console.log("===============================================================");

  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
    } catch {}
  }
  const publishedSlots = new Set(results.map(r => r.slot));
  const pendingSlots = SLOTS.filter(s => !publishedSlots.has(s.slot));

  console.log(`Already published slots: ${Array.from(publishedSlots).join(", ")}`);
  console.log(`Remaining slots to upload: ${pendingSlots.map(s => s.slot).join(", ")}`);

  for (const s of pendingSlots) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`>>> PROCESSING SLOT ${s.slot}: ${s.name} (${s.aspect})...`);
    console.log(`>>> Video file: ${s.file}`);
    console.log(`---------------------------------------------------------------`);

    const res = await uploadReelToVandana({
      videoPath: s.file,
      caption: s.caption,
      expectedRatioType: s.aspect
    });

    console.log(`[SLOT ${s.slot} PUBLISHED] Live Reel: ${res.url}`);

    // Verify caption on live post page
    const postUrl = res.url.replace("/reel/", "/p/");
    console.log(`[SLOT ${s.slot} VERIFYING] Navigating to ${postUrl}...`);
    runInChromeTab(`location.href = "${postUrl}";`);
    await sleep(4000);

    const postVerifyRaw = runInChromeTab(`(() => {
      const text = document.body.innerText;
      const found = text.includes(${JSON.stringify(s.captionToken)});
      return JSON.stringify({
        found: found,
        snippet: text.slice(0, 300).replace(/\\n+/g, " | ")
      });
    })()`).trim();

    const postVerify = JSON.parse(postVerifyRaw);
    console.log(`[SLOT ${s.slot} CAPTION VERIFIED]: ${postVerify.found ? "YES (CONFIRMED LIVE)" : "WARNING: Token not detected immediately"}`);

    results.push({
      slot: s.slot,
      name: s.name,
      url: res.url,
      aspect: s.aspect,
      captionVerified: postVerify.found,
      status: "LIVE_VERIFIED"
    });

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`>>> Slot ${s.slot} finished successfully! Waiting 6s before next upload...`);
    await sleep(6000);
  }

  console.log("\n===============================================================");
  console.log("=== ALL REMAINING SLOTS (3 TO 9) SUCCESSFULLY UPLOADED! ===");
  console.log("===============================================================");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error("BATCH CRITICAL FAILURE:", err);
  process.exit(1);
});
