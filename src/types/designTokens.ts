import { z } from "zod";

export const USE_CASE_VALUES = ["general", "advertisement", "website", "showcase"] as const;
export const THEME_VALUES = ["minimal", "premium", "futuristic", "playful", "dark"] as const;
export const MATERIAL_PRESET_VALUES = [
  "matte_soft",
  "glass_frost",
  "glass_clear",
  "metal_brushed",
  "metal_chrome",
  "plastic_gloss"
] as const;
export const ANIMATION_VALUES = ["none", "rotation", "float", "bounce"] as const;
export const LIGHTING_PRESET_VALUES = [
  "studio_soft",
  "studio_dramatic",
  "ambient_bright",
  "neon_edge"
] as const;
export const BACKGROUND_PRESET_VALUES = [
  "light_clean",
  "dark_studio",
  "gradient_soft",
  "gradient_vivid"
] as const;
export const COMPOSITION_PRESET_VALUES = [
  "hero_centered",
  "floating_showcase",
  "product_closeup"
] as const;

export type UseCaseToken = typeof USE_CASE_VALUES[number];
export type ThemeToken = typeof THEME_VALUES[number];
export type MaterialPresetToken = typeof MATERIAL_PRESET_VALUES[number];
export type AnimationToken = typeof ANIMATION_VALUES[number];
export type LightingPresetToken = typeof LIGHTING_PRESET_VALUES[number];
export type BackgroundPresetToken = typeof BACKGROUND_PRESET_VALUES[number];
export type CompositionPresetToken = typeof COMPOSITION_PRESET_VALUES[number];

export const designTokensSchema = z.object({
  use_case: z.enum(USE_CASE_VALUES),
  theme: z.enum(THEME_VALUES),
  material_preset: z.enum(MATERIAL_PRESET_VALUES),
  animation: z.enum(ANIMATION_VALUES),
  lighting_preset: z.enum(LIGHTING_PRESET_VALUES),
  background_preset: z.enum(BACKGROUND_PRESET_VALUES),
  composition: z.enum(COMPOSITION_PRESET_VALUES)
});

export type DesignTokens = z.infer<typeof designTokensSchema>;

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  use_case: "general",
  theme: "minimal",
  material_preset: "matte_soft",
  animation: "none",
  lighting_preset: "studio_soft",
  background_preset: "light_clean",
  composition: "hero_centered"
};

function normalizeTokenValue(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function pickEnumValue<T extends readonly string[]>(value: unknown, values: T): T[number] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = normalizeTokenValue(value);

  return values.find((candidate) => candidate === normalizedValue);
}

function defaultThemeForUseCase(useCase: UseCaseToken): ThemeToken {
  switch (useCase) {
    case "advertisement":
    case "showcase":
      return "premium";
    case "website":
      return "minimal";
    default:
      return "minimal";
  }
}

function defaultMaterialForTheme(theme: ThemeToken): MaterialPresetToken {
  switch (theme) {
    case "premium":
    case "dark":
      return "metal_brushed";
    case "futuristic":
      return "metal_chrome";
    case "playful":
      return "plastic_gloss";
    case "minimal":
    default:
      return "matte_soft";
  }
}

function defaultLightingForTheme(theme: ThemeToken): LightingPresetToken {
  switch (theme) {
    case "premium":
    case "dark":
      return "studio_dramatic";
    case "futuristic":
      return "neon_edge";
    case "playful":
      return "ambient_bright";
    case "minimal":
    default:
      return "studio_soft";
  }
}

function defaultBackgroundForTheme(
  theme: ThemeToken,
  materialPreset: MaterialPresetToken
): BackgroundPresetToken {
  if (materialPreset === "glass_frost" || materialPreset === "glass_clear") {
    return "gradient_soft";
  }

  switch (theme) {
    case "premium":
    case "dark":
      return "dark_studio";
    case "futuristic":
    case "playful":
      return "gradient_vivid";
    case "minimal":
    default:
      return "light_clean";
  }
}

function defaultCompositionForUseCase(useCase: UseCaseToken): CompositionPresetToken {
  switch (useCase) {
    case "advertisement":
      return "product_closeup";
    case "showcase":
      return "floating_showcase";
    case "website":
    case "general":
    default:
      return "hero_centered";
  }
}

function asTokenObject(value: unknown): Partial<DesignTokens> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Partial<DesignTokens>;
}

export function normalizeDesignTokens(
  tokens: unknown,
  legacy?: {
    use_case?: unknown;
    style?: unknown;
    animation?: unknown;
  }
): DesignTokens {
  const tokenObject = asTokenObject(tokens);

  const useCase =
    pickEnumValue(tokenObject.use_case, USE_CASE_VALUES) ??
    pickEnumValue(legacy?.use_case, USE_CASE_VALUES) ??
    DEFAULT_DESIGN_TOKENS.use_case;

  const theme =
    pickEnumValue(tokenObject.theme, THEME_VALUES) ??
    pickEnumValue(legacy?.style, THEME_VALUES) ??
    defaultThemeForUseCase(useCase);

  const materialPreset =
    pickEnumValue(tokenObject.material_preset, MATERIAL_PRESET_VALUES) ??
    defaultMaterialForTheme(theme);

  const animation =
    pickEnumValue(tokenObject.animation, ANIMATION_VALUES) ??
    pickEnumValue(legacy?.animation, ANIMATION_VALUES) ??
    DEFAULT_DESIGN_TOKENS.animation;

  const lightingPreset =
    pickEnumValue(tokenObject.lighting_preset, LIGHTING_PRESET_VALUES) ??
    defaultLightingForTheme(theme);

  const backgroundPreset =
    pickEnumValue(tokenObject.background_preset, BACKGROUND_PRESET_VALUES) ??
    defaultBackgroundForTheme(theme, materialPreset);

  const composition =
    pickEnumValue(tokenObject.composition, COMPOSITION_PRESET_VALUES) ??
    defaultCompositionForUseCase(useCase);

  return {
    use_case: useCase,
    theme,
    material_preset: materialPreset,
    animation,
    lighting_preset: lightingPreset,
    background_preset: backgroundPreset,
    composition
  };
}
