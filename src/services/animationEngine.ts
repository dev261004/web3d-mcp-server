import { v4 as uuidv4 } from "uuid";
import { Animation } from "../types/scene.js";

export function createAnimation(targetId: string, type: string): Animation | null {
  if (type === "rotation") {
    return {
      id: uuidv4(),
      target: targetId,
      type: "rotation",
      axis: "y",
      speed: 0.5,
      loop: true
    };
  }

  if (type === "float") {
    return {
      id: uuidv4(),
      target: targetId,
      type: "float",
      speed: 0.3,
      loop: true
    };
  }

  return null;
}
