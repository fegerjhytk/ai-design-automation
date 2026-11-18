/**
 * Environmental Staging Engine for Google Flow & Nano Banana 2.1
 * Directorial prompt generator for testing packaging across retail shelves and real-world lighting.
 */

const LIGHTING_PRESETS = {
  retail_shelf: {
    description: "Supermarket / high-end boutique retail shelf surrounded by competitor packaging.",
    prompt_spine: "Commercial retail shelf placement, front-facing eye-level hero angle. High-end modern organic tea boutique, subtle fluorescent top lighting, shallow depth of field with competing generic brands blurred in the background, authentic shelf depth, crisp packaging reflections.",
    negative_addition: "blurry logo, unreadable text, distorted geometry, flat background"
  },
  direct_daylight: {
    description: "Harsh outdoor direct 12:00 PM sunlight testing metallic specularity and shadows.",
    prompt_spine: "Outdoor architectural tabletop, sharp direct midday sunlight, high-contrast crisp cast shadows, specular highlights on polished chrome lid, tactile matte paper texture with authentic micro-grain, warm natural atmosphere.",
    negative_addition: "overcast, washed out colors, artificial studio backdrop"
  },
  moody_ambient: {
    description: "Atmospheric evening espresso bar / cocktail lounge ambient glow.",
    prompt_spine: "Dark moody ambient cafe counter, warm tungsten side-rim lighting, dark polished marble surface with subtle specular reflections, rich moody atmospheric vignette, premium tactile container presence.",
    negative_addition: "flat white studio light, sterile product catalog render"
  }
};

export function stageEnvironmentalMockup(options) {
  const {
    brandName = "MIRAI",
    containerType = "cylindrical matte tin can with chrome lid",
    primaryColor = "Imperial Cinnabar Maroon (#4A0E17)",
    lightingPreset = "retail_shelf",
    aspectRatio = "16:9"
  } = options;

  const preset = LIGHTING_PRESETS[lightingPreset] || LIGHTING_PRESETS.retail_shelf;

  const fullPrompt = `${brandName} branded premium ${containerType}, finished in deep ${primaryColor}. ${preset.prompt_spine} Master product photography, optical 85mm lens, f/2.8 aperture, authentic tactile material grain, 8k resolution.`;

  return {
    lighting_preset: lightingPreset,
    aspect_ratio: aspectRatio,
    recommended_model: "🍌 Nano Banana 2.1",
    flow_tool_call_payload: {
      tool: "flow_generate_image",
      arguments: {
        prompt: fullPrompt,
        aspectRatio: aspectRatio,
        model: "Nano Banana 2.1",
        thinkingLevel: "High",
        count: 4
      }
    },
    verification_intent: "Inspect whether the brand identity stands out against category competitors or gets lost in the background."
  };
}
