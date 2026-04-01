import { normalizeDesignTokens } from "../lib/designTokens.js";
import { ColorHint, extractObjectHints } from "./promptRefiner.js";

export const MAX_SCENE_PLAN_OBJECTS = 4;

const INVALID_OBJECTS = [
  "light",
  "lighting",
  "glow",
  "glowing",
  "smoke",
  "shadow",
  "background",
  "website",
  "hero",
  "section",
  "secondary",
  "primary",
  "main",
  "additional",
  "extra",
  "supporting",
  "object",
  "objects",
  "item",
  "items",
  "element",
  "elements",
  "thing",
  "things",
  "prop",
  "props",
  "subject",
  "model",
  "models",
  "asset",
  "assets",
  "animation",
  "animations",
  "rotate",
  "rotating",
  "float",
  "floating",
  "bounce",
  "pulse",
  "spin",
  "idle",
  "motion",
  "movement",
  "effect",
  "effects",
  "lights",
  "foreground",
  "environment",
  "scene",
  "studio",
  "stage",
  "banner",
  "advertisement",
  "ad",
  "app",
  "finish",
  "texture",
  "material",
  "surface",
  "sheen",
  "gloss",
  "matte",
  "metallic",
  "glossy",
  "reflective",
  "rough",
  "smooth",
  "chrome",
  "gold",
  "silver",
  "bronze",
  "accent",
  "hardware",
  "highlight",
  "shadow",
  "glow",
  "shine",
  "colour",
  "color",
  "premium",
  "minimal",
  "futuristic",
  "playful",
  "dark",
  "modern",
  "clean",
  "stylish",
  "elegant",
  "luxury",
  "sleek",
  "bold",
  "sharp",
  "dynamic",
  "pedestal",
  "platform",
  "base",
  "stand",
  "side",
  "next",
  "above",
  "below",
  "behind",
  "beside",
  "near"
];

const BLOCKED_OBJECTS = new Set(INVALID_OBJECTS.map((entry) => entry.toLowerCase()));

type KnownObjectEntry = {
  output: string;
  aliases: string[];
};

const KNOWN_OBJECT_ENTRIES: KnownObjectEntry[] = [
  { output: "bag", aliases: ["bag", "bags"] },
  { output: "handbag", aliases: ["handbag", "handbags"] },
  { output: "purse", aliases: ["purse", "purses"] },
  { output: "tote", aliases: ["tote", "totes"] },
  { output: "backpack", aliases: ["backpack", "backpacks"] },
  { output: "satchel", aliases: ["satchel", "satchels"] },
  { output: "clutch", aliases: ["clutch", "clutches"] },
  { output: "wallet", aliases: ["wallet", "wallets"] },
  { output: "briefcase", aliases: ["briefcase", "briefcases"] },
  { output: "luggage", aliases: ["luggage"] },
  { output: "suitcase", aliases: ["suitcase", "suitcases"] },
  { output: "pouch", aliases: ["pouch", "pouches"] },
  { output: "cardholder", aliases: ["cardholder", "cardholders"] },
  { output: "watch", aliases: ["watch", "watches"] },
  { output: "smartwatch", aliases: ["smartwatch", "smartwatches"] },
  { output: "ring", aliases: ["ring", "rings"] },
  { output: "earring", aliases: ["earring", "earrings"] },
  { output: "necklace", aliases: ["necklace", "necklaces"] },
  { output: "bracelet", aliases: ["bracelet", "bracelets"] },
  { output: "bangle", aliases: ["bangle", "bangles"] },
  { output: "brooch", aliases: ["brooch", "brooches"] },
  { output: "glasses", aliases: ["glasses"] },
  { output: "sunglasses", aliases: ["sunglasses"] },
  { output: "helmet", aliases: ["helmet", "helmets"] },
  { output: "hat", aliases: ["hat", "hats"] },
  { output: "cap", aliases: ["cap", "caps"] },
  { output: "shoe", aliases: ["shoe", "shoes"] },
  { output: "sneaker", aliases: ["sneaker", "sneakers"] },
  { output: "boot", aliases: ["boot", "boots"] },
  { output: "sandal", aliases: ["sandal", "sandals"] },
  { output: "belt", aliases: ["belt", "belts"] },
  { output: "glove", aliases: ["glove", "gloves"] },
  { output: "phone", aliases: ["phone", "phones", "smartphone", "smartphones", "mobile"] },
  { output: "laptop", aliases: ["laptop", "laptops"] },
  { output: "tablet", aliases: ["tablet", "tablets"] },
  { output: "keyboard", aliases: ["keyboard", "keyboards"] },
  { output: "mouse", aliases: ["mouse", "mice"] },
  { output: "monitor", aliases: ["monitor", "monitors"] },
  { output: "speaker", aliases: ["speaker", "speakers"] },
  { output: "headphones", aliases: ["headphones", "headphone"] },
  { output: "earbuds", aliases: ["earbuds", "earbud"] },
  { output: "camera", aliases: ["camera", "cameras"] },
  { output: "tv", aliases: ["tv", "television"] },
  { output: "remote", aliases: ["remote", "remotes"] },
  { output: "controller", aliases: ["controller", "controllers"] },
  { output: "console", aliases: ["console", "consoles"] },
  { output: "chair", aliases: ["chair", "chairs"] },
  { output: "sofa", aliases: ["sofa", "sofas"] },
  { output: "table", aliases: ["table", "tables"] },
  { output: "desk", aliases: ["desk", "desks"] },
  { output: "shelf", aliases: ["shelf", "shelves"] },
  { output: "lamp", aliases: ["lamp", "lamps"] },
  { output: "bottle", aliases: ["bottle", "bottles"] },
  { output: "cup", aliases: ["cup", "cups"] },
  { output: "mug", aliases: ["mug", "mugs"] },
  { output: "jar", aliases: ["jar", "jars"] },
  { output: "vase", aliases: ["vase", "vases"] },
  { output: "book", aliases: ["book", "books"] },
  { output: "notebook", aliases: ["notebook", "notebooks"] },
  { output: "pen", aliases: ["pen", "pens"] },
  { output: "pencil", aliases: ["pencil", "pencils"] },
  { output: "brush", aliases: ["brush", "brushes"] },
  { output: "candle", aliases: ["candle", "candles"] },
  { output: "clock", aliases: ["clock", "clocks"] },
  { output: "car", aliases: ["car", "cars"] },
  { output: "truck", aliases: ["truck", "trucks"] },
  { output: "bike", aliases: ["bike", "bikes"] },
  { output: "bicycle", aliases: ["bicycle", "bicycles"] },
  { output: "motorcycle", aliases: ["motorcycle", "motorcycles"] },
  { output: "scooter", aliases: ["scooter", "scooters"] },
  { output: "drone", aliases: ["drone", "drones"] },
  { output: "boat", aliases: ["boat", "boats"] },
  { output: "flower", aliases: ["flower", "flowers"] },
  { output: "plant", aliases: ["plant", "plants"] },
  { output: "cactus", aliases: ["cactus", "cacti"] },
  { output: "apple", aliases: ["apple", "apples"] },
  { output: "cake", aliases: ["cake", "cakes"] },
  { output: "coffee", aliases: ["coffee"] }
];

const KNOWN_OBJECT_ALIAS_SET = new Set(
  KNOWN_OBJECT_ENTRIES.flatMap((entry) => entry.aliases.map((alias) => alias.toLowerCase()))
);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPromptDetail(prompt: string) {
  const prefix = "Preserve these request details: ";
  const marker = "., Create a ";

  if (!prompt.startsWith(prefix)) {
    return prompt;
  }

  const markerIndex = prompt.indexOf(marker);

  if (markerIndex === -1) {
    return prompt.slice(prefix.length).trim();
  }

  return prompt.slice(prefix.length, markerIndex).trim();
}

function preprocessPromptForObjects(prompt: string) {
  const detail = extractPromptDetail(prompt);

  return detail
    .replace(/\b(?:secondary object|secondary objects|primary object|primary objects|main subject|main object|main objects|props?|animations?|items?|elements?)\s*:/gi, " ")
    .replace(/(^|\s)[\-*•]+(?=\s*\w)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function findKnownObjectMatches(prompt: string) {
  const normalizedPrompt = normalizeText(preprocessPromptForObjects(prompt));
  const matches: Array<{ index: number; value: string }> = [];
  const seen = new Set<string>();

  for (const entry of KNOWN_OBJECT_ENTRIES) {
    let earliestIndex = Number.POSITIVE_INFINITY;

    for (const alias of entry.aliases) {
      const normalizedAlias = normalizeText(alias);
      const pattern = new RegExp(`\\b${escapeRegExp(normalizedAlias)}\\b`, "g");
      const match = pattern.exec(normalizedPrompt);

      if (match && typeof match.index === "number") {
        earliestIndex = Math.min(earliestIndex, match.index);
      }
    }

    if (Number.isFinite(earliestIndex) && !seen.has(entry.output)) {
      seen.add(entry.output);
      matches.push({
        index: earliestIndex,
        value: entry.output
      });
    }
  }

  return matches.sort((left, right) => left.index - right.index).map((match) => match.value);
}

function extractPlanObjectCandidates(prompt: string) {
  const preprocessedPrompt = preprocessPromptForObjects(prompt);
  const knownMatches = findKnownObjectMatches(preprocessedPrompt);
  const generalHints = extractObjectHints(preprocessedPrompt).filter((hint) => {
    const normalizedHint = normalizeText(hint);

    return (
      normalizedHint.length > 0 &&
      !BLOCKED_OBJECTS.has(normalizedHint) &&
      !KNOWN_OBJECT_ALIAS_SET.has(normalizedHint)
    );
  });

  return [...new Set([...knownMatches, ...generalHints])];
}

function filterObjects(objects: string[], warnings: string[]) {
  const filtered: string[] = [];
  const dropped: string[] = [];

  for (const obj of objects) {
    if (BLOCKED_OBJECTS.has(obj.toLowerCase())) {
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
    .flatMap((item) => {
      const knownMatches = findKnownObjectMatches(item);

      return knownMatches.length > 0 ? knownMatches : extractPlanObjectCandidates(item);
    })
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
        ? [...new Set([...findKnownObjectMatches(prompt), ...objectHints])]
        : extractPlanObjectCandidates(prompt);
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
