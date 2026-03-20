import { z } from "zod";
import { buildScene } from "../services/sceneBuilder.js";
import { designTokensSchema, normalizeDesignTokens } from "../types/designTokens.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

function normalizeScenePlan(scenePlan: unknown) {
    const parsedPlan = unwrapToolPayload<unknown>(scenePlan, "scene_plan");

    if (!parsedPlan || typeof parsedPlan !== "object" || Array.isArray(parsedPlan)) {
        throw new Error("Scene plan must be an object");
    }

    return parsedPlan as {
        objects?: unknown;
        style?: unknown;
        use_case?: unknown;
        animation?: unknown;
        design_tokens?: unknown;
    };
}

export const generateSceneTool = {
    name: "generate_scene",
    description: `
Generate a complete 3D scene from a structured scene plan.

Your job:
- Convert the scene plan into structured scene data

Rules:
- Do NOT modify the scene plan
- Do NOT add new objects
- Use provided objects exactly
- First object is the main subject
- Apply style and animation as given
- Consume design_tokens directly when present

This tool is deterministic and does not interpret intent.
`,
    parameters: z.object({
        scene_plan: z.object({
            objects: z.array(z.string()).min(1).max(3),
            style: z.string().optional(),
            animation: z.string().optional(),
            use_case: z.string().optional(),
            design_tokens: designTokensSchema.partial().optional()
        })
    }),

    async execute({ scene_plan }: any) {
        const normalizedPlan = normalizeScenePlan(scene_plan);
        const objects = Array.isArray(normalizedPlan.objects)
            ? [...new Set(normalizedPlan.objects.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))]
            : [];
        const designTokens = normalizeDesignTokens(normalizedPlan.design_tokens, {
            use_case: normalizedPlan.use_case,
            style: normalizedPlan.style,
            animation: normalizedPlan.animation
        });

        if (objects.length === 0) {
            throw new Error("Scene plan must include at least one object");
        }
        if (objects.length > 3) {
            throw new Error("Maximum 3 objects allowed");
        }
        const scene = buildScene({
            ...normalizedPlan,
            objects,
            style: designTokens.theme,
            use_case: designTokens.use_case,
            animation: designTokens.animation,
            design_tokens: designTokens
        });

        return createToolResult({
            scene_data: scene
        });
    }
};
