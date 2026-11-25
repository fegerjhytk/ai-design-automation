/**
 * Anti-Sameness Category Deconstruction & Strategy Engine
 * Based on Shantanu Kumar's Mirai Matcha methodology.
 */

const CATEGORY_DEFAULTS = {
  matcha: {
    cliche_colors: ["#8A9A86 (Sage Green)", "#F4F1EA (Off-White)", "#D4E09B (Pastel Lime)"],
    cliche_type: "Clean minimalist neo-grotesque sans-serif (e.g. Inter, Helvetica)",
    cliche_symbols: ["Bamboo whisk (Chasen)", "Tea leaf", "Zen circle (Enso)", "Teacup line art"],
    banned_copy: ["Mindful", "Ritual", "Zen", "Ceremonial Grade", "Pure", "Inner Peace"],
    counter_anchor: {
      origin_insight: "Matcha originated in Tang & Song Dynasty China before reaching Kyoto. Honoring its ancient continental roots breaks the predictable Kyoto tea-house cliché.",
      pigment_palette: ["#4A0E17 (Imperial Cinnabar Maroon)", "#1E1E1E (Obsidian Noir)", "#E5E5E5 (Liquid Chrome)"],
      tactile_textures: ["Brushed stainless steel", "Linear gradient metal", "Diffused cast shadow"],
      recommended_typography: "Weighted modern serif with short brackets and sharp vertical stress"
    }
  },
  coffee: {
    cliche_colors: ["#6F4E37 (Kraft Brown)", "#C4A482 (Tan)", "#2E1C14 (Dark Roast)"],
    cliche_type: "Vintage monoline slab serif or hipster stamp script",
    cliche_symbols: ["Coffee bean", "Portafilter", "Steaming mug", "Crossed vintage banners"],
    banned_copy: ["Artisanal", "Craft Roasted", "Awaken Your Senses", "Small Batch", "Bean to Cup"],
    counter_anchor: {
      origin_insight: "Trace Ethiopian mountain origins or brutalist industrial extraction rather than rustic café hipsterism.",
      pigment_palette: ["#002FA7 (International Klein Blue)", "#FF4500 (Safety Orange)", "#111111 (Raw Basalt)"],
      tactile_textures: ["Translucent frosted acrylic", "Monolithic raw aluminum", "High-gloss typography"],
      recommended_typography: "High-contrast editorial Didone or condensed architectural grotesque"
    }
  },
  luxury_real_estate: {
    cliche_colors: ["#D4AF37 (Gold Foil)", "#0A192F (Midnight Navy)", "#1C1C1C (Charcoal)"],
    cliche_type: "Ultra-thin Didone serif with fragile hairline strokes",
    cliche_symbols: ["Tower outline silhouette", "Key crest", "Monogram laurel wreath"],
    banned_copy: ["Exclusive", "Prestigious", "Unparalleled Luxury", "Curated Living", "Sanctuary"],
    counter_anchor: {
      origin_insight: "Anchor in architectural tectonic materiality (cast concrete, fluted travertine, marine grade steel) rather than generic gold-gilt royalty.",
      pigment_palette: ["#002644 (Deep Marine Slate)", "#E2E8F0 (Frosted Ice Cyan)", "#FFFFFF (Pure High-Reflectance)"],
      tactile_textures: ["Brushed titanium", "Fluted glass", "Deep optical sky gradients"],
      recommended_typography: "Display Didone paired with structured modern grotesque (e.g. IvyPresto + Akmorn)"
    }
  },
  clean_beauty: {
    cliche_colors: ["#FAD2E1 (Blush Pink)", "#E2ECE9 (Mint)", "#FAF9F6 (Alabaster)"],
    cliche_type: "Lowercase geometric sans with wide tracking",
    cliche_symbols: ["Botanical sprig", "Water drop", "Minimalist face contour outline"],
    banned_copy: ["Clean", "Glowing", "Nontoxic", "Botanical", "Radiant", "Pure Beauty"],
    counter_anchor: {
      origin_insight: "Anchor in bio-fermentation, deep cellular chemistry, and laboratory clinical precision.",
      pigment_palette: ["#1B4332 (Deep Forest Jade)", "#D8B4E2 (Hyper-violet)", "#FFFFFF (Clinical Enamel)"],
      tactile_textures: ["Amber pharmaceutical glass", "Heavy embossed ceramic", "Directional studio rim light"],
      recommended_typography: "Clinical monospace accents paired with sculpted transitional serif"
    }
  },
  tech_saas: {
    cliche_colors: ["#6366F1 (Indigo-Violet)", "#0EA5E9 (Cyan)", "#0F172A (Dark Slate)"],
    cliche_type: "Default Inter / Roboto / System Sans",
    cliche_symbols: ["Glowing mesh wireframe", "3D floating glass sphere", "Abstract circuit spark"],
    banned_copy: ["Seamless", "All-in-one Platform", "Empower", "Supercharge", "Frictionless"],
    counter_anchor: {
      origin_insight: "Ground digital intelligence in tangible mechanical relays, analog print typesetting, or high-density editorial publishing.",
      pigment_palette: ["#2B2B2B (Graphite)", "#E0FF4F (Acid Lime)", "#F8F8F8 (Engineered Paper)"],
      tactile_textures: ["CRT phosphor scanlines", "Tactile toggle switches", "High-contrast ink trap letterforms"],
      recommended_typography: "Editorial newsprint serif with razor-sharp glyph terminals"
    }
  }
};

export function runAntiSamenessAudit(category, audience = "", brandName = "") {
  const normKey = category.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  const matchingKey = Object.keys(CATEGORY_DEFAULTS).find(k => normKey.includes(k) || k.includes(normKey)) || "matcha";
  const def = CATEGORY_DEFAULTS[matchingKey];

  const negativePrompt = [
    "generic category tropes",
    ...def.cliche_colors.map(c => c.split(" ")[0]),
    def.cliche_type,
    ...def.cliche_symbols,
    "predictable stock aesthetic",
    "washed-out flat pastel",
    "bland corporate logo mark glued to text"
  ].join(", ");

  return {
    category: category,
    matched_profile: matchingKey,
    brand_name: brandName || "Target Brand",
    target_audience: audience || "Design-conscious modern demographic",
    cliches_to_avoid: {
      colors: def.cliche_colors,
      typography: def.cliche_type,
      symbols: def.cliche_symbols,
      banned_words: def.banned_copy
    },
    recommended_counter_anchor: def.counter_anchor,
    negative_prompt_injection: negativePrompt,
    brand_architecture_rules: [
      "Rule 1: Primary Wordmark must be 100% standalone vector typography (Zero icons attached).",
      "Rule 2: The conceptual icon must be isolated as a secondary modular seal on a distinct layer (The Bonsai Rule).",
      "Rule 3: Pair heritage pigments with modern industrial materials (chrome, liquid metal, diffused shadow).",
      "Rule 4: Execute 1:1 scale physical wrapping before locking print packaging."
    ]
  };
}
