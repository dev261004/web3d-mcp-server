import {
  normalizeDesignTokens,
  type AnimationToken,
  type LightingPresetToken,
  type MaterialPresetToken,
  type ThemeToken
} from "../lib/designTokens.js";
import { buildAnimations } from "./animationEngine.js";
import { getMaterial } from "./materialService.js";
import type { Animation, Light, SceneData, SceneObject, Vector3 } from "../types/scene.types.js";

function getSceneTheme(scene: any): ThemeToken {
  const tokenTheme = scene?.metadata?.design_tokens?.theme;

  if (tokenTheme === "premium" || tokenTheme === "minimal" || tokenTheme === "futuristic" || tokenTheme === "playful" || tokenTheme === "dark") {
    return tokenTheme;
  }

  if (scene?.metadata?.style === "dark") {
    return "dark";
  }

  return "minimal";
}

function getSceneLightingPreset(scene: any): LightingPresetToken {
  const lightingPreset = scene?.metadata?.design_tokens?.lighting_preset;

  if (
    lightingPreset === "studio_soft" ||
    lightingPreset === "studio_dramatic" ||
    lightingPreset === "ambient_bright" ||
    lightingPreset === "neon_edge"
  ) {
    return lightingPreset;
  }

  return scene?.metadata?.style === "dark" ? "studio_dramatic" : "studio_soft";
}

type EditSummary = {
  applied: string[];
  skipped: string[];
  warnings: string[];
};

type EditSceneResult = {
  updatedScene: SceneData;
  editSummary: EditSummary;
};

type EditableScene = {
  metadata: SceneData["metadata"];
  environment: SceneData["environment"];
  objects: SceneObject[];
  animations?: Animation[];
  lighting?: Light[];
  [key: string]: unknown;
};

type AnimationMode = "add" | "replace";

type AnimationIntent = {
  type: Animation["type"] | "none";
  mode: AnimationMode;
};

type TargetMatch = {
  object?: SceneObject;
  matched: boolean;
  warning?: string;
};

type MaterialIntent = {
  label: "metal" | "glass" | "clay" | "neon";
  materialPreset: MaterialPresetToken;
  materialStyle: string;
  theme?: ThemeToken;
  lightingPreset?: LightingPresetToken;
};

const MATERIAL_INTENTS: Array<MaterialIntent & { pattern: RegExp }> = [
  {
    label: "metal",
    pattern: /\bmetal(?:lic)?\b/gi,
    materialPreset: "metal_chrome",
    materialStyle: "chrome"
  },
  {
    label: "glass",
    pattern: /\bglass\b/gi,
    materialPreset: "glass_frost",
    materialStyle: "glassmorphism"
  },
  {
    label: "clay",
    pattern: /\bclay\b/gi,
    materialPreset: "matte_soft",
    materialStyle: "clay"
  },
  {
    label: "neon",
    pattern: /\bneon\b/gi,
    materialPreset: "plastic_gloss",
    materialStyle: "neon",
    theme: "futuristic",
    lightingPreset: "neon_edge"
  }
];

const ANIMATION_PATTERNS: Array<{ type: Animation["type"]; pattern: RegExp }> = [
  { type: "rotate", pattern: /\b(?:rotate|rotation)\b/gi },
  { type: "float", pattern: /\bfloat\b/gi },
  { type: "pulse", pattern: /\bpulse\b/gi },
  { type: "bounce", pattern: /\bbounce\b/gi }
];

const MOVEMENT_PATTERNS = {
  up: /\bup\b/gi,
  down: /\bdown\b/gi,
  left: /\bleft\b/gi,
  right: /\bright\b/gi
} as const;

const MOVEMENT_VERB_PATTERNS = [/\bmove\b/i, /\bshift\b/i, /\bslide\b/i, /\bnudge\b/i, /\bpush\b/i];

function pushUnique(list: string[], message: string) {
  if (!list.includes(message)) {
    list.push(message);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLastMatchIndex(pattern: RegExp, value: string) {
  const regex = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let lastIndex = -1;

  for (const match of value.matchAll(regex)) {
    if (typeof match.index === "number") {
      lastIndex = match.index;
    }
  }

  return lastIndex;
}

function hasPattern(pattern: RegExp, value: string) {
  return new RegExp(pattern.source, pattern.flags.replace(/g/g, "")).test(value);
}

function hasMovementVerb(prompt: string) {
  return MOVEMENT_VERB_PATTERNS.some((pattern) => pattern.test(prompt));
}

function isHexColor(value: string) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function toHexPair(value: string) {
  return value.length === 1 ? `${value}${value}` : value;
}

function hexToRgb(value: string) {
  const normalized = value.slice(1);
  const hex = normalized.length === 3
    ? `${toHexPair(normalized[0])}${toHexPair(normalized[1])}${toHexPair(normalized[2])}`
    : normalized;

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(base: string, target: string, amount: number) {
  const left = hexToRgb(base);
  const right = hexToRgb(target);
  const ratio = clamp(amount, 0, 1);

  return rgbToHex(
    left.r + (right.r - left.r) * ratio,
    left.g + (right.g - left.g) * ratio,
    left.b + (right.b - left.b) * ratio
  );
}

function getObjectLabel(object: SceneObject | undefined, index: number) {
  if (!object) {
    return `object ${index + 1}`;
  }

  return object.name?.trim() || `object ${index + 1}`;
}

function getObjectIndexById(objects: SceneObject[], target: SceneObject) {
  return objects.findIndex((object) => object.id === target.id);
}

function getOrdinalTargetIndex(prompt: string, objectCount: number) {
  const ordinalPatterns: Array<{ pattern: RegExp; index: number | "last" }> = [
    { pattern: /\bfirst\b/i, index: 0 },
    { pattern: /\bsecond\b/i, index: 1 },
    { pattern: /\bthird\b/i, index: 2 },
    { pattern: /\bfourth\b/i, index: 3 },
    { pattern: /\bfifth\b/i, index: 4 },
    { pattern: /\blast\b/i, index: "last" }
  ];

  for (const { pattern, index } of ordinalPatterns) {
    if (!pattern.test(prompt)) {
      continue;
    }

    if (index === "last") {
      return objectCount > 0 ? objectCount - 1 : null;
    }

    return index < objectCount ? index : null;
  }

  const numericPatterns: Array<{ pattern: RegExp; offset: number }> = [
    { pattern: /\b1st\b/i, offset: 1 },
    { pattern: /\b2nd\b/i, offset: 2 },
    { pattern: /\b3rd\b/i, offset: 3 },
    { pattern: /\b4th\b/i, offset: 4 },
    { pattern: /\b5th\b/i, offset: 5 }
  ];

  for (const { pattern, offset } of numericPatterns) {
    if (pattern.test(prompt)) {
      return offset - 1 < objectCount ? offset - 1 : null;
    }
  }

  const directObjectNumber = prompt.match(/\bobject\s+(\d+)\b/i);

  if (directObjectNumber) {
    const index = Number.parseInt(directObjectNumber[1], 10) - 1;
    return index >= 0 && index < objectCount ? index : null;
  }

  return null;
}

function isVector3(value: unknown): value is Vector3 {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function getNamedTarget(objects: SceneObject[], prompt: string) {
  const normalizedPrompt = normalizeText(prompt);

  return [...objects]
    .map((object) => ({ object, normalizedName: normalizeText(object.name || "") }))
    .filter(({ normalizedName }) => normalizedName.length > 0)
    .sort((left, right) => right.normalizedName.length - left.normalizedName.length)
    .find(({ normalizedName }) => {
      const namePattern = new RegExp(`(?:^|\\s)${normalizedName.split(" ").map(escapeRegex).join("\\s+")}(?:$|\\s)`, "i");
      return namePattern.test(normalizedPrompt);
    });
}

function validateSceneInput(scene: unknown) {
  const missing: string[] = [];

  if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
    throw new Error("edit_scene received invalid scene_data: missing metadata, environment, environment.background, objects");
  }

  const candidate = scene as Record<string, unknown>;

  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    missing.push("metadata");
  }

  if (!candidate.environment || typeof candidate.environment !== "object" || Array.isArray(candidate.environment)) {
    missing.push("environment");
  } else {
    const environment = candidate.environment as Record<string, unknown>;

    if (!environment.background || typeof environment.background !== "object" || Array.isArray(environment.background)) {
      missing.push("environment.background");
    }
  }

  if (!Array.isArray(candidate.objects)) {
    missing.push("objects");
  }

  if (missing.length > 0) {
    throw new Error(`edit_scene received invalid scene_data: missing ${missing.join(", ")}`);
  }
}

function ensureDesignTokens(scene: EditableScene) {
  const currentAnimations = Array.isArray(scene.animations) ? scene.animations : [];
  const designTokens = normalizeDesignTokens(scene.metadata.design_tokens, {
    use_case: scene.metadata.use_case,
    style: scene.metadata.style,
    animation: resolveAnimationToken(currentAnimations)
  });

  scene.metadata.design_tokens = designTokens;
  return designTokens;
}

function resolveAnimationToken(animations: Animation[]): AnimationToken {
  if (animations.length === 0) {
    return "none";
  }

  const uniqueTypes = new Set(animations.map((animation) => animation.type));

  if (uniqueTypes.size === 1) {
    const [onlyType] = uniqueTypes;

    return onlyType === "rotate" ? "rotation" : onlyType;
  }

  if (uniqueTypes.size === 2 && uniqueTypes.has("float") && uniqueTypes.has("rotate")) {
    return "float";
  }

  const firstType = animations[0]?.type;

  if (!firstType) {
    return "none";
  }

  return firstType === "rotate" ? "rotation" : firstType;
}

function needsAnimationTokenWarning(animations: Animation[]) {
  const uniqueTypes = new Set(animations.map((animation) => animation.type));

  if (uniqueTypes.size <= 1) {
    return false;
  }

  return !(uniqueTypes.size === 2 && uniqueTypes.has("float") && uniqueTypes.has("rotate"));
}

function syncAnimationToken(scene: EditableScene, summary: EditSummary, warnOnCompression: boolean) {
  const designTokens = ensureDesignTokens(scene);
  const animations = Array.isArray(scene.animations) ? scene.animations : [];

  designTokens.animation = resolveAnimationToken(animations);

  if (warnOnCompression && needsAnimationTokenWarning(animations)) {
    pushUnique(summary.warnings, `design_tokens.animation was set to "${designTokens.animation}" because mixed animation stacks cannot be represented by a single token.`);
  }
}

export function findTargetObject(objects: SceneObject[], prompt: string): TargetMatch {
  if (objects.length === 0) {
    return {
      matched: false,
      warning: "No scene objects are available to target."
    };
  }

  const namedTarget = getNamedTarget(objects, prompt);

  if (namedTarget) {
    return {
      object: namedTarget.object,
      matched: true
    };
  }

  const ordinalTargetIndex = getOrdinalTargetIndex(prompt, objects.length);

  if (ordinalTargetIndex !== null) {
    return {
      object: objects[ordinalTargetIndex],
      matched: true
    };
  }

  return {
    object: objects[0],
    matched: false,
    warning: `No named or ordinal target found; used ${getObjectLabel(objects[0], 0)} as fallback.`
  };
}

function getRequestedAnimationTypes(prompt: string) {
  const matches = ANIMATION_PATTERNS.flatMap(({ type, pattern }) => {
    const regex = new RegExp(pattern.source, pattern.flags);

    return Array.from(prompt.matchAll(regex)).map((match) => ({
      type,
      index: match.index ?? -1
    }));
  })
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index);

  const requestedTypes: Animation["type"][] = [];

  for (const match of matches) {
    if (!requestedTypes.includes(match.type)) {
      requestedTypes.push(match.type);
    }
  }

  return requestedTypes;
}

export function detectAnimationIntent(prompt: string): AnimationIntent {
  const requestedTypes = getRequestedAnimationTypes(prompt);
  const replacePatterns = [/\bonly\b/i, /\bjust\b/i, /\breplace\b/i, /\binstead\b/i, /\bchange\s+animation\s+to\b/i, /\bchange\s+to\b/i];
  const addPatterns = [/\badd\b/i, /\balso\b/i, /\band\b/i];
  const mode: AnimationMode =
    replacePatterns.some((pattern) => pattern.test(prompt))
      ? "replace"
      : addPatterns.some((pattern) => pattern.test(prompt))
        ? "add"
        : "add";

  return {
    type: requestedTypes[0] ?? "none",
    mode
  };
}

function dedupeAnimations(animations: Animation[]) {
  const seen = new Set<string>();
  const uniqueAnimations: Animation[] = [];
  let skippedCount = 0;

  for (const animation of animations) {
    const animationKey = `${animation.target_id ?? animation.target}:${animation.type}`;

    if (seen.has(animationKey)) {
      skippedCount += 1;
      continue;
    }

    seen.add(animationKey);
    uniqueAnimations.push(animation);
  }

  return {
    uniqueAnimations,
    skippedCount
  };
}

function shiftBackground(scene: EditableScene, direction: "darker" | "lighter", summary: EditSummary) {
  const currentBackground = scene.environment.background.value;

  if (!isHexColor(currentBackground)) {
    pushUnique(summary.warnings, `Background color "${currentBackground}" is not a hex value, so only lighting intensity was adjusted.`);
    return;
  }

  const nextBackground = direction === "darker"
    ? mixHex(currentBackground, "#05070a", 0.28)
    : mixHex(currentBackground, "#ffffff", 0.22);

  if (nextBackground !== currentBackground) {
    scene.environment.background.value = nextBackground;
    pushUnique(summary.applied, `background → ${direction}`);
  }
}

function adjustLighting(scene: EditableScene, direction: "darker" | "lighter", summary: EditSummary) {
  const lighting = Array.isArray(scene.lighting) ? scene.lighting : [];

  if (lighting.length === 0) {
    pushUnique(summary.skipped, `lighting: no lights available to make the scene ${direction}`);
    return;
  }

  let changed = 0;

  for (const light of lighting) {
    const factor = direction === "darker"
      ? light.type === "ambient" ? 0.78 : 0.92
      : light.type === "ambient" ? 1.18 : 1.08;
    const nextIntensity = Number(clamp(light.intensity * factor, 0.1, 10).toFixed(2));

    if (nextIntensity !== light.intensity) {
      light.intensity = nextIntensity;
      changed += 1;
    }
  }

  if (changed > 0) {
    pushUnique(summary.applied, `lighting → ${direction}`);
  } else {
    pushUnique(summary.skipped, `lighting: intensities were already optimized for a ${direction} adjustment`);
  }

  const designTokens = ensureDesignTokens(scene);

  if (designTokens.lighting_preset !== "neon_edge") {
    designTokens.lighting_preset = direction === "darker" ? "studio_dramatic" : "ambient_bright";
  }
}

function applyStylePreset(scene: EditableScene, tone: "dark" | "light", summary: EditSummary) {
  const designTokens = ensureDesignTokens(scene);

  if (tone === "dark") {
    scene.environment.background.value = "#0a0a0a";
    scene.metadata.style = "dark";
    designTokens.theme = "dark";
    designTokens.background_preset = "dark_studio";
    if (designTokens.lighting_preset !== "neon_edge") {
      designTokens.lighting_preset = "studio_dramatic";
    }
    pushUnique(summary.applied, "background → dark");
    pushUnique(summary.applied, "style → dark");
    adjustLighting(scene, "darker", summary);
    return;
  }

  scene.environment.background.value = "#ffffff";
  scene.metadata.style = "minimal";
  designTokens.theme = "minimal";
  designTokens.background_preset = "light_clean";
  designTokens.lighting_preset = "ambient_bright";
  pushUnique(summary.applied, "background → light");
  pushUnique(summary.applied, "style → minimal");
  adjustLighting(scene, "lighter", summary);
}

function applyNeonLighting(scene: EditableScene, summary: EditSummary) {
  const lighting = Array.isArray(scene.lighting) ? scene.lighting : [];

  if (lighting.length === 0) {
    pushUnique(summary.skipped, "lighting: neon preset requested but the scene has no lights to retune");
    return;
  }

  const ambientLight = lighting.find((light) => light.type === "ambient");
  const dynamicLights = lighting.filter((light) => light.type !== "ambient");

  if (ambientLight) {
    ambientLight.color = "#d9ecff";
    ambientLight.intensity = Number(clamp(Math.min(ambientLight.intensity, 0.24), 0.1, 10).toFixed(2));
  }

  dynamicLights.forEach((light, index) => {
    light.color = index === 0 ? "#00e5ff" : "#34d399";
    light.intensity = Number(clamp(Math.max(light.intensity, index === 0 ? 1.08 : 0.92), 0.1, 10).toFixed(2));
  });

  pushUnique(summary.applied, "lighting → neon_edge");
}

function detectMaterialIntent(prompt: string, summary: EditSummary) {
  const matches = MATERIAL_INTENTS
    .map((intent) => ({
      intent,
      index: getLastMatchIndex(intent.pattern, prompt)
    }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    pushUnique(
      summary.warnings,
      `Multiple material keywords were found; applied the last one mentioned (${matches[matches.length - 1].intent.label}).`
    );
  }

  return matches[matches.length - 1].intent;
}

function applyMaterialIntent(scene: EditableScene, prompt: string, materialIntent: MaterialIntent, summary: EditSummary) {
  const designTokens = ensureDesignTokens(scene);
  const targetMatch = findTargetObject(scene.objects, prompt);
  const shouldTargetSingleObject = targetMatch.matched && targetMatch.object !== undefined;
  const theme = materialIntent.theme ?? getSceneTheme(scene);
  const lightingPreset = materialIntent.lightingPreset ?? getSceneLightingPreset(scene);
  const objectsToUpdate = shouldTargetSingleObject && targetMatch.object ? [targetMatch.object] : scene.objects;

  if (objectsToUpdate.length === 0) {
    pushUnique(summary.skipped, `material: no objects available for ${materialIntent.label}`);
    return;
  }

  for (const object of objectsToUpdate) {
    const objectIndex = getObjectIndexById(scene.objects, object);

    object.material = getMaterial(
      theme,
      materialIntent.materialPreset,
      lightingPreset,
      object.name || "",
      objectIndex >= 0 ? objectIndex : 0,
      materialIntent.materialStyle
    );
  }

  if (materialIntent.theme) {
    scene.metadata.style = materialIntent.theme;
    designTokens.theme = materialIntent.theme;
  }

  if (materialIntent.lightingPreset) {
    designTokens.lighting_preset = materialIntent.lightingPreset;
  }

  designTokens.material_preset = materialIntent.materialPreset;

  if (materialIntent.label === "neon") {
    designTokens.background_preset = "gradient_vivid";
    applyNeonLighting(scene, summary);
  }

  if (shouldTargetSingleObject && targetMatch.object) {
    const targetIndex = getObjectIndexById(scene.objects, targetMatch.object);
    const targetLabel = getObjectLabel(targetMatch.object, targetIndex >= 0 ? targetIndex : 0);

    pushUnique(summary.applied, `material → ${materialIntent.label} on ${targetLabel}`);

    if (scene.objects.length > 1) {
      pushUnique(
        summary.warnings,
        `design_tokens.material_preset is global; it was updated to "${materialIntent.materialPreset}" after changing only ${targetLabel}.`
      );
    }

    return;
  }

  pushUnique(summary.applied, `material → ${materialIntent.label}`);
}

function getLastMovementDirection(prompt: string, directionPatterns: Record<string, RegExp>) {
  const matches = Object.entries(directionPatterns)
    .map(([direction, pattern]) => ({
      direction,
      index: getLastMatchIndex(pattern, prompt)
    }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index);

  return matches.length > 0 ? matches[matches.length - 1].direction : null;
}

function applyPositionIntent(scene: EditableScene, prompt: string, summary: EditSummary) {
  if (!hasMovementVerb(prompt)) {
    return;
  }

  const verticalDirection = getLastMovementDirection(prompt, {
    up: MOVEMENT_PATTERNS.up,
    down: MOVEMENT_PATTERNS.down
  });
  const horizontalDirection = getLastMovementDirection(prompt, {
    left: MOVEMENT_PATTERNS.left,
    right: MOVEMENT_PATTERNS.right
  });

  if (!verticalDirection && !horizontalDirection) {
    return;
  }

  const targetMatch = findTargetObject(scene.objects, prompt);

  if (!targetMatch.object) {
    pushUnique(summary.skipped, "position: no target object is available");
    if (targetMatch.warning) {
      pushUnique(summary.warnings, targetMatch.warning);
    }
    return;
  }

  if (targetMatch.warning) {
    pushUnique(summary.warnings, targetMatch.warning);
  }

  if (!isVector3(targetMatch.object.position)) {
    const targetIndex = getObjectIndexById(scene.objects, targetMatch.object);
    pushUnique(summary.skipped, `position: ${getObjectLabel(targetMatch.object, targetIndex >= 0 ? targetIndex : 0)} has an invalid position vector`);
    return;
  }

  const position = [...targetMatch.object.position] as Vector3;
  const directions: string[] = [];

  if (verticalDirection === "up") {
    position[1] += 1;
    directions.push("up");
  }

  if (verticalDirection === "down") {
    position[1] -= 1;
    directions.push("down");
  }

  if (horizontalDirection === "left") {
    position[0] -= 1;
    directions.push("left");
  }

  if (horizontalDirection === "right") {
    position[0] += 1;
    directions.push("right");
  }

  targetMatch.object.position = position;

  const targetIndex = getObjectIndexById(scene.objects, targetMatch.object);
  pushUnique(summary.applied, `position → ${getObjectLabel(targetMatch.object, targetIndex >= 0 ? targetIndex : 0)} moved ${directions.join(" and ")}`);
}

function applyAnimationIntent(scene: EditableScene, prompt: string, summary: EditSummary) {
  const requestedTypes = getRequestedAnimationTypes(prompt);

  if (requestedTypes.length === 0) {
    return false;
  }

  const animationIntent = detectAnimationIntent(prompt);
  const generatedAnimations = requestedTypes.flatMap((type) => buildAnimations(scene.objects, type));
  const { uniqueAnimations, skippedCount } = dedupeAnimations(generatedAnimations);

  if (animationIntent.mode === "replace") {
    scene.animations = uniqueAnimations;
    pushUnique(summary.applied, `animation → replaced with ${requestedTypes.join(", ")}`);
    if (skippedCount > 0) {
      pushUnique(summary.warnings, `Collapsed ${skippedCount} duplicate generated animation${skippedCount === 1 ? "" : "s"} while replacing the animation stack.`);
    }
    return true;
  }

  const existingAnimations = Array.isArray(scene.animations) ? scene.animations : [];
  const existingKeys = new Set(existingAnimations.map((animation) => `${animation.target_id ?? animation.target}:${animation.type}`));
  const animationsToAppend = uniqueAnimations.filter((animation) => !existingKeys.has(`${animation.target_id ?? animation.target}:${animation.type}`));
  const duplicateCount = uniqueAnimations.length - animationsToAppend.length;

  if (animationsToAppend.length === 0) {
    pushUnique(summary.skipped, `animation: ${requestedTypes.join(", ")} already exists on the scene`);
    return false;
  }

  scene.animations = [...existingAnimations, ...animationsToAppend];
  pushUnique(summary.applied, `animation → added ${requestedTypes.join(", ")}`);

  if (duplicateCount > 0 || skippedCount > 0) {
    const totalDuplicates = duplicateCount + skippedCount;
    pushUnique(summary.warnings, `Skipped ${totalDuplicates} duplicate animation${totalDuplicates === 1 ? "" : "s"} while appending to the existing stack.`);
  }

  return true;
}

function hasDarkPresetIntent(prompt: string) {
  return [
    /\bmake(?:\s+it|\s+the\s+(?:scene|background|style|theme))?\s+dark\b/i,
    /\bdark\s+(?:background|scene|style|theme)\b/i,
    /^\s*dark\s*$/i
  ].some((pattern) => pattern.test(prompt));
}

function hasLightPresetIntent(prompt: string) {
  return [
    /\bmake(?:\s+it|\s+the\s+(?:scene|background|style|theme))?\s+light\b/i,
    /\blight\s+(?:background|scene|style|theme)\b/i,
    /^\s*light\s*$/i
  ].some((pattern) => pattern.test(prompt));
}

export function editScene(scene: any, prompt: string): EditSceneResult {
  validateSceneInput(scene);

  const updated = JSON.parse(JSON.stringify(scene)) as EditableScene;
  updated.animations = Array.isArray(updated.animations) ? updated.animations : [];
  updated.lighting = Array.isArray(updated.lighting) ? updated.lighting : [];

  const editSummary: EditSummary = {
    applied: [],
    skipped: [],
    warnings: []
  };

  ensureDesignTokens(updated);

  if (hasPattern(/\bdarker\b/i, prompt)) {
    adjustLighting(updated, "darker", editSummary);
    shiftBackground(updated, "darker", editSummary);
  }

  if (hasPattern(/\blighter\b/i, prompt)) {
    adjustLighting(updated, "lighter", editSummary);
    shiftBackground(updated, "lighter", editSummary);
  }

  if (hasDarkPresetIntent(prompt)) {
    applyStylePreset(updated, "dark", editSummary);
  }

  if (hasLightPresetIntent(prompt)) {
    applyStylePreset(updated, "light", editSummary);
  }

  const materialIntent = detectMaterialIntent(prompt, editSummary);

  if (materialIntent) {
    applyMaterialIntent(updated, prompt, materialIntent, editSummary);
  }

  const animationsChanged = applyAnimationIntent(updated, prompt, editSummary);
  applyPositionIntent(updated, prompt, editSummary);
  syncAnimationToken(updated, editSummary, animationsChanged);

  if (editSummary.applied.length === 0) {
    pushUnique(editSummary.skipped, "No matching edit instructions were applied.");
  }

  return {
    updatedScene: updated as unknown as SceneData,
    editSummary
  };
}
