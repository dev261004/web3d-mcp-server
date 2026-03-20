import { z } from "zod";
import { generateR3FCode } from "../services/r3fGenerator.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const generateR3FTool = {
  name: "generate_r3f_code",
  description: `
Convert structured scene data into React Three Fiber code.

Returns a complete React component that renders the scene.
`,

  parameters: z.object({
    scene_data: z.any()
  }),

  async execute({ scene_data }: any) {
    const normalizedScene = unwrapToolPayload(scene_data, "scene_data");
    const code = generateR3FCode(normalizedScene);

    return createToolResult({
      r3f_code: code
    });
  }
};
