import { z } from "zod";
import { buildScene } from "../services/sceneBuilder.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

function normalizeScenePlan(scenePlan: unknown) {
    const parsedPlan = unwrapToolPayload<unknown>(scenePlan, "scene_plan");

    if (!parsedPlan || typeof parsedPlan !== "object" || Array.isArray(parsedPlan)) {
        throw new Error("Scene plan must be an object");
    }

    return parsedPlan as {
        objects?: unknown;
        style?: string;
        use_case?: string;
        animation?: string;
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

This tool is deterministic and does not interpret intent.
`,
    parameters: z.object({
        scene_plan: z.object({
            objects: z.array(z.string()).min(1).max(3),
            style: z.string(),
            animation: z.string().optional(),
            use_case: z.string()
        })
    }),

    async execute({ scene_plan }: any) {
        const normalizedPlan = normalizeScenePlan(scene_plan);

        if (!Array.isArray(normalizedPlan.objects) || normalizedPlan.objects.length === 0) {
            throw new Error("Scene plan must include at least one object");
        }
        if (normalizedPlan.objects.length > 3) {
            throw new Error("Maximum 3 objects allowed");
        }
        const scene = buildScene(normalizedPlan);

        return createToolResult({
            scene_data: scene
        });
    }
};
