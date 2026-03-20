import { z } from "zod";
import { applyAnimation } from "../services/animationApplier.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const applyAnimationTool = {
  name: "apply_animation",
  description: `
Apply or modify animation in an existing 3D scene.

Your job:
- Add or replace animation for the main object

Rules:
- Do NOT modify objects
- Only affect animation
- Replace existing animation if present

Supported animations:
- rotation
- float
- bounce
`,

  parameters: z.object({
    scene_data: z.any(),
    animation_type: z.enum(["rotation", "float", "bounce"])
  }),

  async execute({ scene_data, animation_type }: any) {
    const normalizedScene = unwrapToolPayload(scene_data, "scene_data");
    const updated = applyAnimation(normalizedScene, animation_type);

    return createToolResult({
      scene_data: updated
    });
  }
};
