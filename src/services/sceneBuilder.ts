import { v4 as uuidv4 } from "uuid";
import { createObject } from "./objectGenerator.js";
import { buildAnimations } from "./animationEngine.js";
import { Animation, Light, SceneData, SceneObject } from "../types/scene.js";
import {
    BackgroundPresetToken,
    CompositionPresetToken,
    LightingPresetToken,
    MaterialPresetToken,
    ThemeToken,
    normalizeDesignTokens
} from "../types/designTokens.js";
import type { ColorHint } from "./promptRefiner.js";

function normalizeStyleText(value?: string) {
    return typeof value === "string" ? value.toLowerCase() : "";
}

function getAccentColor(theme: ThemeToken, lightingPreset: LightingPresetToken) {
    if (lightingPreset === "neon_edge") {
        return "#00e5ff";
    }

    switch (theme) {
        case "premium":
            return "#c6924c";
        case "futuristic":
            return "#49d7ff";
        case "playful":
            return "#ff5cc8";
        case "dark":
            return "#7c86ff";
        case "minimal":
        default:
            return "#8ca4ff";
    }
}

function getBackgroundColor(
    preset: BackgroundPresetToken,
    theme: ThemeToken,
    lightingPreset: LightingPresetToken,
    materialPreset: MaterialPresetToken,
    rawStyle?: string,
    colorHints?: ColorHint[]
) {
    const normalizedStyle = normalizeStyleText(rawStyle);
    const favorsDeepBackdrop =
        lightingPreset === "neon_edge" ||
        theme === "futuristic" ||
        normalizedStyle.includes("cinematic") ||
        normalizedStyle.includes("fintech") ||
        materialPreset === "glass_frost";

    // If user specified background colors, prioritize them
    const backgroundHint = colorHints?.find((hint) => hint.role === "background");
    if (backgroundHint) {
        return backgroundHint.hex;
    }

    // If user specified any color hints and the theme is dark, use their accent color
    // as a dark background option
    const accentHint = colorHints?.find((hint) => hint.role === "accent");
    if (accentHint && (theme === "dark" || favorsDeepBackdrop)) {
        // Darken the accent color for background use
        return darkenColor(accentHint.hex, 0.7);
    }

    switch (preset) {
        case "dark_studio":
            return "#070b12";
        case "gradient_soft":
            return favorsDeepBackdrop ? "#081425" : "#dfe9fb";
        case "gradient_vivid":
            return lightingPreset === "neon_edge" ? "#07182d" : "#101a32";
        case "light_clean":
        default:
            return "#f7f7f4";
    }
}

function darkenColor(hex: string, factor: number): string {
    // Parse hex
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Apply darkening factor
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);

    // Ensure minimum darkness
    r = Math.max(r, 10);
    g = Math.max(g, 10);
    b = Math.max(b, 10);

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function createLightingRig(
    preset: LightingPresetToken,
    theme: ThemeToken,
    materialPreset: MaterialPresetToken,
    rawStyle?: string
): Light[] {
    const accentColor = getAccentColor(theme, preset);
    const highlightColor = materialPreset === "glass_frost" ? "#f5fbff" : "#ffffff";
    const fillColor = preset === "neon_edge" ? "#7cf7ff" : accentColor;

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
                },
                {
                    id: uuidv4(),
                    type: "directional",
                    position: [-3.2, 2.6, 2.4],
                    intensity: normalizeStyleText(rawStyle).includes("cinematic") ? 0.78 : 0.58,
                    color: materialPreset === "glass_frost" ? "#d7ecff" : "#f4dcc0"
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
                    intensity: 0.24,
                    color: "#d9ecff"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [-3.8, 2.6, 2.4],
                    intensity: 1.08,
                    color: "#00e5ff"
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [3.4, 4.8, -1.1],
                    intensity: 0.92,
                    color: "#34d399"
                },
                {
                    id: uuidv4(),
                    type: "directional",
                    position: [2.8, 3.2, 2.8],
                    intensity: 0.46,
                    color: materialPreset === "glass_frost" ? highlightColor : fillColor
                }
            ];
        case "studio_soft":
        default:
            return [
                {
                    id: uuidv4(),
                    type: "ambient",
                    intensity: 0.6,
                    color: highlightColor
                },
                {
                    id: uuidv4(),
                    type: "spot",
                    position: [2, 5, 2],
                    intensity: 1.1,
                    color: materialPreset === "glass_frost" ? "#eef6ff" : "#ffffff"
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
    const rawStyle = typeof plan?.style === "string" ? plan.style : undefined;
    const colorHints = Array.isArray(plan?.color_hints) ? plan.color_hints : [];

    const objects: SceneObject[] = [];
    const notes: string[] = [];

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
                designTokens.lighting_preset,
                designTokens.composition,
                index,
                rawStyle
            );

            objects.push(obj);

            if (obj.asset && obj.asset_confirmed === false) {
                notes.push(`Procedural fallback will be used for ${obj.name || obj.asset} because ${obj.asset} is not confirmed.`);
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
                designTokens.lighting_preset,
                designTokens.composition,
                0,
                rawStyle
            )
        );
    }
    const animations: Animation[] = buildAnimations(objects, designTokens.animation, {
        accentPulse: designTokens.lighting_preset === "neon_edge" || rawStyle?.toLowerCase().includes("neon") === true
    });

    return {
        scene_id: sceneId,
        notes,

        metadata: {
            title: "Generated Scene",
            use_case: designTokens.use_case,
            style: rawStyle || designTokens.theme,
            design_tokens: designTokens,
            created_at: new Date().toISOString()
        },

        environment: {
            background: {
                type: "color",
                value: getBackgroundColor(
                    designTokens.background_preset,
                    designTokens.theme,
                    designTokens.lighting_preset,
                    designTokens.material_preset,
                    rawStyle,
                    colorHints
                )
            }
        },

        camera: createCamera(designTokens.composition),
        lighting: createLightingRig(
            designTokens.lighting_preset,
            designTokens.theme,
            designTokens.material_preset,
            rawStyle
        ),

        objects,
        animations
    };
}
