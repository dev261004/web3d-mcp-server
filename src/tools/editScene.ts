import { z } from "zod";
import { editScene } from "../services/sceneEditor.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const editSceneTool = {
  name: "edit_scene",
  description: `
Modify an existing 3D scene based on user request.

Your job:
- Apply small, targeted changes to the scene

Rules:
- Do NOT recreate the scene
- Do NOT remove existing objects unless explicitly asked
- Do NOT add new objects in MVP
- Only modify properties like:
  - style
  - background
  - animation
  - position
  - material

Examples:
- "make it darker"
- "add rotation"
- "make it metallic"
- "move object up"
`,

  parameters: z.object({
    scene_data: z.any(),
    edit_prompt: z.string()
  }),

  async execute({ scene_data, edit_prompt }: any) {
    const normalizedScene = unwrapToolPayload(scene_data, "scene_data");
    const updatedScene = editScene(normalizedScene, edit_prompt);

    return createToolResult({
      scene_data: updatedScene
    });
  }
};
