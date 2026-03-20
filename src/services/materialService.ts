import { Material } from "../types/scene.js";

export function getMaterial(style: string, name = ""): Material {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("ice")) {
    return {
      type: "glass",
      color: "#ffffff",
      roughness: 0.1
    };
  }

  switch (style) {
    case "premium":
      return {
        type: "metal",
        color: "#dddddd",
        metalness: 0.8,
        roughness: 0.2
      };

    case "minimal":
      return {
        type: "matte",
        color: "#ffffff",
        roughness: 0.8
      };

    default:
      return {
        type: "matte",
        color: "#cccccc"
      };
  }
}
