import { Material } from "../types/scene.js";
import { MaterialPresetToken, ThemeToken } from "../types/designTokens.js";

function getThemeColor(theme: ThemeToken) {
  switch (theme) {
    case "premium":
      return "#ddd3c3";
    case "futuristic":
      return "#cfe8ff";
    case "playful":
      return "#ff8aa1";
    case "dark":
      return "#2f3440";
    case "minimal":
    default:
      return "#f5f5f5";
  }
}

export function getMaterial(
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  name = ""
): Material {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("ice")) {
    return {
      type: "glass",
      color: "#ffffff",
      roughness: 0.1
    };
  }

  switch (materialPreset) {
    case "glass_frost":
      return {
        type: "glass",
        color: "#ffffff",
        roughness: 0.08
      };

    case "glass_clear":
      return {
        type: "glass",
        color: "#f5fbff",
        roughness: 0.02
      };

    case "metal_chrome":
      return {
        type: "metal",
        color: "#f5f5f5",
        metalness: 1,
        roughness: 0.05
      };

    case "metal_brushed":
      return {
        type: "metal",
        color: getThemeColor(theme),
        metalness: 0.8,
        roughness: 0.22
      };

    case "plastic_gloss":
      return {
        type: "matte",
        color: getThemeColor(theme),
        roughness: 0.22
      };

    case "matte_soft":
    default:
      return {
        type: "matte",
        color: getThemeColor(theme),
        roughness: 0.8
      };
  }
}
