import type { ComplexityTier } from "./complexity.profiles.js";

export type ObjectCategory =
  | "character"
  | "humanoid"
  | "vehicle"
  | "device"
  | "container"
  | "footwear"
  | "furniture"
  | "food"
  | "organic"
  | "structure"
  | "surface"
  | "environment"
  | "particle_system"
  | "unknown";

type NormalizedCategory = Exclude<ObjectCategory, "character">;

export interface CategoryConfig {
  bbox: [number, number, number];
  minParts: number;
  complexityHint: ComplexityTier;
  assemblyHint: string;
}

type CategoryProfile = {
  bbox: Record<ComplexityTier, [number, number, number]>;
  defaultComplexity: ComplexityTier;
  minParts: number;
  assemblyHints: Record<ComplexityTier, string>;
};

const CATEGORY_PROFILES: Record<NormalizedCategory, CategoryProfile> = {
  humanoid: {
    bbox: {
      low: [0.4, 1.2, 0.4],
      medium: [0.5, 1.6, 0.5],
      high: [0.6, 1.8, 0.5]
    },
    defaultComplexity: "high",
    minParts: 7,
    assemblyHints: {
      low: "Simple head + body + 2 arm stubs + 2 leg stubs.",
      medium: "Head + neck + torso + 2 arms (upper+forearm) + 2 legs (thigh+shin) + basic hands.",
      high: "Head with visor + eyes, neck, torso with chest ring + core + side panels, waist + accent strip, 2 arms (shoulder joint + upper arm + elbow joint + forearm + hand), 2 legs (hip joint + upper leg + knee joint + lower leg + foot), antenna + base ring."
    }
  },
  vehicle: {
    bbox: {
      low: [1.2, 0.5, 0.6],
      medium: [1.6, 0.7, 0.8],
      high: [2.0, 0.9, 1.0]
    },
    defaultComplexity: "high",
    minParts: 6,
    assemblyHints: {
      low: "Simple box body + 4 wheel cylinders.",
      medium: "Body shell + hood + windshield plane + 4 detailed wheels + headlights.",
      high: "Full body with hood, roof, trunk, doors as separate panels, detailed wheel wells, 4 wheels with hubcaps, front grille, bumpers, windshield plus rear glass, side mirrors, and exhaust."
    }
  },
  device: {
    bbox: {
      low: [0.35, 0.7, 0.08],
      medium: [0.45, 0.85, 0.1],
      high: [0.6, 1.0, 0.12]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: "Simple slab body + screen inset + one hardware detail.",
      medium: "Body shell + screen panel + bezel break + 2 hardware details such as camera, button, or speaker grille.",
      high: "Detailed device shell with front frame, back panel, side rails, display recess, camera cluster, speaker grille, ports, button cutouts, logo plate, and accent seams."
    }
  },
  container: {
    bbox: {
      low: [0.6, 0.5, 0.3],
      medium: [0.8, 0.6, 0.4],
      high: [1.0, 0.7, 0.45]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: "Build a box body with a lid or flap and one distinguishing detail such as a clasp, handle, or label.",
      medium: "Box or cylinder body + open or close flap + handle or strap + 2 hardware details such as clasp, zipper, or studs.",
      high: "Full bag: main body panel, back panel, side gussets, top flap with closure, dual handles or chain strap with connectors, gold hardware including clasp disc and outer ring, stitching lines, corner reinforcements, base plate, stud feet, logo plate, interior zipper strip with pull, and chain attachment loops. Minimum 28 distinct mesh parts."
    }
  },
  footwear: {
    bbox: {
      low: [0.8, 0.3, 0.35],
      medium: [1.1, 0.55, 0.42],
      high: [1.25, 0.6, 0.5]
    },
    defaultComplexity: "medium",
    minParts: 5,
    assemblyHints: {
      low: "Simple sole slab + upper shell + heel block.",
      medium: "Sole + upper body + heel counter + toe box + lace or stripe detail.",
      high: "Layered outsole, midsole, heel counter, toe box, tongue, collar padding, lace rows, eyelets, stitched side panels, pull tab, and logo detail panels."
    }
  },
  furniture: {
    bbox: {
      low: [1.0, 0.8, 1.0],
      medium: [1.2, 1.1, 1.2],
      high: [1.6, 1.4, 1.6]
    },
    defaultComplexity: "medium",
    minParts: 5,
    assemblyHints: {
      low: "Primary surface plus a simple support structure.",
      medium: "Primary surface or seat + support frame + 2 detail elements such as backrest, arms, or shelf split.",
      high: "Detailed furniture assembly with main surfaces, support frame, structural joints, secondary panels, trim accents, and hardware or seam details."
    }
  },
  food: {
    bbox: {
      low: [0.6, 0.4, 0.6],
      medium: [1.0, 0.6, 1.0],
      high: [1.2, 0.7, 1.2]
    },
    defaultComplexity: "low",
    minParts: 3,
    assemblyHints: {
      low: "Primary edible shape + one color or topping layer + base element if needed.",
      medium: "Primary form + secondary topping or wrapper layers + garnish or plate detail.",
      high: "Detailed food silhouette with stacked layers, toppings, garnish, supporting wrapper or plate elements, and varied surface accents."
    }
  },
  organic: {
    bbox: {
      low: [0.6, 0.8, 0.6],
      medium: [1.0, 1.2, 1.0],
      high: [1.4, 1.6, 1.4]
    },
    defaultComplexity: "low",
    minParts: 3,
    assemblyHints: {
      low: "Primary body shape + one secondary accent + base or stem.",
      medium: "Main organic body + layered secondary forms + stem, base, or branching accents.",
      high: "Detailed organic silhouette with layered volumes, accent clusters, stem or branch elements, and varied surface detail panels."
    }
  },
  structure: {
    bbox: {
      low: [1.2, 1.8, 1.2],
      medium: [2.0, 3.0, 2.0],
      high: [3.0, 4.5, 3.0]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: "Main structural body + base + one opening or trim detail.",
      medium: "Main volume + base + 2 to 3 facade or support details.",
      high: "Detailed structural assembly with primary massing, facade layers, support members, base foundation, openings, trim lines, and accent architectural elements."
    }
  },
  surface: {
    bbox: {
      low: [2.0, 0.05, 2.0],
      medium: [4.0, 0.05, 4.0],
      high: [6.0, 0.05, 6.0]
    },
    defaultComplexity: "medium",
    minParts: 1,
    assemblyHints: {
      low: "Single flat plane.",
      medium: "Flat plane + 1 to 2 ring or grid detail elements.",
      high: "Mirror-finish plane + 5 concentric emissive rings + dot accent clusters at ring intersections + 4 radial strip elements + subtle elevation variance tiles."
    }
  },
  environment: {
    bbox: {
      low: [3.0, 2.0, 3.0],
      medium: [5.0, 3.0, 5.0],
      high: [8.0, 5.0, 8.0]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: "Simple background plane or hemisphere.",
      medium: "Background + 2 to 3 ambient floating elements.",
      high: "Rich environment with layered depth: background surface, mid-ground accent objects, foreground particles or bokeh planes, and emissive accent lines."
    }
  },
  particle_system: {
    bbox: {
      low: [0.6, 0.6, 0.6],
      medium: [0.8, 0.8, 0.8],
      high: [1.2, 1.2, 1.2]
    },
    defaultComplexity: "medium",
    minParts: 8,
    assemblyHints: {
      low: "8 to 12 small spheres scattered in a loose cluster.",
      medium: "20 mixed-shape particles using spheres, boxes, and cones at varied positions and sizes.",
      high: "28+ particles mixing spheres, boxes, and cones at distinct 3D positions, varied sizes, with emissive intensity variation between particles to create visual depth."
    }
  },
  unknown: {
    bbox: {
      low: [0.6, 0.6, 0.6],
      medium: [1.0, 1.0, 1.0],
      high: [1.2, 1.2, 1.2]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: "Build a recognizable 3D representation using primitive geometries. Prioritize silhouette accuracy.",
      medium: "Build a detailed representation using primitive geometries. Add surface details and material variation.",
      high: "Build a fully detailed representation using primitive geometries. Prioritize silhouette accuracy, material richness, and emissive accent details. Minimum 28 distinct mesh parts."
    }
  }
};

const CATEGORY_KEYWORDS: Array<{ category: NormalizedCategory; keywords: string[] }> = [
  {
    category: "particle_system",
    keywords: ["particle", "particles", "dust", "sparkle", "sparkles", "confetti", "glitter", "bokeh"]
  },
  {
    category: "surface",
    keywords: ["floor", "ground", "surface", "plane", "reflection", "mirror", "platform", "stage"]
  },
  {
    category: "environment",
    keywords: ["sky", "background", "environment", "backdrop", "horizon", "panorama", "scene"]
  },
  {
    category: "humanoid",
    keywords: ["robot", "human", "figure", "avatar", "alien", "creature", "person", "character", "android", "cyborg"]
  },
  {
    category: "vehicle",
    keywords: ["car", "spaceship", "drone", "truck", "bike", "boat", "ship", "rocket", "aircraft", "ufo", "helicopter"]
  },
  {
    category: "device",
    keywords: ["phone", "smartphone", "tablet", "laptop", "watch", "camera", "headphones", "earbuds", "console", "controller", "monitor", "keyboard"]
  },
  {
    category: "container",
    keywords: ["bottle", "can", "cup", "jar", "box", "bag", "handbag", "purse", "tote", "vase", "flask", "mug", "tumbler", "coldrink", "soda"]
  },
  {
    category: "footwear",
    keywords: ["shoe", "sneaker", "boot", "sandal", "heel", "trainer"]
  },
  {
    category: "furniture",
    keywords: ["chair", "table", "sofa", "desk", "shelf", "lamp", "couch", "bench"]
  },
  {
    category: "food",
    keywords: ["apple", "burger", "pizza", "cake", "fruit", "bread", "donut", "sandwich"]
  },
  {
    category: "organic",
    keywords: ["plant", "tree", "flower", "leaf", "crystal", "gem", "rock", "coral"]
  },
  {
    category: "structure",
    keywords: ["building", "tower", "arch", "bridge", "house", "monument"]
  }
];

function normalizeObjectName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeObjectCategory(category: ObjectCategory | string | undefined): NormalizedCategory {
  if (category === "character") {
    return "humanoid";
  }

  if (category && category in CATEGORY_PROFILES) {
    return category as NormalizedCategory;
  }

  return "unknown";
}

export function detectCategory(objectName: string): ObjectCategory {
  const normalized = normalizeObjectName(objectName);

  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.category;
    }
  }

  return "unknown";
}

export function getBoundingBox(category: ObjectCategory | string | undefined, complexityTier: ComplexityTier) {
  const normalizedCategory = normalizeObjectCategory(category);
  const categoryProfile = CATEGORY_PROFILES[normalizedCategory];

  return categoryProfile.bbox[complexityTier] ?? categoryProfile.bbox.medium;
}

export function getCategoryComplexityHint(category: ObjectCategory | string | undefined): ComplexityTier {
  return CATEGORY_PROFILES[normalizeObjectCategory(category)].defaultComplexity;
}

export function buildAssemblyHint(category: ObjectCategory | string | undefined, complexityTier: ComplexityTier) {
  const normalizedCategory = normalizeObjectCategory(category);
  const categoryProfile = CATEGORY_PROFILES[normalizedCategory];

  return categoryProfile.assemblyHints[complexityTier] ?? categoryProfile.assemblyHints.medium;
}

export const CATEGORY_MAP: Record<ObjectCategory, CategoryConfig> = {
  character: {
    bbox: CATEGORY_PROFILES.humanoid.bbox.medium,
    minParts: CATEGORY_PROFILES.humanoid.minParts,
    complexityHint: CATEGORY_PROFILES.humanoid.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.humanoid.assemblyHints.medium
  },
  humanoid: {
    bbox: CATEGORY_PROFILES.humanoid.bbox.medium,
    minParts: CATEGORY_PROFILES.humanoid.minParts,
    complexityHint: CATEGORY_PROFILES.humanoid.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.humanoid.assemblyHints.medium
  },
  vehicle: {
    bbox: CATEGORY_PROFILES.vehicle.bbox.medium,
    minParts: CATEGORY_PROFILES.vehicle.minParts,
    complexityHint: CATEGORY_PROFILES.vehicle.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.vehicle.assemblyHints.medium
  },
  device: {
    bbox: CATEGORY_PROFILES.device.bbox.medium,
    minParts: CATEGORY_PROFILES.device.minParts,
    complexityHint: CATEGORY_PROFILES.device.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.device.assemblyHints.medium
  },
  container: {
    bbox: CATEGORY_PROFILES.container.bbox.medium,
    minParts: CATEGORY_PROFILES.container.minParts,
    complexityHint: CATEGORY_PROFILES.container.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.container.assemblyHints.medium
  },
  footwear: {
    bbox: CATEGORY_PROFILES.footwear.bbox.medium,
    minParts: CATEGORY_PROFILES.footwear.minParts,
    complexityHint: CATEGORY_PROFILES.footwear.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.footwear.assemblyHints.medium
  },
  furniture: {
    bbox: CATEGORY_PROFILES.furniture.bbox.medium,
    minParts: CATEGORY_PROFILES.furniture.minParts,
    complexityHint: CATEGORY_PROFILES.furniture.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.furniture.assemblyHints.medium
  },
  food: {
    bbox: CATEGORY_PROFILES.food.bbox.medium,
    minParts: CATEGORY_PROFILES.food.minParts,
    complexityHint: CATEGORY_PROFILES.food.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.food.assemblyHints.medium
  },
  organic: {
    bbox: CATEGORY_PROFILES.organic.bbox.medium,
    minParts: CATEGORY_PROFILES.organic.minParts,
    complexityHint: CATEGORY_PROFILES.organic.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.organic.assemblyHints.medium
  },
  structure: {
    bbox: CATEGORY_PROFILES.structure.bbox.medium,
    minParts: CATEGORY_PROFILES.structure.minParts,
    complexityHint: CATEGORY_PROFILES.structure.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.structure.assemblyHints.medium
  },
  surface: {
    bbox: CATEGORY_PROFILES.surface.bbox.medium,
    minParts: CATEGORY_PROFILES.surface.minParts,
    complexityHint: CATEGORY_PROFILES.surface.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.surface.assemblyHints.medium
  },
  environment: {
    bbox: CATEGORY_PROFILES.environment.bbox.medium,
    minParts: CATEGORY_PROFILES.environment.minParts,
    complexityHint: CATEGORY_PROFILES.environment.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.environment.assemblyHints.medium
  },
  particle_system: {
    bbox: CATEGORY_PROFILES.particle_system.bbox.medium,
    minParts: CATEGORY_PROFILES.particle_system.minParts,
    complexityHint: CATEGORY_PROFILES.particle_system.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.particle_system.assemblyHints.medium
  },
  unknown: {
    bbox: CATEGORY_PROFILES.unknown.bbox.medium,
    minParts: CATEGORY_PROFILES.unknown.minParts,
    complexityHint: CATEGORY_PROFILES.unknown.defaultComplexity,
    assemblyHint: CATEGORY_PROFILES.unknown.assemblyHints.medium
  }
};
