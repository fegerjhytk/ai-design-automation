import fs from "node:fs";
import { scheduleReelDirect, sleep } from "./schedule_runner.mjs";

const SLOTS = [
  {
    slot: 3,
    file: "/Users/admin/Desktop/Immersion_Heater_Promo_9-16_NoBranding.mp4",
    day: "13",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Instant warmth, engineered for durability. 💧⚡ High-efficiency copper heating element with shock-proof protection and rapid thermal transfer — highlighted with dynamic spec callouts and clean motion typography.\n\n#ProductReel #MotionGraphics #AfterEffects #CommercialVideo #TypographyDesign #ProductAnimation #TechVisuals #VideoProduction #HomeEssentials #CreativeEdit`
  },
  {
    slot: 4,
    file: "/Users/admin/Desktop/Z-06_Room_Heater_Promo_16-9_NoBranding.mp4",
    day: "14",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "16:9",
    caption: `Cozy interiors meet modern heating engineering. 🔥 Dual heat settings, whisper-quiet airflow, and tip-over safety protection showcased in a cinematic widescreen commercial cut.\n\n#CommercialDirection #ProductVideo #MotionGraphics #AfterEffects #HomeComfort #InteriorAesthetics #WidescreenEdit #VideoDesign #VisualStorytelling #WinterWarmth`
  },
  {
    slot: 5,
    file: "/Users/admin/Desktop/Heater_Promo_9-16_NoBranding.mp4",
    day: "15",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Designed to keep every corner warm and inviting. ✨ Vertical product reel focusing on atmospheric lighting, sleek industrial styling, and smooth feature callouts.\n\n#ReelsDesign #MotionGraphics #AfterEffects #ProductShowcase #SocialMediaAds #CommercialEdit #WarmInteriors #VisualCraft #ModernAppliances #MotionEdit`
  },
  {
    slot: 6,
    file: "/Users/admin/Desktop/Quartz_Heater_Promo_9-16_NoBranding.mp4",
    day: "16",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Radiant quartz heating, captured in motion. 🌟 Dual quartz tubes, protective cool-touch grille, and instant radiant warmth presented in a sleek 9:16 commercial cut.\n\n#ProductCommercial #AfterEffects #MotionDesign #QuartzHeater #AdCreative #VisualEffects #IndustrialAesthetics #ReelsVideo #DesignInspiration #CreativeWork`
  },
  {
    slot: 7,
    file: "/Users/admin/Desktop/0612_Reel_Fan_NoBranding.mp4",
    day: "17",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Rose-gold elegance meets whisper-quiet performance. 🌬️✨ Up to 60% power savings and high-velocity airflow wrapped in a contemporary silhouette — brought to life with clean callout compositing.\n\n#CeilingFanDesign #ProductCommercial #MotionGraphics #AfterEffects #InteriorStyling #SmartHomeDesign #ReelsCreative #VideoCompositing #HomeDecor #AdFilm`
  },
  {
    slot: 8,
    file: "/Users/admin/Desktop/Spencer_Gold_Fan_Promo_NoBranding.mp4",
    day: "18",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Engineered for ultimate airflow. ✨ Metallic gold finish, double ball-bearing precision, and automatic motor winding — showcased through dynamic camera transitions and clean spec callouts.\n\n#ProductVisualization #MotionDesign #AfterEffects #LuxuryInteriors #IndustrialDesign #CommercialReel #VisualStorytelling #CreativePost #ModernInteriors #MotionGraphics`
  },
  {
    slot: 9,
    file: "/Users/admin/Desktop/White_Spencer_Fan_Commercial_NoBranding.mp4",
    day: "19",
    hour: "10",
    minute: "35",
    ampm: "AM",
    aspect: "9:16",
    caption: `Elevate your space with timeless minimalism. 🤍 Aerodynamic blades, silent motor efficiency, and seamless architectural integration — crafted for modern living spaces.\n\n#MinimalistDesign #ArchitecturalInteriors #ProductCommercial #AfterEffects #MotionGraphics #CleanAesthetics #HomeDecor #VideoProduction #ModernHome #CreativeDirection`
  }
];

async function run() {
  console.log("=== STARTING BATCH SCHEDULE FOR DEEPANSHU (SLOTS 3 TO 9) ===");
  for (const s of SLOTS) {
    console.log(`\n>>> Processing Slot ${s.slot}...`);
    await scheduleReelDirect({
      videoPath: s.file,
      caption: s.caption,
      dayNumber: s.day,
      hour: s.hour,
      minute: s.minute,
      ampm: s.ampm,
      aspect: s.aspect
    });
    console.log(`>>> Slot ${s.slot} scheduled successfully! Waiting 5s before next...`);
    await sleep(5000);
  }
  console.log("\n=== ALL SLOTS (3 TO 9) FOR DEEPANSHU SUCCESSFULLY SCHEDULED! ===");
}

run().catch(err => {
  console.error("BATCH ERROR:", err);
  process.exit(1);
});
