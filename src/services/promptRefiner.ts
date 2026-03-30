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
} from "../lib/designTokens.js";

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
    token: "rotate",
    keywords: ["rotating", "rotation", "rotate", "spinning", "spin", "turntable"]
  },
  {
    token: "pulse",
    keywords: ["pulse", "pulsing", "breathing", "heartbeat"]
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
  "credit card": "credit card",
  "credit cards": "credit card",
  "debit card": "credit card",
  "payment card": "credit card",
  "glowing orb": "orb",
  "glow orb": "orb",
  orbs: "orb",
  orb: "orb",
  "data ring": "ring",
  "halo ring": "ring",
  rings: "ring",
  ring: "ring",
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
  "ui",
  "interface",
  "screen",
  "payment",
  "success",
  "checkout",
  "dashboard",
  "startup",
  "company",
  "fintech",
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

const HINT_DENYLIST = new Set([
  ...NON_OBJECT_WORDS,
  "should",
  "would",
  "could",
  "will",
  "can",
  "must",
  "shall",
  "may",
  "might",
  "use",
  "need",
  "want",
  "do",
  "go",
  "get",
  "give",
  "take",
  "see",
  "move",
  "respond",
  "hover",
  "display",
  "create",
  "build",
  "over",
  "under",
  "from",
  "into",
  "onto",
  "also",
  "when",
  "where",
  "without",
  "between",
  "around",
  "through",
  "across",
  "along",
  "or",
  "but",
  "so",
  "if",
  "as",
  "at",
  "rich",
  "deep",
  "high",
  "low",
  "smooth",
  "slow",
  "fast",
  "gentle",
  "subtle",
  "dramatic",
  "premium",
  "luxury",
  "glossy",
  "warm",
  "cool",
  "bright",
  "dark",
  "autonomous",
  "idle",
  "interactive",
  "responsive",
  "animated",
  "dynamic",
  "always",
  "never",
  "very",
  "quite",
  "well",
  "just",
  "it",
  "its",
  "they",
  "their",
  "this",
  "that",
  "these",
  "those",
  "them",
  "cursor",
  "movement",
  "motion",
  "effect",
  "look",
  "feel",
  "mode"
]);

const KNOWN_OBJECT_VOCABULARY = new Set([
  ...Object.values(OBJECT_ALIASES),
  "handbag",
  "purse",
  "tote",
  "particle",
  "particles",
  "confetti",
  "sparkle",
  "sparkles",
  "floor",
  "ground",
  "surface",
  "reflection",
  "mirror",
  "backdrop",
  "environment"
].map((entry) => normalizeText(entry)));

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

interface AliasMatch {
  alias: string;
  canonical: string;
  start: number;
  length: number;
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

function findAliasMatches(normalizedPrompt: string) {
  const matches: AliasMatch[] = [];
  const aliasEntries = Object.entries(OBJECT_ALIASES).sort((left, right) => right[0].length - left[0].length);
  const words = normalizedPrompt.split(" ");
  const consumedIndexes = new Set<number>();

  for (const [alias, canonical] of aliasEntries) {
    const aliasWords = normalizeText(alias).split(" ").filter(Boolean);

    if (aliasWords.length === 0 || aliasWords.length > words.length) {
      continue;
    }

    for (let index = 0; index <= words.length - aliasWords.length; index += 1) {
      const candidate = words.slice(index, index + aliasWords.length);
      const isMatch = aliasWords.every((aliasWord, aliasIndex) => candidate[aliasIndex] === aliasWord);

      if (!isMatch) {
        continue;
      }

      const overlapsExistingMatch = candidate.some((_, candidateIndex) => consumedIndexes.has(index + candidateIndex));

      if (overlapsExistingMatch) {
        continue;
      }

      matches.push({
        alias,
        canonical,
        start: index,
        length: aliasWords.length
      });

      for (let aliasIndex = 0; aliasIndex < aliasWords.length; aliasIndex += 1) {
        consumedIndexes.add(index + aliasIndex);
      }
    }
  }

  matches.sort((left, right) => left.start - right.start);

  return { matches, words, consumedIndexes };
}

function createConfirmedObjectLabel(match: AliasMatch, normalizedPrompt: string) {
  const normalizedAlias = normalizeText(match.alias);

  if (match.canonical === "phone") {
    if (countKeywordMatches(normalizedPrompt, "payment success ui") > 0) {
      return `${normalizedAlias} with payment success ui`;
    }

    if (countKeywordMatches(normalizedPrompt, "payment ui") > 0) {
      return `${normalizedAlias} with payment ui`;
    }
  }

  return normalizedAlias;
}

export function extractObjectHints(userPrompt: string) {
  const normalizedPrompt = normalizeText(userPrompt);
  const rawHints: string[] = [];
  const { matches, words, consumedIndexes } = findAliasMatches(normalizedPrompt);

  for (const match of matches) {
    rawHints.push(match.canonical);
  }

  for (const [index, word] of words.entries()) {
    if (consumedIndexes.has(index)) {
      continue;
    }

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

    rawHints.push(canonicalWord);
  }

  return filterObjectHints(rawHints).accepted;
}

export function extractConfirmedObjects(userPrompt: string) {
  const normalizedPrompt = normalizeText(userPrompt);
  const { matches } = findAliasMatches(normalizedPrompt);
  const confirmedObjects = matches.map((match) => createConfirmedObjectLabel(match, normalizedPrompt));

  return uniqueWords(confirmedObjects);
}

function isLikelyObjectHint(value: string) {
  if (!value || value.length < 3 || /^\d+$/.test(value)) {
    return false;
  }

  if (HINT_DENYLIST.has(value) || RESERVED_WORDS.has(value)) {
    return false;
  }

  if (/(ing|ed|ly|tion|ness)$/.test(value)) {
    return false;
  }

  return KNOWN_OBJECT_VOCABULARY.has(value) || /^[a-z0-9-]+$/.test(value);
}

function filterObjectHints(rawHints: string[]) {
  const accepted: string[] = [];
  const discarded: string[] = [];

  for (const hint of rawHints) {
    const normalizedHint = normalizeText(hint);

    if (!normalizedHint) {
      continue;
    }

    if (isLikelyObjectHint(normalizedHint)) {
      accepted.push(normalizedHint);
    } else {
      discarded.push(normalizedHint);
    }
  }

  return {
    accepted: uniqueWords(accepted),
    discarded: uniqueWords(discarded)
  };
}

export function extractDiscardedHints(userPrompt: string) {
  const normalizedPrompt = normalizeText(userPrompt);
  const rawHints: string[] = [];
  const { matches, words, consumedIndexes } = findAliasMatches(normalizedPrompt);

  for (const match of matches) {
    rawHints.push(match.canonical);
  }

  for (const [index, word] of words.entries()) {
    if (consumedIndexes.has(index)) {
      continue;
    }

    if (!word || word.length < 3 || /^\d+$/.test(word)) {
      continue;
    }

    rawHints.push(OBJECT_ALIASES[word] ?? word);
  }

  return filterObjectHints(rawHints).discarded;
}

function normalizePromptDetail(userPrompt: string) {
  return userPrompt.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
}

function buildRefinedPrompt(userPrompt: string, designTokens: DesignTokens, confirmedObjects: string[]) {
  const subject = confirmedObjects.length > 0 ? confirmedObjects.join(", ") : "the main product";
  const animationClause =
    designTokens.animation === "none" ? "without motion" : `with ${formatToken(designTokens.animation)} motion`;
  const promptDetail = normalizePromptDetail(userPrompt);

  return [
    `Preserve these request details: ${promptDetail}.`,
    `Create a ${designTokens.theme} ${titleForUseCase(designTokens.use_case)} 3D scene`,
    `using ${formatToken(designTokens.material_preset)} materials`,
    `${formatToken(designTokens.lighting_preset)} lighting`,
    `a ${formatToken(designTokens.background_preset)} background`,
    `and a ${formatToken(designTokens.composition)} layout`,
    `featuring ${subject}`,
    animationClause
  ].join(", ");
}

// ---------------------------------------------------------------------------
// Color vocabulary extraction
// ---------------------------------------------------------------------------

export interface ColorHint {
  name: string;
  hex: string;
  role: "background" | "accent" | "general";
}

const COLOR_VOCABULARY: Record<string, string> = {
  // Blues / Navy
  "deep navy": "#0a1628",
  "dark navy": "#0a1628",
  navy: "#0a1628",
  "midnight blue": "#0f1b3d",
  "dark blue": "#0f1b3d",
  cobalt: "#1a3a6b",
  // Cyans / Teals
  "bright cyan": "#00e5ff",
  cyan: "#00e5ff",
  teal: "#008080",
  aqua: "#00ffff",
  turquoise: "#40e0d0",
  // Greens
  "bright emerald": "#34d399",
  "dark emerald": "#065f46",
  emerald: "#34d399",
  "dark green": "#166534",
  green: "#22c55e",
  lime: "#84cc16",
  mint: "#a7f3d0",
  // Purples
  "deep purple": "#4c1d95",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  lavender: "#c4b5fd",
  magenta: "#d946ef",
  // Reds / Pinks
  "dark red": "#991b1b",
  red: "#ef4444",
  crimson: "#dc2626",
  coral: "#f97316",
  pink: "#ec4899",
  rose: "#f43f5e",
  // Oranges / Yellows
  orange: "#f97316",
  amber: "#f59e0b",
  gold: "#eab308",
  yellow: "#facc15",
  // Neutrals
  "jet black": "#0a0a0a",
  black: "#000000",
  charcoal: "#1f2937",
  slate: "#334155",
  gray: "#6b7280",
  grey: "#6b7280",
  silver: "#c0c0c0",
  "off-white": "#f5f5f0",
  white: "#ffffff",
  ivory: "#fffff0",
  cream: "#fef3c7"
};

const COLOR_ROLE_KEYWORDS: Record<string, "background" | "accent"> = {
  background: "background",
  backdrop: "background",
  "bg color": "background",
  accent: "accent",
  accents: "accent",
  highlight: "accent",
  highlights: "accent",
  glow: "accent",
  pop: "accent"
};

export function extractColorHints(userPrompt: string): ColorHint[] {
  const normalizedPrompt = normalizeText(userPrompt);
  const hints: ColorHint[] = [];
  const usedColors = new Set<string>();

  // Sort by length descending so "deep navy" matches before "navy"
  const colorEntries = Object.entries(COLOR_VOCABULARY).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [colorName, hex] of colorEntries) {
    const pattern = new RegExp(`\\b${escapeRegExp(colorName)}\\b`, "g");
    const matches = normalizedPrompt.match(pattern);

    if (!matches || matches.length === 0) {
      continue;
    }

    if (usedColors.has(hex)) {
      continue;
    }

    usedColors.add(hex);

    // Determine role by checking surrounding context
    let role: ColorHint["role"] = "general";

    for (const [roleKeyword, roleValue] of Object.entries(COLOR_ROLE_KEYWORDS)) {
      const rolePattern = new RegExp(
        `\\b${escapeRegExp(roleKeyword)}\\b.{0,20}\\b${escapeRegExp(colorName)}\\b|\\b${escapeRegExp(colorName)}\\b.{0,20}\\b${escapeRegExp(roleKeyword)}\\b`
      );

      if (rolePattern.test(normalizedPrompt)) {
        role = roleValue;
        break;
      }
    }

    hints.push({ name: colorName, hex, role });
  }

  return hints;
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
  const confirmedObjects = extractConfirmedObjects(userPrompt);
  const discardedHints = extractDiscardedHints(userPrompt);
  const colorHints = extractColorHints(userPrompt);

  return {
    refined_prompt: buildRefinedPrompt(userPrompt, designTokens, confirmedObjects),
    context: {
      use_case: designTokens.use_case,
      style: designTokens.theme,
      animation: designTokens.animation,
      design_tokens: designTokens,
      object_hints: objectHints,
      confirmed_objects: confirmedObjects,
      discarded_hints: discardedHints,
      color_hints: colorHints
    }
  };
}
