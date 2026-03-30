import { z } from "zod";
import { refinePrompt } from "../services/promptRefiner.js";
import { createToolResult } from "../utils/toolPayload.js";

export const refinePromptTool = {
  name: "refine_prompt",
  description: `
Refine a user's request for creating a 3D scene.

Your job:
- Understand the user's intent clearly
- Identify the purpose (advertisement, website, showcase, etc.)
- Extract typed design tokens
- Detect if animation is implied

Return these structured fields when possible:
- use_case
- theme / style
- material_preset
- animation
- lighting_preset
- background_preset
- composition
- confirmed_objects
- object_hints
- discarded_hints

Rules:
- Do NOT generate objects here
- Do NOT create a scene
- Only clarify and structure intent
- Keep richer scene-object detail in confirmed_objects for downstream tools

Return a refined prompt and structured context for the next step.
`,

  parameters: z.object({
    user_prompt: z.string()
  }),

  async execute({ user_prompt }: { user_prompt: string }) {
    return createToolResult(refinePrompt(user_prompt));
  }
};
