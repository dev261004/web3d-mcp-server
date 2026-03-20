import { v4 as uuidv4 } from "uuid";
import { createObject } from "./objectGenerator.js";
import { createAnimation } from "./animationEngine.js";
import { Animation, SceneData, SceneObject } from "../types/scene.js";

export function buildScene(plan: any): SceneData {
    const sceneId = uuidv4();

    const objects: SceneObject[] = [];
    const animations: Animation[] = [];

    // 🧠 Generate objects
    if (plan.objects && Array.isArray(plan.objects)) {
        plan.objects.forEach((objName: string, index: number) => {
            if (["light", "particles", "glow"].includes(objName)) {
                return; // skip
            }
            const obj = createObject(objName, plan.style || "default", index);

            objects.push(obj);

            // Add animation to main object
            if (index === 0 && plan.animation) {
                const anim = createAnimation(obj.id, plan.animation);

                if (anim) animations.push(anim);
            }
        });
    }

    // 🧠 Default platform if missing
    if (!plan.objects || plan.objects.length === 0) {
        objects.push(
            createObject("default_box", "default", 0)
        );
    }

    return {
        scene_id: sceneId,

        metadata: {
            title: "Generated Scene",
            use_case: plan.use_case || "general",
            style: plan.style || "default",
            created_at: new Date().toISOString()
        },

        environment: {
            background: {
                type: "color",
                value: plan.style === "dark" || plan.style === "premium" ? "#0a0a0a" : "#ffffff"
            }
        },

        camera: {
            type: "perspective",
            position: [0, 2, 5],
            fov: 50,
            target: [0, 0, 0]
        },

        lighting: [
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
                intensity: 1.2,
                color: "#ffffff"
            }
        ],

        objects,
        animations
    };
}
