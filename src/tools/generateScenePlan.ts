import { z } from "zod";
import { createScenePlan, MAX_SCENE_PLAN_OBJECTS } from "../services/scenePlanner.js";
import { DesignTokens, THEME_VALUES, ThemeToken, normalizeDesignTokens } from "../types/designTokens.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

const STYLE_SIGNAL_RULES: Record<ThemeToken, Array<{ keyword: string; weight: number }>> = {
  minimal: [
    { keyword: "minimal", weight: 4 },
    { keyword: "clean", weight: 1 },
    { keyword: "simple", weight: 1 },
    { keyword: "sleek", weight: 1 },
    { keyword: "modern", weight: 1 },
    { keyword: "editorial", weight: 1 },
    { keyword: "scandinavian", weight: 2 }
  ],
  premium: [
    { keyword: "premium", weight: 4 },
    { keyword: "luxury", weight: 3 },
    { keyword: "luxurious", weight: 3 },
    { keyword: "high-end", weight: 3 },
    { keyword: "high end", weight: 3 },
    { keyword: "elegant", weight: 2 },
    { keyword: "refined", weight: 2 },
    { keyword: "sophisticated", weight: 2 },
    { keyword: "cinematic", weight: 2 },
    { keyword: "polished", weight: 2 }
  ],
  futuristic: [
    { keyword: "futuristic", weight: 4 },
    { keyword: "sci-fi", weight: 3 },
    { keyword: "sci fi", weight: 3 },
    { keyword: "scifi", weight: 3 },
    { keyword: "cyber", weight: 3 },
    { keyword: "neon", weight: 2 },
    { keyword: "holographic", weight: 2 },
    { keyword: "tech", weight: 1 },
    { keyword: "fintech", weight: 2 }
  ],
  playful: [
    { keyword: "playful", weight: 4 },
    { keyword: "fun", weight: 2 },
    { keyword: "cute", weight: 2 },
    { keyword: "cartoon", weight: 2 },
    { keyword: "friendly", weight: 1 },
    { keyword: "cheerful", weight: 2 },
    { keyword: "vibrant", weight: 1 },
    { keyword: "colorful", weight: 1 }
  ],
  dark: [
    { keyword: "dark", weight: 4 },
    { keyword: "moody", weight: 2 },
    { keyword: "noir", weight: 3 },
    { keyword: "shadowy", weight: 2 },
    { keyword: "dramatic", weight: 2 }
  ]
};

const STYLE_TIEBREAK_PRIORITY: ThemeToken[] = ["premium", "futuristic", "dark", "minimal", "playful"];

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

function extractPromptDetail(refinedPrompt: string) {
  const prefix = "Preserve these request details: ";
  const marker = "., Create a ";

  if (!refinedPrompt.startsWith(prefix)) {
    return refinedPrompt;
  }

  const markerIndex = refinedPrompt.indexOf(marker);

  if (markerIndex === -1) {
    return refinedPrompt.slice(prefix.length).trim();
  }

  return refinedPrompt.slice(prefix.length, markerIndex).trim();
}

function analyzeStyleSignals(prompt: string) {
  const normalizedPrompt = normalizeText(extractPromptDetail(prompt));

  return THEME_VALUES.reduce(
    (result, theme) => {
      const matchedKeywords = STYLE_SIGNAL_RULES[theme]
        .filter((rule) => countKeywordMatches(normalizedPrompt, rule.keyword) > 0)
        .map((rule) => rule.keyword);
      const score = STYLE_SIGNAL_RULES[theme].reduce((total, rule) => {
        const matchCount = countKeywordMatches(normalizedPrompt, rule.keyword);

        return total + matchCount * rule.weight;
      }, 0);

      result[theme] = {
        score,
        matchedKeywords
      };

      return result;
    },
    {} as Record<ThemeToken, { score: number; matchedKeywords: string[] }>
  );
}

function pickResolvedStyle(designTokens: DesignTokens, prompt: string) {
  const styleSignals = analyzeStyleSignals(prompt);
  const strongestScore = Math.max(...THEME_VALUES.map((theme) => styleSignals[theme].score));
  const scoredThemes = THEME_VALUES.filter((theme) => styleSignals[theme].score > 0);

  if (strongestScore === 0) {
    return {
      style: designTokens.theme,
      styleSignals,
      scoredThemes
    };
  }

  const strongestThemes = THEME_VALUES.filter((theme) => styleSignals[theme].score === strongestScore);

  if (strongestThemes.length === 1) {
    return {
      style: strongestThemes[0],
      styleSignals,
      scoredThemes
    };
  }

  if (strongestThemes.includes(designTokens.theme) && designTokens.theme !== "minimal") {
    return {
      style: designTokens.theme,
      styleSignals,
      scoredThemes
    };
  }

  return {
    style: STYLE_TIEBREAK_PRIORITY.find((theme) => strongestThemes.includes(theme)) ?? designTokens.theme,
    styleSignals,
    scoredThemes
  };
}

function alignDesignTokensWithResolvedStyle(designTokens: DesignTokens, resolvedStyle: ThemeToken) {
  if (resolvedStyle === designTokens.theme) {
    return designTokens;
  }

  const originalDefaults = normalizeDesignTokens({
    use_case: designTokens.use_case,
    theme: designTokens.theme,
    animation: designTokens.animation,
    composition: designTokens.composition
  });
  const resolvedDefaults = normalizeDesignTokens({
    use_case: designTokens.use_case,
    theme: resolvedStyle,
    animation: designTokens.animation,
    composition: designTokens.composition
  });

  const materialPreset =
    designTokens.material_preset === originalDefaults.material_preset
      ? resolvedDefaults.material_preset
      : designTokens.material_preset;
  const lightingPreset =
    designTokens.lighting_preset === originalDefaults.lighting_preset
      ? resolvedDefaults.lighting_preset
      : designTokens.lighting_preset;
  const backgroundPreset =
    designTokens.background_preset === originalDefaults.background_preset
      ? normalizeDesignTokens({
          use_case: designTokens.use_case,
          theme: resolvedStyle,
          material_preset: materialPreset,
          animation: designTokens.animation,
          lighting_preset: lightingPreset,
          composition: designTokens.composition
        }).background_preset
      : designTokens.background_preset;

  return {
    ...designTokens,
    theme: resolvedStyle,
    material_preset: materialPreset,
    lighting_preset: lightingPreset,
    background_preset: backgroundPreset
  };
}

export const generateScenePlanTool = {
  name: "generate_scene_plan",
  description: `
Create a structured 3D scene plan from the refined prompt.

Your job:
- Identify the main object(s) in the scene
- Extract style, environment, and animation intent
- Reuse upstream design tokens and object hints when provided

Rules:
- Include 1 to 4 objects MAXIMUM
- Objects must be meaningful nouns (e.g., "shoe", "bottle", "phone")
- Do NOT include adjectives or effects as objects
  (e.g., "glowing", "stylish", "background" are NOT objects)
- Do NOT repeat objects
- Choose ONE primary object (first in list)
- Prefer structured style tokens when provided, but correct obvious approximations when the prompt contains stronger style evidence

id="hero_rule"
Rules:
- First object is the main subject
- Additional objects (if any) must support the main object
- Avoid unrelated objects in the same scene

Style rules:
- Style should describe visual feel (e.g., premium, minimal, futuristic)
- Style must be ONLY ONE keyword
- Allowed styles:
  - premium
  - minimal
  - futuristic
  - playful
  - dark
- Do NOT return multiple words (e.g., "premium dark moody" is invalid)

Object rules:
- Only include PHYSICAL objects that exist as visible 3D items
- Do NOT include:
  - lighting elements (e.g., "light", "spotlight", "glow")
  - effects (e.g., "particles", "smoke", "sparkles")
  - environment words (e.g., "background", "atmosphere")
- Do NOT include environment elements
- Objects must be real-world items (e.g., "shoe", "bottle", "phone")
Examples of VALID objects:
- "shoe", "bottle", "phone", "chair"

Examples of INVALID objects:
- "light", "particles", "glow", "shadow"

- Animation should be simple (rotation, float, none)
Examples:

User: "3D rotating sneaker ad with dark premium feel"
Output:
{
  "objects": ["sneaker"],
  "style": "premium",
  "animation": "rotation",
  "use_case": "advertisement"
}

User: "modern website hero section with floating phone"
Output:
{
  "objects": ["phone"],
  "style": "minimal",
  "animation": "float",
  "use_case": "website"
}

Return structured scene plan data plus warnings and constraints.
`,

  parameters: z.object({
    refined_prompt: z.string(),
    context: z.any()
  }),

  async execute({ refined_prompt, context }: any) {
    const normalizedPrompt = unwrapToolPayload<string>(refined_prompt, "refined_prompt");
    const normalizedContext = unwrapToolPayload<Record<string, unknown>>(context, "context");
    const designTokens = normalizeDesignTokens(normalizedContext?.design_tokens, {
      use_case: normalizedContext?.use_case,
      style: normalizedContext?.style,
      animation: normalizedContext?.animation
    });
    const scenePlan = createScenePlan(normalizedPrompt, normalizedContext);
    let warnings: string[] = scenePlan.warnings ? [...scenePlan.warnings] : [];
    const { style: resolvedStyle, styleSignals, scoredThemes } = pickResolvedStyle(designTokens, normalizedPrompt);

    // enforce rules
    const requestedObjects = Array.isArray(scenePlan.objects)
      ? [...new Set(scenePlan.objects)]
      : ["product"];
    const objects = requestedObjects.slice(0, MAX_SCENE_PLAN_OBJECTS);

    if (requestedObjects.length > MAX_SCENE_PLAN_OBJECTS) {
      const droppedObjects = requestedObjects.slice(MAX_SCENE_PLAN_OBJECTS);

      warnings.push(
        `Dropped ${droppedObjects.length} object${droppedObjects.length === 1 ? "" : "s"} due to the planner limit of ${MAX_SCENE_PLAN_OBJECTS}: ${droppedObjects.join(", ")}.`
      );
    }

    if (requestedObjects.length === 0 || requestedObjects[0] === "product") {
      warnings.push("No physical objects were confidently extracted, so the planner used a generic product placeholder.");
    }

    if (resolvedStyle !== designTokens.theme) {
      const matchingKeywords = styleSignals[resolvedStyle].matchedKeywords;

      warnings.push(
        `Style was approximated from "${designTokens.theme}" to "${resolvedStyle}" based on prompt cues${matchingKeywords.length > 0 ? `: ${matchingKeywords.join(", ")}` : ""}.`
      );
    }

    if (scoredThemes.length > 1) {
      warnings.push(
        `Prompt mixes multiple style cues (${scoredThemes.join(", ")}). The "style" field supports only one token, so "${resolvedStyle}" was selected and the rest remain implicit in the prompt and design tokens.`
      );
    }

    const adjustedDesignTokens = alignDesignTokensWithResolvedStyle(designTokens, resolvedStyle);

    return createToolResult({
      scene_plan: {
        ...scenePlan,
        objects,
        style: resolvedStyle,
        design_tokens: adjustedDesignTokens
      },
      warnings,
      constraints: {
        max_objects: MAX_SCENE_PLAN_OBJECTS,
        allowed_styles: [...THEME_VALUES],
        style_field_is_single_token: true
      }
    });
  }
};
