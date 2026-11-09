import fs from "node:fs";
import path from "node:path";
import { postReelViaBrowser } from "./src/browser_poster.js";

const STATE_FILE = path.resolve("./schedule_state.json");

const QUEUE = [
  {
    slot: 1,
    file: "/Users/admin/Desktop/Brut_Iron_Product_Video_NoBranding.mp4",
    aspect: "Original",
    caption: `Precision meets effortless glide. ✨ Built for crisp, wrinkle-free perfection with every press — featuring a heavy-weight non-stick soleplate, ergonomic grip, and rapid thermal control.\n\nCrafted with clean motion graphics & modern product aesthetics. 🎬⚡\n\n#ProductShowcase #MotionGraphics #AfterEffects #ProductVideo #IndustrialDesign #HomeAppliances #CommercialReel #VisualDesign #CreativeProduction #ModernLiving`
  },
  {
    slot: 2,
    file: "/Users/admin/Desktop/Alpha_Iron_NoBranding.mp4",
    aspect: "Original",
    caption: `Smooth performance in every detail. 🔥 From precision temperature control to a seamless golden-glide soleplate, every angle is designed to bring together form and function.\n\nHigh-impact commercial visual & motion edit. 🎞️✨\n\n#MotionDesign #AfterEffects #ProductCommercial #AdDesign #VisualEffects #ApplianceDesign #CreativeDirection #VideoEditing #ProductReel #PostProduction`
  },
  {
    slot: 3,
    file: "/Users/admin/Desktop/Immersion_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "Original",
    caption: `Instant warmth, engineered for durability. 💧⚡ High-efficiency copper heating element with shock-proof protection and rapid thermal transfer — highlighted with dynamic spec callouts and clean motion typography.\n\n#ProductReel #MotionGraphics #AfterEffects #CommercialVideo #TypographyDesign #ProductAnimation #TechVisuals #VideoProduction #HomeEssentials #CreativeEdit`
  },
  {
    slot: 4,
    file: "/Users/admin/Desktop/Z-06_Room_Heater_Promo_16-9_NoBranding.mp4",
    aspect: "Original",
    caption: `Cozy interiors meet modern heating engineering. 🔥 Dual heat settings, whisper-quiet airflow, and tip-over safety protection showcased in a cinematic widescreen commercial cut.\n\n#CommercialDirection #ProductVideo #MotionGraphics #AfterEffects #HomeComfort #InteriorAesthetics #WidescreenEdit #VideoDesign #VisualStorytelling #WinterWarmth`
  },
  {
    slot: 5,
    file: "/Users/admin/Desktop/Heater_Promo_9-16_NoBranding.mp4",
    aspect: "Original",
    caption: `Designed to keep every corner warm and inviting. ✨ Vertical product reel focusing on atmospheric lighting, sleek industrial styling, and smooth feature callouts.\n\n#ReelsDesign #MotionGraphics #AfterEffects #ProductShowcase #SocialMediaAds #CommercialEdit #WarmInteriors #VisualCraft #ModernAppliances #MotionEdit`
  },
  {
    slot: 6,
    file: "/Users/admin/Desktop/Quartz_Heater_Promo_9-16_NoBranding.mp4",
    aspect: "Original",
    caption: `Radiant quartz heating, captured in motion. 🌟 Dual quartz tubes, protective cool-touch grille, and instant radiant warmth presented in a sleek 9:16 commercial cut.\n\n#ProductCommercial #AfterEffects #MotionDesign #QuartzHeater #AdCreative #VisualEffects #IndustrialAesthetics #ReelsVideo #DesignInspiration #CreativeWork`
  },
  {
    slot: 7,
    file: "/Users/admin/Desktop/0612_Reel_Fan_NoBranding.mp4",
    aspect: "Original",
    caption: `Rose-gold elegance meets whisper-quiet performance. 🌬️✨ Up to 60% power savings and high-velocity airflow wrapped in a contemporary silhouette — brought to life with clean callout compositing.\n\n#CeilingFanDesign #ProductCommercial #MotionGraphics #AfterEffects #InteriorStyling #SmartHomeDesign #ReelsCreative #VideoCompositing #HomeDecor #AdFilm`
  },
  {
    slot: 8,
    file: "/Users/admin/Desktop/Spencer_Gold_Fan_Promo_NoBranding.mp4",
    aspect: "Original",
    caption: `Engineered for ultimate airflow. ✨ Metallic gold finish, double ball-bearing precision, and automatic motor winding — showcased through dynamic camera transitions and clean spec callouts.\n\n#ProductVisualization #MotionDesign #AfterEffects #LuxuryInteriors #IndustrialDesign #CommercialReel #VisualStorytelling #CreativePost #ModernInteriors #MotionGraphics`
  },
  {
    slot: 9,
    file: "/Users/admin/Desktop/White_Spencer_Fan_Commercial_NoBranding.mp4",
    aspect: "Original",
    caption: `Elevate your space with timeless minimalism. 🤍 Aerodynamic blades, silent motor efficiency, and seamless architectural integration — crafted for modern living spaces.\n\n#MinimalistDesign #ArchitecturalInteriors #ProductCommercial #AfterEffects #MotionGraphics #CleanAesthetics #HomeDecor #VideoProduction #ModernHome #CreativeDirection`
  }
];

export function getState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return {
    account: "deepans.designstudio",
    current_slot: 1,
    published: [
      {
        slot: 1,
        account: "deepans.designstudio",
        url: "https://www.instagram.com/deepans.designstudio/reel/DeXJnfXBPdH/",
        published_at: new Date().toISOString()
      }
    ]
  };
}

export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function uploadNextSlot() {
  const state = getState();
  const nextSlot = state.published.length + 1;
  if (nextSlot > QUEUE.length) {
    console.log("All slots published for account:", state.account);
    return { status: "all_completed", account: state.account };
  }

  const item = QUEUE.find(q => q.slot === nextSlot);
  if (!item) {
    throw new Error(`Queue item for slot ${nextSlot} not found`);
  }

  console.log(`Starting upload for Slot ${nextSlot} (${item.file}) to ${state.account}...`);
  const res = await postReelViaBrowser({
    videoPath: item.file,
    caption: item.caption,
    aspect: item.aspect,
    account: state.account
  });

  state.published.push({
    slot: nextSlot,
    account: state.account,
    url: res.url,
    published_at: new Date().toISOString()
  });
  saveState(state);
  return res;
}

if (process.argv[2] === "--init") {
  saveState(getState());
  console.log("State initialized:", JSON.stringify(getState(), null, 2));
}

if (process.argv[2] === "--next") {
  uploadNextSlot().then(res => {
    console.log("Uploaded next:", JSON.stringify(res, null, 2));
  }).catch(err => {
    console.error("Upload error:", err.message);
    process.exit(1);
  });
}
