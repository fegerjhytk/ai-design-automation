import { uploadReelToVandana } from "./upload_vandana_slot.mjs";

const SLOTS = {
  2: {
    name: "Alpha Iron",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Alpha_Iron_NoBranding.mp4",
    aspect: "portrait",
    caption: `Reimagining commercial product storytelling through generative AI video. ⚡🤖\n\nFrom precision thermal control to the golden-glide non-stick soleplate, every reflection, specular highlight, and aerodynamic contour of the Alpha Iron was conceptualized and rendered through cutting-edge AI video synthesis and prompt-driven motion design.\n\nBridging modern household engineering with artificial intelligence in commercial filmmaking. 🎬✨\n\n#AIVideo #GenerativeAI #AICommercial #AIProductVideo #VisualAI #AIFilmmaking #PromptToVideo #ProductVisualization #NeuralRendering #CommercialDesign #ApplianceDesign #MotionAesthetics`
  },
  3: {
    name: "Immersion Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Immersion_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    caption: `Thermal energy in motion — created with generative AI video workflows. 💧⚡🤖\n\nVisualizing rapid heat dissipation and heavy-duty copper conductivity through AI-assisted motion cinematography. Fluid camera orbits, synchronized spec typography, and procedural lighting bring industrial utility products into the high-tech digital spotlight.\n\nThe future of commercial product advertising is prompt-native, generative, and hyper-dynamic. 🚀🎥\n\n#AIVideo #GenerativeAI #AICommercial #ProductVisualization #ThermalDesign #MotionGraphics #VisualAI #PromptToVideo #VideoProduction #TechCommercial #CommercialDirection #AICinema`
  },
  4: {
    name: "Z-06 Room Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Z-06_Room_Heater_Promo_16-9_NoBranding.mp4",
    aspect: "widescreen",
    caption: `Cinematic warmth rendered through AI generative filmmaking. 🎬🔥🤖\n\nA widescreen commercial exploration of modern home heating aesthetics. Using AI video synthesis to simulate atmospheric warmth, volumetric room lighting, and precision industrial finishes for the Z-06 Room Heater.\n\nWidescreen storytelling meets next-gen AI commercial direction. ✨🛋️\n\n#AIVideo #GenerativeAI #AICommercial #WidescreenCommercial #CinematicAI #AIProduction #HomeAesthetics #ProductCommercial #VisualEffects #CreativeDirection #WinterWarmth #AIFilmmaking`
  },
  5: {
    name: "Fan Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    caption: `Compact design, boundless energy. Visualized through generative AI video creation. 🌪️🔥🤖\n\nCapturing the dynamic airflow and instant ceramic heat distribution of the portable fan heater using AI motion design. From glowing heating elements to studio camera tracking, AI video transforms everyday appliances into futuristic visual art.\n\nExperience how generative AI is reshaping product commercials. 📱✨\n\n#AIVideo #GenerativeAI #AICommercial #AIProductVideo #VisualAI #MotionDesign #PromptToVideo #IndustrialAesthetics #CommercialEdit #TechVisuals #ReelsCreative #DigitalTwin`
  },
  6: {
    name: "Quartz Heater",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Quartz_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "portrait",
    caption: `Harnessing radiant infrared energy through AI-generated motion graphics. 🌟⚡🤖\n\nDual glowing quartz heating elements brought to life with neural video rendering and dynamic camera reveals. Generative AI tools allow creators to visualize invisible physical phenomena like radiant heat transfer with hyper-realistic fidelity.\n\nBlending industrial engineering with generative AI video craftsmanship. 🎞️💡\n\n#AIVideo #GenerativeAI #AICommercial #AIProductVideo #MotionGraphics #InfraredDesign #VisualEffects #AIFilmmaking #ProductReel #FutureOfMedia #PromptEngineering #CreativeDesign`
  },
  7: {
    name: "0612 Designer Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/0612_Reel_Fan_NoBranding.mp4",
    aspect: "portrait",
    caption: `Luxury interior aesthetics engineered with AI generative video design. 🌬️✨🤖\n\nShowcasing the rose-gold accents, aerodynamic contours, and 60% energy-saving efficiency of the 0612 Designer Fan through AI-powered commercial video synthesis. Camera motion, studio reflections, and elegant spatial typography crafted seamlessly in the digital age.\n\nWhere interior luxury meets generative artificial intelligence. 🛋️💎\n\n#AIVideo #GenerativeAI #AICommercial #CeilingFanDesign #LuxuryInteriors #AIAnimation #VisualAI #AIFilmmaking #HomeDecor #ModernLiving #CreativeDirection #ProductVisualization`
  },
  8: {
    name: "Spencer Gold Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/Spencer_Gold_Fan_Promo_NoBranding.mp4",
    aspect: "portrait",
    caption: `Precision mechanical motion captured through AI video creation. ⚙️🏆🤖\n\nVisualizing high-torque air delivery and metallic gold finishes with AI-driven camera orbits and neural motion design. Generative AI enables rapid commercial ideation, high-fidelity texture simulation, and flawless cinematic transitions for product showcases.\n\nRedefining industrial product videos through the power of AI. 🚀🎬\n\n#AIVideo #GenerativeAI #AICommercial #IndustrialDesign #ProductVisualization #GoldAesthetics #MotionDesign #PromptToVideo #VisualAI #AIFilmmaking #NextGenAds #CreativePost`
  },
  9: {
    name: "White Spencer Fan",
    file: "/Users/admin/Desktop/Vandana_Creation_Queue/White_Spencer_Fan_Commercial_NoBranding.mp4",
    aspect: "portrait",
    caption: `Pure minimalism in motion — created with generative AI video workflows. 🤍🌬️🤖\n\nHighlighting architectural purity, silent airflow efficiency, and matte white finishes for modern contemporary homes. With AI video synthesis, every subtle shadow, clean line, and smooth aerodynamic rotation is rendered with cinematic elegance.\n\nThe new era of product commercial production is powered by AI. 🏠✨\n\n#AIVideo #GenerativeAI #AICommercial #MinimalistDesign #ArchitecturalInteriors #VisualAI #AIFilmmaking #CleanAesthetics #PromptToVideo #ProductAnimation #CreativeMedia #SmartLiving`
  }
};

const slotArg = parseInt(process.argv[2] || "2", 10);
const slotData = SLOTS[slotArg];

if (!slotData) {
  console.error(`Invalid slot number: ${slotArg}. Valid slots are 2 to 9.`);
  process.exit(1);
}

console.log(`Executing upload for Slot ${slotArg}: ${slotData.name}...`);
uploadReelToVandana({
  videoPath: slotData.file,
  caption: slotData.caption,
  expectedRatioType: slotData.aspect
}).then(res => {
  console.log("\n======================================================");
  console.log(`[SLOT ${slotArg} COMPLETE] Upload succeeded!`);
  console.log(`Reel URL: ${res.url}`);
  process.exit(0);
}).catch(err => {
  console.error(`\n[SLOT ${slotArg} FAILED]:`, err.message);
  process.exit(1);
});
