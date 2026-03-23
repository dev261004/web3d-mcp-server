import { normalizeDesignTokens } from "../types/designTokens.js";
import { ColorHint, extractObjectHints } from "./promptRefiner.js";

export const MAX_SCENE_PLAN_OBJECTS = 4;

const INVALID_OBJECTS = [
  "light",
  "lighting",
  "glow",
  "particles",
  "smoke",
  "sparkles",
  "shadow",
  "background",
  "website",
  "hero",
  "section"
];

function filterObjects(objects: string[], warnings: string[]) {
  const filtered: string[] = [];
  const dropped: string[] = [];

  for (const obj of objects) {
    if (INVALID_OBJECTS.includes(obj.toLowerCase())) {
      dropped.push(obj);
    } else {
      filtered.push(obj);
    }
  }

  if (dropped.length > 0) {
    warnings.push(
      `Filtered out non-physical object${dropped.length > 1 ? "s" : ""}: ${dropped.join(", ")}. Only visible 3D items are included.`
    );
  }

  return filtered;
}

function normalizeObjectHints(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeConfirmedObjects(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => extractObjectHints(item))
    .filter(Boolean);
}

function normalizeColorHints(value: unknown): ColorHint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ColorHint =>
      typeof item === "object" &&
      item !== null &&
      typeof item.name === "string" &&
      typeof item.hex === "string" &&
      typeof item.role === "string"
  );
}

export function createScenePlan(prompt: string, context: Record<string, unknown> = {}) {
  const designTokens = normalizeDesignTokens(context.design_tokens, {
    use_case: context.use_case,
    style: context.style,
    animation: context.animation
  });

  const warnings: string[] = [];
  const confirmedObjects = normalizeConfirmedObjects(context.confirmed_objects);
  const objectHints = normalizeObjectHints(context.object_hints);
  const extractedObjects =
    confirmedObjects.length > 0
      ? confirmedObjects
      : objectHints.length > 0
        ? objectHints
        : extractObjectHints(prompt);
  const cleanedObjects = [...new Set(filterObjects(extractedObjects, warnings))];
  const colorHints = normalizeColorHints(context.color_hints);

  return {
    objects: cleanedObjects.length > 0 ? cleanedObjects : ["product"],
    style: designTokens.theme,
    use_case: designTokens.use_case,
    animation: designTokens.animation,
    design_tokens: designTokens,
    color_hints: colorHints,
    warnings
  };
}
