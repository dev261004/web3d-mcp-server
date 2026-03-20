import { v4 as uuidv4 } from "uuid";
import { getAssetForObject } from "./assetService.js";
import { getMaterial } from "./materialService.js";
import { SceneObject, Vector3 } from "../types/scene.js";

const LAYOUT_POSITIONS: Vector3[] = [
  [0, 0, 0],
  [-1.5, 0, 0],
  [1.5, 0, 0]
];

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

function getObjectPosition(index: number): Vector3 {
  return LAYOUT_POSITIONS[index] ?? [0, 0, index];
}

export function createObject(name: string, style: string, index: number): SceneObject {
  const asset = getAssetForObject(name);
  const shape = asset ? undefined : getPrimitiveShape(name);

  return {
    id: uuidv4(),
    type: asset ? "model" : "primitive",
    name,
    shape,
    asset: asset || null,
    position: getObjectPosition(index),
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: getMaterial(style, name)
  };
}
