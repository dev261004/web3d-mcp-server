import { z } from "zod";
import { exportScene } from "../services/exportService.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const exportAssetTool = {
  name: "export_asset",
  description: `
Export a 3D scene into usable formats.

Your job:
- Convert scene into a format that can be used outside the system

Supported formats:
- r3f → React Three Fiber component
- json → raw scene data
- preview → quick visual preview reference

Rules:
- Do NOT modify scene
- Only convert and package output
`,

  parameters: z.object({
    scene_data: z.any(),
    format: z.enum(["r3f", "json", "preview"])
  }),

  async execute({ scene_data, format }: any) {
    const normalizedScene = unwrapToolPayload(scene_data, "scene_data");
    const result = exportScene(normalizedScene, format);

    return createToolResult(result);
  }
};
