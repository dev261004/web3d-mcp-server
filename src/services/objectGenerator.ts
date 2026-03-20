import { v4 as uuidv4 } from "uuid";
import { getAssetForObject } from "./assetService.js";
import { getMaterial } from "./materialService.js";
import { SceneObject, Vector3 } from "../types/scene.js";
import {
  CompositionPresetToken,
  MaterialPresetToken,
  ThemeToken
} from "../types/designTokens.js";

const LAYOUT_POSITIONS: Record<CompositionPresetToken, Vector3[]> = {
  hero_centered: [
    [0, 0, 0],
    [-1.5, -0.15, 0.2],
    [1.5, 0.15, 0.2]
  ],
  floating_showcase: [
    [0, 0.35, 0],
    [-1.2, -0.3, -0.2],
    [1.2, 0.4, -0.3]
  ],
  product_closeup: [
    [0, 0, 0],
    [-1.1, -0.25, -0.35],
    [1.1, 0.2, -0.35]
  ]
};

function getPrimitiveShape(name: string): "box" | "cylinder" {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("can") || normalizedName.includes("bottle")) {
    return "cylinder";
  }

  if (normalizedName.includes("ice")) {
    return "box";
  }

  return "box";
}

function getObjectPosition(index: number, composition: CompositionPresetToken): Vector3 {
  return LAYOUT_POSITIONS[composition][index] ?? [0, 0, index];
}

function getObjectScale(index: number, composition: CompositionPresetToken): Vector3 {
  if (index === 0 && composition === "product_closeup") {
    return [1.15, 1.15, 1.15];
  }

  if (index === 0 && composition === "floating_showcase") {
    return [1.05, 1.05, 1.05];
  }

  return [1, 1, 1];
}

export function createObject(
  name: string,
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  composition: CompositionPresetToken,
  index: number
): SceneObject {
  const asset = getAssetForObject(name);
  const shape = asset ? undefined : getPrimitiveShape(name);

  return {
    id: uuidv4(),
    type: asset ? "model" : "primitive",
    name,
    shape,
    asset: asset || null,
    position: getObjectPosition(index, composition),
    rotation: [0, 0, 0],
    scale: getObjectScale(index, composition),
    material: getMaterial(theme, materialPreset, name)
  };
}
