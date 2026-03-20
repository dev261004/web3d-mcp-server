import { normalizeDesignTokens } from "../types/designTokens.js";
import { extractObjectHints } from "./promptRefiner.js";

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

function filterObjects(objects: string[]) {
  return objects.filter((obj) => !INVALID_OBJECTS.includes(obj.toLowerCase()));
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

export function createScenePlan(prompt: string, context: Record<string, unknown> = {}) {
  const designTokens = normalizeDesignTokens(context.design_tokens, {
    use_case: context.use_case,
    style: context.style,
    animation: context.animation
  });

  const objectHints = normalizeObjectHints(context.object_hints);
  const extractedObjects = objectHints.length > 0 ? objectHints : extractObjectHints(prompt);
  const cleanedObjects = [...new Set(filterObjects(extractedObjects))];

  return {
    objects: cleanedObjects.length > 0 ? cleanedObjects : ["product"],
    style: designTokens.theme,
    use_case: designTokens.use_case,
    animation: designTokens.animation,
    design_tokens: designTokens
  };
}
