import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { FastMCP } from "fastmcp";
import { detectCategory, normalizeObjectCategory } from "../lib/objectCategories.js";
import type { SceneData, Vector3 } from "../types/scene.types.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";
import type {
  PreviewGenerationOptions,
  PreviewLight,
  PreviewResult,
  PreviewSceneData,
  PreviewSpatialValidation,
  PreviewSpatialValidationCheck,
  PreviewTextDescription,
  PreviewView
} from "../types/preview.types.js";

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 400;
const GRID_SIZE = 60;
const FALLBACK_ACCENT = "#00e5ff";
const FALLBACK_BACKGROUND = "#050a15";
const LIGHT_SYMBOL = "\u2726";
const PENDING_SYMBOL = "\u26a0";
const RIGHT_ARROW = "\u2192";

const PREVIEW_TOOL_DESCRIPTION = `Preview a 3D scene before generating code.

Returns two outputs:
  1. An SVG wireframe — a 2D top-down orthographic view of all objects,
     lights, and camera frustum in the scene.
  2. A structured text description — scene overview, object list,
     lighting summary, animation summary, and spatial validation checks.

Use this tool AFTER generate_scene and BEFORE synthesize_geometry
to validate that objects are correctly positioned, lights are placed,
animations have valid targets, and no objects overlap.

The spatial_validation section runs 6 automated checks and returns
a confidence_score (0-10). If score < 7, fix the issues before
proceeding to generate_r3f_code.`;

const previewSchema = z.object({
  scene_data: z
    .object({})
    .passthrough()
    .describe("The scene_data object produced by generate_scene or edit_scene"),
  view: z
    .enum(["top", "front", "side"])
    .default("top")
    .describe("Camera view angle for the wireframe")
});

type Projection = {
  x: number;
  y: number;
  hiddenAxisLabel: string;
};

type ShapeSpec =
  | {
      kind: "rect";
      width: number;
      height: number;
    }
  | {
      kind: "ellipse";
      rx: number;
      ry: number;
    }
  | {
      kind: "circle";
      r: number;
    }
  | {
      kind: "cluster";
      radius: number;
      spread: number;
    };

type ColorReference = {
  name: string;
  hex: string;
};

const COLOR_REFERENCES: ColorReference[] = [
  { name: "deep navy", hex: "#050a15" },
  { name: "midnight blue", hex: "#07182d" },
  { name: "charcoal black", hex: "#070b12" },
  { name: "cool white", hex: "#f6f7fb" },
  { name: "warm ivory", hex: "#fff4dd" },
  { name: "neon cyan", hex: "#00e5ff" },
  { name: "bright aqua", hex: "#49d7ff" },
  { name: "emerald green", hex: "#34d399" },
  { name: "soft gold", hex: "#c6924c" },
  { name: "rose pink", hex: "#ff5cc8" },
  { name: "silver gray", hex: "#d9ecff" }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!/^#([\da-f]{3}|[\da-f]{6})$/i.test(trimmed)) {
    return fallback;
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

function parseHexColor(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function describeColor(hex: string) {
  const normalized = normalizeHexColor(hex, FALLBACK_BACKGROUND);
  const source = parseHexColor(normalized);

  let bestMatch = COLOR_REFERENCES[0];
  let smallestDistance = Number.POSITIVE_INFINITY;

  for (const reference of COLOR_REFERENCES) {
    const candidate = parseHexColor(reference.hex);
    const distance =
      Math.pow(source.r - candidate.r, 2) +
      Math.pow(source.g - candidate.g, 2) +
      Math.pow(source.b - candidate.b, 2);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      bestMatch = reference;
    }
  }

  return `${bestMatch.name} ${normalized}`;
}

function getAccentColor(sceneData: PreviewSceneData) {
  const accentHint = sceneData.metadata.color_hints?.find((hint) => hint.role === "accent");

  return normalizeHexColor(accentHint?.hex, FALLBACK_ACCENT);
}

function getBackgroundColor(sceneData: PreviewSceneData) {
  return normalizeHexColor(sceneData.environment?.background?.value, FALLBACK_BACKGROUND);
}

function getObjectLabel(object: PreviewSceneData["objects"][number]) {
  const candidate =
    (typeof object.name === "string" && object.name.trim()) ||
    (typeof object.id === "string" && object.id.trim()) ||
    (typeof object.type === "string" && object.type.trim()) ||
    "object";

  return candidate;
}

function hasPendingSynthesis(object: PreviewSceneData["objects"][number]) {
  return (
    object.type === "synthesis_contract" ||
    object.shape === "SYNTHESIS_REQUIRED" ||
    object.synthesis_contract?.__type === "SYNTHESIS_REQUIRED"
  );
}

function getLightLabel(light: PreviewLight) {
  if (light.type === "directional") {
    return "dir";
  }

  return light.type;
}

function clampPoint(x: number, y: number) {
  return {
    x: clamp(x, 0, VIEWBOX_WIDTH),
    y: clamp(y, 0, VIEWBOX_HEIGHT)
  };
}

function projectVector(vector: Vector3 | undefined, view: PreviewView): Projection {
  const x = vector?.[0] ?? 0;
  const y = vector?.[1] ?? 0;
  const z = vector?.[2] ?? 0;

  if (view === "front") {
    return {
      x: clamp(300 + x * GRID_SIZE, 0, VIEWBOX_WIDTH),
      y: clamp(200 - y * GRID_SIZE, 0, VIEWBOX_HEIGHT),
      hiddenAxisLabel: `z=${formatNumber(z)}`
    };
  }

  if (view === "side") {
    return {
      x: clamp(300 + z * GRID_SIZE, 0, VIEWBOX_WIDTH),
      y: clamp(200 - y * GRID_SIZE, 0, VIEWBOX_HEIGHT),
      hiddenAxisLabel: `x=${formatNumber(x)}`
    };
  }

  return {
    x: clamp(300 + x * GRID_SIZE, 0, VIEWBOX_WIDTH),
    y: clamp(200 - z * GRID_SIZE, 0, VIEWBOX_HEIGHT),
    hiddenAxisLabel: `y=${formatNumber(y)}`
  };
}

function getObjectBoundingBox(object: PreviewSceneData["objects"][number]) {
  const renderHints = object.render_hints as { bounding_box?: unknown } | undefined;
  const candidate =
    renderHints?.bounding_box ??
    object.synthesis_contract?.bounding_box;

  if (
    Array.isArray(candidate) &&
    candidate.length === 3 &&
    candidate.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)
  ) {
    return [candidate[0], candidate[1], candidate[2]] as [number, number, number];
  }

  return [1, 1, 1] as [number, number, number];
}

function getObjectCategory(object: PreviewSceneData["objects"][number]) {
  return normalizeObjectCategory(
    object.synthesis_contract?.category ??
    detectCategory(getObjectLabel(object))
  );
}

function getShapeSpec(object: PreviewSceneData["objects"][number]): ShapeSpec {
  const category = getObjectCategory(object);
  const [bbWidth, bbHeight, bbDepth] = getObjectBoundingBox(object);
  const widthPx = clamp(bbWidth * 30, 18, 140);
  const heightPx = clamp(bbHeight * 30, 10, 120);
  const depthPx = clamp(bbDepth * 30, 10, 140);

  if (category === "humanoid") {
    return {
      kind: "ellipse",
      rx: Math.max(10, widthPx * 0.35),
      ry: Math.max(18, heightPx * 0.5)
    };
  }

  if (category === "container") {
    return {
      kind: "rect",
      width: Math.max(24, widthPx),
      height: Math.max(14, Math.min(heightPx, widthPx * 0.85))
    };
  }

  if (category === "surface") {
    return {
      kind: "rect",
      width: Math.max(60, Math.max(widthPx, depthPx) * 1.4),
      height: 4
    };
  }

  if (category === "particle_system") {
    return {
      kind: "cluster",
      radius: 3,
      spread: clamp(Math.max(widthPx, depthPx) * 0.22, 8, 18)
    };
  }

  if (category === "vehicle") {
    return {
      kind: "rect",
      width: Math.max(42, widthPx),
      height: Math.max(16, heightPx * 0.6)
    };
  }

  if (category === "device") {
    return {
      kind: "rect",
      width: Math.max(18, widthPx),
      height: Math.max(28, heightPx)
    };
  }

  return {
    kind: "circle",
    r: clamp(Math.max(widthPx, heightPx, depthPx) * 0.28, 10, 28)
  };
}

function clampShapeCenter(projection: Projection, shape: ShapeSpec) {
  if (shape.kind === "rect") {
    return {
      x: clamp(projection.x, shape.width / 2 + 2, VIEWBOX_WIDTH - shape.width / 2 - 2),
      y: clamp(projection.y, shape.height / 2 + 2, VIEWBOX_HEIGHT - shape.height / 2 - 28)
    };
  }

  if (shape.kind === "ellipse") {
    return {
      x: clamp(projection.x, shape.rx + 2, VIEWBOX_WIDTH - shape.rx - 2),
      y: clamp(projection.y, shape.ry + 2, VIEWBOX_HEIGHT - shape.ry - 28)
    };
  }

  if (shape.kind === "cluster") {
    const radius = shape.radius + shape.spread;

    return {
      x: clamp(projection.x, radius + 2, VIEWBOX_WIDTH - radius - 2),
      y: clamp(projection.y, radius + 2, VIEWBOX_HEIGHT - radius - 28)
    };
  }

  return {
    x: clamp(projection.x, shape.r + 2, VIEWBOX_WIDTH - shape.r - 2),
    y: clamp(projection.y, shape.r + 2, VIEWBOX_HEIGHT - shape.r - 28)
  };
}

function buildObjectWireframe(
  object: PreviewSceneData["objects"][number],
  accentColor: string,
  view: PreviewView
) {
  const shape = getShapeSpec(object);
  const projection = projectVector(object.position, view);
  const center = clampShapeCenter(projection, shape);
  const hiddenAxisY = clamp(center.y + 26, 0, VIEWBOX_HEIGHT - 6);
  const labelY = clamp(center.y + 14, 0, VIEWBOX_HEIGHT - 16);
  const name = getObjectLabel(object);
  const pending = hasPendingSynthesis(object);
  const strokeStyle = pending
    ? `stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="4 2"`
    : `stroke="${accentColor}" stroke-width="1.5"`;
  const pendingBadge = pending
    ? `<text x="${clamp(center.x + 28, 0, VIEWBOX_WIDTH - 10)}" y="${labelY}" fill="#ffcc00" font-size="10" text-anchor="start">${PENDING_SYMBOL} pending</text>`
    : "";
  let baseShape = "";

  if (shape.kind === "rect") {
    const x = clamp(center.x - shape.width / 2, 0, VIEWBOX_WIDTH);
    const y = clamp(center.y - shape.height / 2, 0, VIEWBOX_HEIGHT);

    baseShape = `<rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" rx="3" fill="none" ${strokeStyle} />`;
  } else if (shape.kind === "ellipse") {
    baseShape = `<ellipse cx="${center.x}" cy="${center.y}" rx="${shape.rx}" ry="${shape.ry}" fill="none" ${strokeStyle} />`;
  } else if (shape.kind === "cluster") {
    baseShape = [
      `<circle cx="${center.x}" cy="${center.y}" r="${shape.radius}" fill="none" ${strokeStyle} />`,
      `<circle cx="${center.x - shape.spread}" cy="${center.y - 5}" r="2" fill="none" ${strokeStyle} />`,
      `<circle cx="${center.x + shape.spread}" cy="${center.y - 5}" r="2" fill="none" ${strokeStyle} />`,
      `<circle cx="${center.x - shape.spread + 2}" cy="${center.y + 6}" r="2" fill="none" ${strokeStyle} />`,
      `<circle cx="${center.x + shape.spread - 2}" cy="${center.y + 6}" r="2" fill="none" ${strokeStyle} />`
    ].join("");
  } else {
    baseShape = `<circle cx="${center.x}" cy="${center.y}" r="${shape.r}" fill="none" ${strokeStyle} />`;
  }

  return `
    <g data-object-id="${escapeXml(object.id)}">
      ${baseShape}
      <text x="${center.x}" y="${labelY}" fill="#ffffff" font-size="10" text-anchor="middle">${escapeXml(name)}</text>
      ${pendingBadge}
      <text x="${center.x}" y="${hiddenAxisY}" fill="rgba(255,255,255,0.65)" font-size="8" text-anchor="middle">${escapeXml(projection.hiddenAxisLabel)}</text>
    </g>
  `;
}

function buildGrid() {
  const vertical = Array.from({ length: Math.floor(VIEWBOX_WIDTH / GRID_SIZE) + 1 }, (_, index) => {
    const x = index * GRID_SIZE;

    return `<line x1="${x}" y1="0" x2="${x}" y2="${VIEWBOX_HEIGHT}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
  }).join("");

  const horizontal = Array.from({ length: Math.floor(VIEWBOX_HEIGHT / GRID_SIZE) + 1 }, (_, index) => {
    const y = index * GRID_SIZE;

    return `<line x1="0" y1="${y}" x2="${VIEWBOX_WIDTH}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
  }).join("");

  return `${vertical}${horizontal}`;
}

function buildCameraFrustum(sceneData: PreviewSceneData, view: PreviewView) {
  const cameraProjection = projectVector(sceneData.camera?.position, view);
  const targetProjection = projectVector(sceneData.camera?.target, view);
  const dx = targetProjection.x - cameraProjection.x;
  const dy = targetProjection.y - cameraProjection.y;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const spread = clamp((sceneData.camera?.fov ?? 50) * 0.8, 18, 60);
  const left = clampPoint(targetProjection.x + normalX * spread, targetProjection.y + normalY * spread);
  const right = clampPoint(targetProjection.x - normalX * spread, targetProjection.y - normalY * spread);

  return `
    <g data-camera="frustum">
      <line x1="${cameraProjection.x}" y1="${cameraProjection.y}" x2="${left.x}" y2="${left.y}" stroke="#00e5ff" stroke-opacity="0.3" stroke-width="1.5" />
      <line x1="${cameraProjection.x}" y1="${cameraProjection.y}" x2="${right.x}" y2="${right.y}" stroke="#00e5ff" stroke-opacity="0.3" stroke-width="1.5" />
      <circle cx="${cameraProjection.x}" cy="${cameraProjection.y}" r="3" fill="#00e5ff" fill-opacity="0.45" />
    </g>
  `;
}

function buildLights(sceneData: PreviewSceneData, view: PreviewView) {
  return sceneData.lighting
    .filter((light) => light.type !== "ambient" && Array.isArray(light.position))
    .map((light) => {
      const projection = projectVector(light.position, view);
      const color = normalizeHexColor(light.color, FALLBACK_ACCENT);

      return `
        <g data-light-id="${escapeXml(light.id)}">
          <text x="${projection.x}" y="${projection.y}" fill="${color}" font-size="12" text-anchor="middle">${LIGHT_SYMBOL}</text>
          <text x="${projection.x}" y="${clamp(projection.y + 10, 0, VIEWBOX_HEIGHT - 4)}" fill="${color}" font-size="8" text-anchor="middle">${escapeXml(getLightLabel(light))}</text>
        </g>
      `;
    })
    .join("");
}

function buildLegend() {
  return `
    <g data-legend="preview">
      <text x="16" y="350" fill="rgba(255,255,255,0.45)" font-size="8">${LIGHT_SYMBOL} = light source</text>
      <text x="16" y="362" fill="rgba(255,255,255,0.45)" font-size="8">ellipse = humanoid, rect = device/container/vehicle, flat bar = surface</text>
      <text x="16" y="374" fill="rgba(255,255,255,0.45)" font-size="8">dot cluster = particles, solid stroke = resolved, dashed stroke = pending synthesis</text>
    </g>
  `;
}

function generateSvgWireframe(sceneData: PreviewSceneData, view: PreviewView) {
  const backgroundColor = getBackgroundColor(sceneData);
  const accentColor = getAccentColor(sceneData);
  const title = escapeXml(sceneData.metadata?.title || "Untitled Scene");
  const objectWireframes = sceneData.objects.map((object) => buildObjectWireframe(object, accentColor, view)).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" role="img" aria-label="Scene preview wireframe">
  <rect width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" fill="${backgroundColor}" />
  ${buildGrid()}
  ${buildCameraFrustum(sceneData, view)}
  ${buildLights(sceneData, view)}
  ${objectWireframes}
  <text x="300" y="20" fill="${accentColor}" font-size="12" font-weight="700" text-anchor="middle">${title}</text>
  ${buildLegend()}
</svg>`;
}

function buildSceneOverview(sceneData: PreviewSceneData) {
  const backgroundDescription = describeColor(getBackgroundColor(sceneData));
  const camera = sceneData.camera;

  return `SCENE OVERVIEW
Title: ${sceneData.metadata.title}
Use case: ${sceneData.metadata.use_case}
Style: ${sceneData.metadata.style}
Background: ${backgroundDescription}
Camera: position (${formatNumber(camera.position[0])}, ${formatNumber(camera.position[1])}, ${formatNumber(camera.position[2])}) | FOV ${camera.fov} | target (${formatNumber(camera.target[0])}, ${formatNumber(camera.target[1])}, ${formatNumber(camera.target[2])})`;
}

function buildObjectDescription(sceneData: PreviewSceneData) {
  return sceneData.objects.map((object) => {
    const materialType = typeof object.material?.type === "string" ? object.material.type : "unknown";
    const color = normalizeHexColor(object.material?.color, "#ffffff");
    const synthesisStatus = hasPendingSynthesis(object) ? "PENDING" : "READY";

    return `[${getObjectLabel(object)}] at (${formatNumber(object.position[0])}, ${formatNumber(object.position[1])}, ${formatNumber(object.position[2])}) | material: ${materialType} | color: ${color} | synthesis: ${synthesisStatus}`;
  });
}

function buildLightingSummary(sceneData: PreviewSceneData) {
  const counts = {
    ambient: 0,
    spot: 0,
    directional: 0,
    point: 0
  };

  for (const light of sceneData.lighting) {
    if (light.type in counts) {
      counts[light.type as keyof typeof counts] += 1;
    }
  }

  const nonAmbientLights = sceneData.lighting.filter((light) => light.type !== "ambient");
  const colorCounts = new Map<string, number>();

  for (const light of nonAmbientLights.length > 0 ? nonAmbientLights : sceneData.lighting) {
    const normalized = normalizeHexColor(light.color, FALLBACK_ACCENT);
    colorCounts.set(normalized, (colorCounts.get(normalized) ?? 0) + 1);
  }

  const dominantColors = [...colorCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([color]) => describeColor(color))
    .join(", ") || "none";

  const lightingPreset = sceneData.metadata.design_tokens?.lighting_preset ?? "unspecified";

  return `LIGHTING SUMMARY
ambient: ${counts.ambient}
spot: ${counts.spot}
directional: ${counts.directional}
point: ${counts.point}
Dominant light color(s): ${dominantColors}
Lighting preset: ${lightingPreset}`;
}

function buildAnimationSummary(sceneData: PreviewSceneData) {
  if (sceneData.animations.length === 0) {
    return ["No animations configured."];
  }

  return sceneData.animations.map((animation) => {
    const config: Record<string, unknown> = isRecord(animation.config) ? animation.config : {};
    const speed = typeof config.speed === "number" ? config.speed : "n/a";
    const axis = typeof config.axis === "string" ? config.axis : "n/a";
    const targetRef =
      (typeof animation.target_id === "string" && animation.target_id.trim()) ||
      animation.target ||
      "unknown_target";

    return `${targetRef} ${RIGHT_ARROW} ${animation.type} | speed: ${speed} | axis: ${axis}`;
  });
}

function createCheck(
  id: string,
  label: string,
  status: PreviewSpatialValidationCheck["status"],
  detail: string
): PreviewSpatialValidationCheck {
  return { id, label, status, detail };
}

function validateBounds(sceneData: PreviewSceneData) {
  const outOfBounds = sceneData.objects.filter((object) => {
    return Math.abs(object.position[0]) > 2 || Math.abs(object.position[2]) > 2;
  });

  if (outOfBounds.length === 0) {
    return createCheck(
      "check_1_bounds",
      "Bounds",
      "PASS",
      "All objects are within the [-2, 2] bounds on both X and Z axes."
    );
  }

  return createCheck(
    "check_1_bounds",
    "Bounds",
    "WARN",
    `Out-of-bounds objects: ${outOfBounds.map((object) => getObjectLabel(object)).join(", ")}.`
  );
}

function validateOverlap(sceneData: PreviewSceneData) {
  const overlappingPairs: string[] = [];

  for (let index = 0; index < sceneData.objects.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < sceneData.objects.length; compareIndex += 1) {
      const left = sceneData.objects[index];
      const right = sceneData.objects[compareIndex];
      const distance = Math.hypot(left.position[0] - right.position[0], left.position[2] - right.position[2]);

      if (distance < 0.3) {
        overlappingPairs.push(
          `${getObjectLabel(left)} ↔ ${getObjectLabel(right)} (${distance.toFixed(2)} units)`
        );
      }
    }
  }

  if (overlappingPairs.length === 0) {
    return createCheck(
      "check_2_overlap",
      "Overlap",
      "PASS",
      "No objects share nearly the same XZ position."
    );
  }

  return createCheck(
    "check_2_overlap",
    "Overlap",
    "WARN",
    `Potential overlap detected: ${overlappingPairs.join("; ")}.`
  );
}

function validateCamera(sceneData: PreviewSceneData) {
  const cameraZ = sceneData.camera.position[2];

  if (cameraZ > 2) {
    return createCheck(
      "check_3_camera",
      "Camera",
      "PASS",
      `Camera Z position is ${cameraZ.toFixed(1)}, which is far enough for previewing the scene.`
    );
  }

  return createCheck(
    "check_3_camera",
    "Camera",
    "WARN",
    `Camera Z position is ${cameraZ.toFixed(1)}; increase it above 2.0 to avoid a cramped framing.`
  );
}

function validateLighting(sceneData: PreviewSceneData) {
  const nonAmbientLights = sceneData.lighting.filter((light) => light.type !== "ambient");

  if (nonAmbientLights.length > 0) {
    return createCheck(
      "check_4_lighting",
      "Lighting",
      "PASS",
      `${nonAmbientLights.length} non-ambient light source(s) available for shaping the scene.`
    );
  }

  return createCheck(
    "check_4_lighting",
    "Lighting",
    "WARN",
    "No non-ambient lights found; add a spot, directional, or point light for visual contrast."
  );
}

function validateSynthesisPending(sceneData: PreviewSceneData) {
  const pendingObjects = sceneData.objects.filter(hasPendingSynthesis);

  if (pendingObjects.length === 0) {
    return createCheck(
      "check_5_synthesis_pending",
      "Synthesis Pending",
      "PASS",
      "All objects are ready for downstream code generation."
    );
  }

  return createCheck(
    "check_5_synthesis_pending",
    "Synthesis Pending",
    "WARN",
    `${pendingObjects.length} object(s) still require synthesis: ${pendingObjects.map((object) => getObjectLabel(object)).join(", ")}.`
  );
}

function validateAnimationTargets(sceneData: PreviewSceneData) {
  if (sceneData.animations.length === 0) {
    return createCheck(
      "check_6_animation_target",
      "Animation Target",
      "PASS",
      "No animations were provided, so there are no invalid targets."
    );
  }

  const objectIds = new Set(sceneData.objects.map((object) => object.id));
  const invalidTargets = sceneData.animations.filter((animation) => {
    const targetId =
      (typeof animation.target_id === "string" && animation.target_id.trim()) ||
      (typeof animation.target === "string" && animation.target.trim()) ||
      "";

    return !objectIds.has(targetId);
  });

  if (invalidTargets.length === 0) {
    return createCheck(
      "check_6_animation_target",
      "Animation Target",
      "PASS",
      "Every animation target maps to an object in the scene."
    );
  }

  return createCheck(
    "check_6_animation_target",
    "Animation Target",
    "FAIL",
    `Invalid animation targets: ${invalidTargets
      .map((animation) => animation.target_id || animation.target || animation.id)
      .join(", ")}.`
  );
}

export function analyzeSpatialValidation(sceneData: PreviewSceneData): PreviewSpatialValidation {
  const checks = [
    validateBounds(sceneData),
    validateOverlap(sceneData),
    validateCamera(sceneData),
    validateLighting(sceneData),
    validateSynthesisPending(sceneData),
    validateAnimationTargets(sceneData)
  ];
  const passed = checks.filter((check) => check.status === "PASS").length;
  const total = checks.length;
  const confidenceScore = clamp(Math.round((passed / total) * 10), 0, 10);
  const recommendation =
    confidenceScore < 7
      ? "RECOMMENDATION: Fix spatial issues before calling generate_r3f_code"
      : `READY: Scene is valid. Proceed to synthesize_geometry ${RIGHT_ARROW} generate_r3f_code`;

  return {
    checks,
    passed,
    total,
    confidence_score: confidenceScore,
    recommendation
  };
}

function buildTextDescription(
  sceneData: PreviewSceneData,
  spatialValidation: PreviewSpatialValidation
): PreviewTextDescription {
  return {
    scene_overview: buildSceneOverview(sceneData),
    objects: buildObjectDescription(sceneData),
    lighting_summary: buildLightingSummary(sceneData),
    animation_summary: buildAnimationSummary(sceneData),
    spatial_validation: spatialValidation
  };
}

function normalizeSceneData(sceneData: SceneData): PreviewSceneData {
  if (!isRecord(sceneData)) {
    throw new Error("scene_data must be an object");
  }

  if (!Array.isArray(sceneData.objects)) {
    throw new Error("scene_data.objects must be an array");
  }

  if (!Array.isArray(sceneData.lighting)) {
    throw new Error("scene_data.lighting must be an array");
  }

  if (!Array.isArray(sceneData.animations)) {
    throw new Error("scene_data.animations must be an array");
  }

  return sceneData as PreviewSceneData;
}

export function buildPreviewResult(
  sceneData: SceneData,
  view: PreviewView = "top",
  options: PreviewGenerationOptions = {}
): PreviewResult {
  const normalizedScene = normalizeSceneData(sceneData);
  const spatialValidation = analyzeSpatialValidation(normalizedScene);

  return {
    preview_id: options.previewId ?? randomUUID(),
    scene_id: normalizedScene.scene_id,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    svg_wireframe: generateSvgWireframe(normalizedScene, view),
    text_description: buildTextDescription(normalizedScene, spatialValidation),
    scene_data: normalizedScene
  };
}

/**
 * LLM calls preview tool between generate_scene and synthesize_geometry:
 *
 * generate_scene(scene_plan)
 *   → scene_data
 *     → preview({ scene_data })
 *         → Check confidence_score
 *         → If READY → synthesize_geometry(scene_data)
 *         → If WARN  → edit_scene(fix_prompt, scene_data) → preview again
 *           → generate_r3f_code(scene_data)
 */
export function registerPreviewTool(server: FastMCP): void {
  server.addTool(previewTool);
}

export const previewTool = {
  name: "preview",
  description: PREVIEW_TOOL_DESCRIPTION,
  parameters: previewSchema,

  async execute({ scene_data, view = "top" }: z.infer<typeof previewSchema>) {
    const normalizedScene = normalizeSceneData(unwrapToolPayload<SceneData>(scene_data, "scene_data"));

    return createToolResult(buildPreviewResult(normalizedScene, view));
  }
};
