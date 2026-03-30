import { z } from "zod";
import { editScene } from "../services/sceneEditor.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const editSceneTool = {
  name: "edit_scene",
  description: `Apply targeted modifications to an existing scene_data object.

WHEN TO CALL:
- After validate_scene returns is_valid: false
- When the user requests a style, material, animation, or position change
  to an already-generated scene
- Do NOT call this to create a new scene — use generate_scene instead

WHAT THIS TOOL CAN MODIFY:
- background: color and style preset
- material: for all objects or a named object
- animation: add or replace animations on objects
- position: move a named object or the primary object
- lighting: intensity adjustments (darker / lighter)
- design_tokens: kept in sync with all changes automatically

WHAT THIS TOOL CANNOT DO:
- Add new objects to the scene (use generate_scene for this)
- Remove existing objects (out of scope in current version)
- Change camera position or FOV
- Modify individual mesh geometry

INPUT:
- scene_data: the full scene_data object from generate_scene or
  a previous edit_scene call
- edit_prompt: a plain-language description of the desired change

EDIT PROMPT EXAMPLES:
- "make it darker"          → dims ambient lighting, deepens background
- "make the material glass" → applies glass_frost to all objects
- "add rotation"            → appends rotation animation, keeps existing
- "move the robot up"       → moves object named "robot" up by 1 unit
- "change animation to float only" → replaces all animations with float
- "make it neon"            → applies neon material + neon_edge lighting

OUTPUT:
- scene_data: updated scene with all changes applied
- edit_summary: { applied[], skipped[], warnings[] }

PIPELINE POSITION:
  generate_scene → validate_scene → [edit_scene if invalid] →
  validate_scene (re-run) → synthesize_geometry → generate_r3f_code`,

  parameters: z.object({
    scene_data: z.any(),
    edit_prompt: z.string().min(1)
  }),

  async execute({ scene_data, edit_prompt }: { scene_data: unknown; edit_prompt: string }) {
    const normalizedScene = unwrapToolPayload(scene_data, "scene_data");
    const { updatedScene, editSummary } = editScene(normalizedScene, edit_prompt);

    return createToolResult({
      scene_data: updatedScene,
      edit_summary: editSummary
    });
  }
};
