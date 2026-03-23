import { z } from "zod";
import { buildScene } from "../services/sceneBuilder.js";
import { MAX_SCENE_PLAN_OBJECTS } from "../services/scenePlanner.js";
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
        color_hints?: unknown;
    };
}

export const generateSceneTool = {
    name: "generate_scene",
    description: `
Generate a complete 3D scene from a structured scene plan.

Your job:
- Convert the scene plan into structured scene data
- Drive materials, lighting, background, and layout from design_tokens when present
- Apply user-specified color hints to background and accent colors
- Propagate design_tokens through to scene_data.metadata for downstream tools

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
            objects: z.array(z.string()).min(1).max(MAX_SCENE_PLAN_OBJECTS),
            style: z.string().optional(),
            animation: z.string().optional(),
            use_case: z.string().optional(),
            design_tokens: designTokensSchema.partial().optional(),
            color_hints: z.array(z.object({
                name: z.string(),
                hex: z.string(),
                role: z.enum(["background", "accent", "general"])
            })).optional()
        })
    }),

    async execute({ scene_plan }: any) {
        const normalizedPlan = normalizeScenePlan(scene_plan);
        const objects = Array.isArray(normalizedPlan.objects)
            ? [...new Set(normalizedPlan.objects.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))]
            : [];
        const rawStyle = typeof normalizedPlan.style === "string" ? normalizedPlan.style.trim() : undefined;
        const designTokens = normalizeDesignTokens(normalizedPlan.design_tokens, {
            use_case: normalizedPlan.use_case,
            style: normalizedPlan.style,
            animation: normalizedPlan.animation
        });

        const colorHintsRaw = normalizedPlan.color_hints;
        const colorHints = Array.isArray(colorHintsRaw)
            ? colorHintsRaw.filter(
                (hint): hint is { name: string; hex: string; role: "background" | "accent" | "general" } =>
                    typeof hint === "object" &&
                    hint !== null &&
                    typeof hint.name === "string" &&
                    typeof hint.hex === "string" &&
                    typeof hint.role === "string"
              )
            : [];

        if (objects.length === 0) {
            throw new Error("Scene plan must include at least one object");
        }
        if (objects.length > MAX_SCENE_PLAN_OBJECTS) {
            throw new Error(`Maximum ${MAX_SCENE_PLAN_OBJECTS} objects allowed`);
        }
        const scene = buildScene({
            ...normalizedPlan,
            objects,
            style: rawStyle || designTokens.theme,
            use_case: designTokens.use_case,
            animation: designTokens.animation,
            design_tokens: designTokens,
            color_hints: colorHints
        });

        return createToolResult({
            scene_data: scene,
            warnings: scene.notes ?? []
        });
    }
};
