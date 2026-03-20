import { z } from "zod";
import { createToolResult } from "../utils/toolPayload.js";

export const refinePromptTool = {
  name: "refine_prompt",
  description: `
Refine a user's request for creating a 3D scene.

Your job:
- Understand the user's intent clearly
- Identify the purpose (advertisement, website, showcase, etc.)
- Extract style hints (premium, minimal, futuristic, etc.)
- Detect if animation is implied

Rules:
- Do NOT generate objects here
- Do NOT create a scene
- Only clarify and structure intent

Return a refined prompt and structured context for the next step.
`,

  parameters: z.object({
    user_prompt: z.string()
  }),

  async execute({ user_prompt }: { user_prompt: string }) {
    // Basic logic (we improve later)

    let use_case = "unknown";

    if (user_prompt.toLowerCase().includes("ad")) {
      use_case = "advertisement";
    } else if (user_prompt.toLowerCase().includes("website")) {
      use_case = "website";
    }

    return createToolResult({
      refined_prompt: user_prompt,
      context: {
        use_case,
        style: undefined,
        animation: undefined
      }
    });
  }
};
