import { z } from "zod";
import { createScenePlan } from "../services/scenePlanner.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const generateScenePlanTool = {
  name: "generate_scene_plan",
  description: `
Create a structured 3D scene plan from the refined prompt.

Your job:
- Identify the main object(s) in the scene
- Extract style, environment, and animation intent

Rules:
- Include 1 to 3 objects MAXIMUM
- Objects must be meaningful nouns (e.g., "shoe", "bottle", "phone")
- Do NOT include adjectives or effects as objects
  (e.g., "glowing", "stylish", "background" are NOT objects)
- Do NOT repeat objects
- Choose ONE primary object (first in list)

id="hero_rule"
Rules:
- First object is the main subject
- Additional objects (if any) must support the main object
- Avoid unrelated objects in the same scene

Style rules:
- Style should describe visual feel (e.g., premium, minimal, futuristic)
- Style must be ONLY ONE keyword
- Allowed styles:
  - premium
  - minimal
  - futuristic
  - playful
  - dark
- Do NOT return multiple words (e.g., "premium dark moody" is invalid)

Object rules:
- Only include PHYSICAL objects that exist as visible 3D items
- Do NOT include:
  - lighting elements (e.g., "light", "spotlight", "glow")
  - effects (e.g., "particles", "smoke", "sparkles")
  - environment words (e.g., "background", "atmosphere")
- Do NOT include environment elements
- Objects must be real-world items (e.g., "shoe", "bottle", "phone")
Examples of VALID objects:
- "shoe", "bottle", "phone", "chair"

Examples of INVALID objects:
- "light", "particles", "glow", "shadow"

- Animation should be simple (rotation, float, none)
Examples:

User: "3D rotating sneaker ad with dark premium feel"
Output:
{
  "objects": ["sneaker"],
  "style": "premium",
  "animation": "rotation",
  "use_case": "advertisement"
}

User: "modern website hero section with floating phone"
Output:
{
  "objects": ["phone"],
  "style": "minimal",
  "animation": "float",
  "use_case": "website"
}

Return ONLY structured scene plan.
`,

  parameters: z.object({
    refined_prompt: z.string(),
    context: z.any()
  }),

  async execute({ refined_prompt, context }: any) {
    const normalizedPrompt = unwrapToolPayload<string>(refined_prompt, "refined_prompt");
    const normalizedContext = unwrapToolPayload<Record<string, unknown>>(context, "context");
    const scenePlan = createScenePlan(normalizedPrompt, normalizedContext);

    // enforce rules
    const objects = Array.isArray(scenePlan.objects)
      ? [...new Set(scenePlan.objects)].slice(0, 3)
      : ["product"];

    const allowedStyles = ["premium", "minimal", "futuristic", "playful", "dark"];

    if (!allowedStyles.includes(scenePlan.style)) {
      scenePlan.style = "default";
    }

    return createToolResult({
      scene_plan: {
        ...scenePlan,
        objects
      }
    });
  }
};
