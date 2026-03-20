import { v4 as uuidv4 } from "uuid";
import { createObject } from "./objectGenerator.js";
import { createAnimation } from "./animationEngine.js";
import { Animation, Light, SceneData, SceneObject } from "../types/scene.js";
import {
    BackgroundPresetToken,
    CompositionPresetToken,
    LightingPresetToken,
    normalizeDesignTokens
} from "../types/designTokens.js";

function getBackgroundColor(preset: BackgroundPresetToken) {
    switch (preset) {
        case "dark_studio":
            return "#0a0a0f";
        case "gradient_soft":
            return "#e8eefc";
        case "gradient_vivid":
            return "#101a32";
        case "light_clean":
        default:
            return "#f7f7f4";
    }
}

function createLightingRig(preset: LightingPresetToken): Light[] {
    switch (preset) {
        case "studio_dramatic":
            return [
                {
                    id: uuidv4(),
                    type: "ambient",
                    intensity: 0.35,
                    color: "#f6f1e8"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [2.5, 5, 1.5],
                    intensity: 1.4,
                    color: "#fff4dd"
                }
            ];
        case "ambient_bright":
            return [
                {
                    id: uuidv4(),
                    type: "ambient",
                    intensity: 0.85,
                    color: "#ffffff"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [1.5, 4, 2],
                    intensity: 0.9,
                    color: "#fff7f0"
                }
            ];
        case "neon_edge":
            return [
                {
                    id: uuidv4(),
                    type: "ambient",
                    intensity: 0.45,
                    color: "#cbe1ff"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [3, 4.5, 1],
                    intensity: 1.25,
                    color: "#74c0ff"
                }
            ];
        case "studio_soft":
        default:
            return [
                {
                    id: uuidv4(),
                    type: "ambient",
                    intensity: 0.6,
                    color: "#ffffff"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [2, 5, 2],
                    intensity: 1.1,
                    color: "#ffffff"
                }
            ];
    }
}

function createCamera(composition: CompositionPresetToken): SceneData["camera"] {
    if (composition === "product_closeup") {
        return {
            type: "perspective",
            position: [0, 1.4, 4.2],
            fov: 42,
            target: [0, 0, 0]
        };
    }

    if (composition === "floating_showcase") {
        return {
            type: "perspective",
            position: [0, 2.1, 5.5],
            fov: 48,
            target: [0, 0.2, 0]
        };
    }

    return {
        type: "perspective",
        position: [0, 2, 5],
        fov: 50,
        target: [0, 0, 0]
    };
}

export function buildScene(plan: any): SceneData {
    const sceneId = uuidv4();
    const designTokens = normalizeDesignTokens(plan?.design_tokens, {
        use_case: plan?.use_case,
        style: plan?.style,
        animation: plan?.animation
    });

    const objects: SceneObject[] = [];
    const animations: Animation[] = [];

    // 🧠 Generate objects
    if (plan.objects && Array.isArray(plan.objects)) {
        plan.objects.forEach((objName: string, index: number) => {
            if (["light", "particles", "glow"].includes(objName)) {
                return; // skip
            }
            const obj = createObject(
                objName,
                designTokens.theme,
                designTokens.material_preset,
                designTokens.composition,
                index
            );

            objects.push(obj);

            // Add animation to main object
            if (index === 0 && designTokens.animation !== "none") {
                const anim = createAnimation(obj.id, designTokens.animation);

                if (anim) animations.push(anim);
            }
        });
    }

    // 🧠 Default platform if missing
    if (!plan.objects || plan.objects.length === 0) {
        objects.push(
            createObject(
                "default_box",
                designTokens.theme,
                designTokens.material_preset,
                designTokens.composition,
                0
            )
        );
    }

    return {
        scene_id: sceneId,

        metadata: {
            title: "Generated Scene",
            use_case: designTokens.use_case,
            style: designTokens.theme,
            design_tokens: designTokens,
            created_at: new Date().toISOString()
        },

        environment: {
            background: {
                type: "color",
                value: getBackgroundColor(designTokens.background_preset)
            }
        },

        camera: createCamera(designTokens.composition),
        lighting: createLightingRig(designTokens.lighting_preset),

        objects,
        animations
    };
}
