import { generateR3FCode } from "./r3fGenerator.js";

export function exportScene(scene: any, format: string) {
  // 🟢 R3F EXPORT
  if (format === "r3f") {
    const code = generateR3FCode(scene);

    return {
      type: "r3f",
      content: code
    };
  }

  // 🔵 JSON EXPORT
  if (format === "json") {
    return {
      type: "json",
      content: JSON.stringify(scene, null, 2)
    };
  }

  // 🟡 PREVIEW EXPORT (MVP FAKE)
  if (format === "preview") {
    return {
      type: "preview",
      preview_url: `/preview/${scene.scene_id}`
    };
  }

  return {
    error: "Unsupported format"
  };
}