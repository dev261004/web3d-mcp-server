import {
  AnimationToken,
  ANIMATION_VALUES,
  BACKGROUND_PRESET_VALUES,
  BackgroundPresetToken,
  COMPOSITION_PRESET_VALUES,
  CompositionPresetToken,
  DesignTokens,
  LIGHTING_PRESET_VALUES,
  LightingPresetToken,
  MATERIAL_PRESET_VALUES,
  MaterialPresetToken,
  normalizeDesignTokens,
  THEME_VALUES,
  ThemeToken,
  USE_CASE_VALUES,
  UseCaseToken
} from "../types/designTokens.js";

type TokenCategory =
  | "use_case"
  | "theme"
  | "material_preset"
  | "animation"
  | "lighting_preset"
  | "background_preset"
  | "composition";

type MatchMap = Record<TokenCategory, string[]>;

interface MatchRule<T extends string> {
  token: T;
  keywords: string[];
}

const USE_CASE_RULES: MatchRule<UseCaseToken>[] = [
  {
    token: "advertisement",
    keywords: ["advertisement", "product ad", "commercial", "campaign", "promo", "promotion", "launch", "ad"]
  },
  {
    token: "website",
    keywords: ["hero section", "landing page", "homepage", "website", "web page", "site"]
  },
  {
    token: "showcase",
    keywords: ["showcase", "portfolio", "gallery", "display", "exhibit", "presentation"]
  }
];

const THEME_RULES: MatchRule<ThemeToken>[] = [
  {
    token: "minimal",
    keywords: ["minimal", "clean", "simple", "sleek", "modern", "editorial", "scandinavian"]
  },
  {
    token: "premium",
    keywords: ["premium", "luxury", "luxurious", "high-end", "high end", "elegant", "refined", "sophisticated"]
  },
  {
    token: "futuristic",
    keywords: ["futuristic", "sci-fi", "sci fi", "scifi", "cyber", "neon", "holographic", "tech"]
  },
  {
    token: "playful",
    keywords: ["playful", "fun", "cute", "cartoon", "friendly", "cheerful", "vibrant", "colorful"]
  },
  {
    token: "dark",
    keywords: ["dark", "moody", "noir", "shadowy", "dramatic"]
  }
];

const MATERIAL_RULES: MatchRule<MaterialPresetToken>[] = [
  {
    token: "glass_frost",
    keywords: ["glassmorphism", "frosted glass", "frosted", "translucent", "icy", "ice", "glass"]
  },
  {
    token: "glass_clear",
    keywords: ["clear glass", "crystal", "transparent glass"]
  },
  {
    token: "metal_chrome",
    keywords: ["chrome", "mirror", "mirrored", "polished metal"]
  },
  {
    token: "metal_brushed",
    keywords: ["brushed metal", "metallic", "aluminum", "aluminium", "steel", "metal"]
  },
  {
    token: "plastic_gloss",
    keywords: ["plastic", "glossy", "gloss", "shiny", "toy-like"]
  },
  {
    token: "matte_soft",
    keywords: ["matte", "soft touch", "soft-touch", "clay", "paper"]
  }
];

const ANIMATION_RULES: MatchRule<AnimationToken>[] = [
  {
    token: "none",
    keywords: ["no animation", "without animation", "non-animated", "non animated", "static", "still"]
  },
  {
    token: "float",
    keywords: ["floating", "float", "hover", "hovering", "levitating", "suspended"]
  },
  {
    token: "rotation",
    keywords: ["rotating", "rotation", "rotate", "spinning", "spin", "turntable"]
  },
  {
    token: "bounce",
    keywords: ["bounce", "bouncy", "spring", "springy", "bob"]
  }
];

const LIGHTING_RULES: MatchRule<LightingPresetToken>[] = [
  {
    token: "studio_dramatic",
    keywords: ["dramatic lighting", "spotlight", "spot light", "cinematic", "high contrast"]
  },
  {
    token: "studio_soft",
    keywords: ["soft lighting", "soft light", "diffused", "studio", "clean light"]
  },
  {
    token: "ambient_bright",
    keywords: ["bright", "airy", "sunlit", "daylight", "ambient"]
  },
  {
    token: "neon_edge",
    keywords: ["neon", "glow", "glowing edge", "rim light", "cyber"]
  }
];

const BACKGROUND_RULES: MatchRule<BackgroundPresetToken>[] = [
  {
    token: "dark_studio",
    keywords: ["dark background", "black background", "dark studio", "moody background"]
  },
  {
    token: "gradient_soft",
    keywords: ["soft gradient", "gradient", "pastel background", "soft background"]
  },
  {
    token: "gradient_vivid",
    keywords: ["vibrant gradient", "colorful background", "neon background"]
  },
  {
    token: "light_clean",
    keywords: ["white background", "light background", "clean background", "transparent background", "isolated"]
  }
];

const COMPOSITION_RULES: MatchRule<CompositionPresetToken>[] = [
  {
    token: "floating_showcase",
    keywords: ["floating", "hovering", "levitating", "suspended"]
  },
  {
    token: "product_closeup",
    keywords: ["close-up", "close up", "macro", "detail shot", "packshot"]
  },
  {
    token: "hero_centered",
    keywords: ["hero section", "hero", "centerpiece", "centered", "main visual"]
  }
];

const OBJECT_ALIASES: Record<string, string> = {
  "perfume bottle": "perfume",
  perfumes: "perfume",
  perfume: "perfume",
  smartphone: "phone",
  smartphones: "phone",
  phones: "phone",
  iphone: "phone",
  mobile: "phone",
  sneaker: "shoe",
  sneakers: "shoe",
  shoes: "shoe",
  bottle: "bottle",
  bottles: "bottle",
  chair: "chair",
  chairs: "chair",
  watch: "watch",
  watches: "watch",
  laptop: "laptop",
  laptops: "laptop",
  headphone: "headphone",
  headphones: "headphone",
  speaker: "speaker",
  speakers: "speaker",
  camera: "camera",
  cameras: "camera",
  can: "can",
  cans: "can",
  bag: "bag",
  bags: "bag",
  lamp: "lamp",
  lamps: "lamp"
};

const NON_OBJECT_WORDS = new Set([
  "create",
  "make",
  "build",
  "generate",
  "design",
  "render",
  "show",
  "scene",
  "visual",
  "layout",
  "background",
  "lighting",
  "animation",
  "material",
  "materials",
  "style",
  "theme",
  "composition",
  "website",
  "page",
  "site",
  "section",
  "hero",
  "landing",
  "showcase",
  "advertisement",
  "ad",
  "promo",
  "campaign",
  "product",
  "brand",
  "3d",
  "for",
  "with",
  "and",
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to"
]);

const RESERVED_WORDS = new Set(
  [
    ...Object.keys(OBJECT_ALIASES),
    ...NON_OBJECT_WORDS,
    ...USE_CASE_VALUES,
    ...THEME_VALUES,
    ...MATERIAL_PRESET_VALUES,
    ...ANIMATION_VALUES,
    ...LIGHTING_PRESET_VALUES,
    ...BACKGROUND_PRESET_VALUES,
    ...COMPOSITION_PRESET_VALUES,
    ...USE_CASE_RULES.flatMap((rule) => rule.keywords),
    ...THEME_RULES.flatMap((rule) => rule.keywords),
    ...MATERIAL_RULES.flatMap((rule) => rule.keywords),
    ...ANIMATION_RULES.flatMap((rule) => rule.keywords),
    ...LIGHTING_RULES.flatMap((rule) => rule.keywords),
    ...BACKGROUND_RULES.flatMap((rule) => rule.keywords),
    ...COMPOSITION_RULES.flatMap((rule) => rule.keywords)
  ].map((entry) => normalizeText(entry))
);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countKeywordMatches(text: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return 0;
  }

  const pattern = normalizedKeyword
    .split(" ")
    .map((part) => escapeRegExp(part))
    .join("\\s+");
  const regex = new RegExp(`\\b${pattern}\\b`, "g");

  return text.match(regex)?.length ?? 0;
}

function selectToken<T extends string>(text: string, rules: MatchRule<T>[]) {
  let bestToken: T | undefined;
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const rule of rules) {
    const matchedKeywords = rule.keywords.filter((keyword) => countKeywordMatches(text, keyword) > 0);
    const score = matchedKeywords.reduce((total, keyword) => {
      const matchCount = countKeywordMatches(text, keyword);
      const keywordWeight = keyword.includes(" ") ? 2 : 1;

      return total + matchCount * keywordWeight;
    }, 0);

    if (score > bestScore) {
      bestToken = rule.token;
      bestScore = score;
      bestMatches = matchedKeywords;
    }
  }

  return {
    token: bestToken,
    matchedKeywords: bestMatches
  };
}

function uniqueWords(values: string[]) {
  return [...new Set(values)];
}

function titleForUseCase(useCase: UseCaseToken) {
  switch (useCase) {
    case "advertisement":
      return "advertisement";
    case "website":
      return "website hero";
    case "showcase":
      return "showcase";
    default:
      return "product";
  }
}

function formatToken(value: string) {
  return value.replace(/_/g, " ");
}

export function extractObjectHints(userPrompt: string) {
  const normalizedPrompt = normalizeText(userPrompt);
  const objects: string[] = [];

  const aliasEntries = Object.entries(OBJECT_ALIASES).sort((left, right) => right[0].length - left[0].length);

  for (const [alias, canonical] of aliasEntries) {
    if (countKeywordMatches(normalizedPrompt, alias) > 0) {
      objects.push(canonical);
    }
  }

  const words = normalizedPrompt.split(" ");

  for (const word of words) {
    if (!word || word.length < 3 || /^\d+$/.test(word)) {
      continue;
    }

    const canonicalWord = OBJECT_ALIASES[word] ?? word;

    if (RESERVED_WORDS.has(canonicalWord) || NON_OBJECT_WORDS.has(canonicalWord)) {
      continue;
    }

    if (canonicalWord.endsWith("ing")) {
      continue;
    }

    objects.push(canonicalWord);
  }

  return uniqueWords(objects).slice(0, 3);
}

function buildRefinedPrompt(designTokens: DesignTokens, objectHints: string[]) {
  const subject = objectHints.length > 0 ? objectHints.join(", ") : "the main product";
  const animationClause =
    designTokens.animation === "none" ? "without motion" : `with ${formatToken(designTokens.animation)} motion`;

  return [
    `Create a ${designTokens.theme} ${titleForUseCase(designTokens.use_case)} 3D scene`,
    `using ${formatToken(designTokens.material_preset)} materials`,
    `${formatToken(designTokens.lighting_preset)} lighting`,
    `a ${formatToken(designTokens.background_preset)} background`,
    `and a ${formatToken(designTokens.composition)} layout`,
    `featuring ${subject}`,
    animationClause
  ].join(", ");
}

export function refinePrompt(userPrompt: string) {
  const normalizedPrompt = normalizeText(userPrompt);

  const useCaseMatch = selectToken(normalizedPrompt, USE_CASE_RULES);
  const themeMatch = selectToken(normalizedPrompt, THEME_RULES);
  const materialMatch = selectToken(normalizedPrompt, MATERIAL_RULES);
  const animationMatch = selectToken(normalizedPrompt, ANIMATION_RULES);
  const lightingMatch = selectToken(normalizedPrompt, LIGHTING_RULES);
  const backgroundMatch = selectToken(normalizedPrompt, BACKGROUND_RULES);
  const compositionMatch = selectToken(normalizedPrompt, COMPOSITION_RULES);

  const designTokens = normalizeDesignTokens({
    use_case: useCaseMatch.token,
    theme: themeMatch.token,
    material_preset: materialMatch.token,
    animation: animationMatch.token,
    lighting_preset: lightingMatch.token,
    background_preset: backgroundMatch.token,
    composition: compositionMatch.token
  });

  const objectHints = extractObjectHints(userPrompt);

  const matchedKeywords: MatchMap = {
    use_case: useCaseMatch.matchedKeywords,
    theme: themeMatch.matchedKeywords,
    material_preset: materialMatch.matchedKeywords,
    animation: animationMatch.matchedKeywords,
    lighting_preset: lightingMatch.matchedKeywords,
    background_preset: backgroundMatch.matchedKeywords,
    composition: compositionMatch.matchedKeywords
  };

  return {
    refined_prompt: buildRefinedPrompt(designTokens, objectHints),
    context: {
      use_case: designTokens.use_case,
      style: designTokens.theme,
      animation: designTokens.animation,
      design_tokens: designTokens,
      object_hints: objectHints,
      matched_keywords: matchedKeywords
    }
  };
}
