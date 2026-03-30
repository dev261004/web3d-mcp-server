import { randomUUID } from "node:crypto";
import type { FastMCP } from "fastmcp";
import { z } from "zod";
import type { SceneData } from "../types/scene.types.js";
import type {
  AnimationEntry,
  AnimationType,
  ApplyAnimationErrorOutput,
  ApplyAnimationInput,
  ApplyAnimationOutput,
  ApplyAnimationSuccessOutput,
  ChannelConflict
} from "../types/apply-animation.types.js";
import {
  ANIMATION_DEFAULTS,
  detectChannelConflicts,
  materializeAnimationConfig,
  mergeAnimationConfig,
  normalizePulseConfig,
  normalizeAnimationType,
  resolveRotateSemantics,
  resolveTargetObject,
  resolveDefaultComplexity
} from "../utils/animation.utils.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export { resolveDefaultComplexity };

const ANIMATION_TYPE_VALUES = ["rotate", "float", "pulse", "bounce"] as const;

const APPLY_ANIMATION_DESCRIPTION = `Apply or stack animations on objects in an existing 3D scene.

Single animation (backward compatible):
  Provide animation_type (string) to apply one animation.
  Existing animation config fields are PRESERVED by default.
  Only missing fields are filled from defaults.

Stacked animations (new):
  Provide animations[] array to apply multiple animations at once.
  Each entry can target a different object and carry its own config.
  Compatible animations on the same object are merged safely.
  Channel conflicts (e.g. float + bounce both on position.y) are 
  detected and reported as warnings — not errors.

Config merge behavior (override field):
  override: false (default) — existing config fields win.
            Preserves range, speed, amplitude set by generate_scene.
  override: true  — incoming config fully replaces existing.

Rotate range semantics:
  range >= 3.14 → CONTINUOUS SPIN (robot.rotation.y = t * speed)
  range  < 3.14 → OSCILLATION     (robot.rotation.y = sin(t) * range)
  Default range for rotate is 6.28 (full continuous spin).

Merge flag:
  merge: true  (default) — new animations added alongside existing.
  merge: false — existing animations for same target+type replaced.
`;

const animationEntrySchema = z.object({
  type: z.enum(ANIMATION_TYPE_VALUES),
  target_id: z.string().optional(),
  config: z
    .object({
      speed: z.number().optional(),
      amplitude: z.number().optional(),
      range: z.number().optional(),
      axis: z.enum(["x", "y", "z"]).optional(),
      scale: z.number().optional(),
      scale_range: z.tuple([z.number(), z.number()]).optional(),
      _derived: z
        .object({
          scale: z.number().optional(),
          scale_range: z.tuple([z.number(), z.number()]).optional()
        })
        .partial()
        .optional()
    })
    .partial()
    .optional(),
  override: z.boolean().default(false)
});

const applyAnimationSchema = z.object({
  scene_data: z.any(),
  animation_type: z.enum(ANIMATION_TYPE_VALUES).optional(),
  animations: z.array(animationEntrySchema).optional(),
  merge: z.boolean().default(true)
});

function cloneScene(scene: SceneData): SceneData {
  return JSON.parse(JSON.stringify(scene)) as SceneData;
}

function normalizeScene(scene_data: unknown): SceneData {
  const unwrapped = unwrapToolPayload<SceneData>(scene_data, "scene_data");

  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    throw new Error("scene_data must be an object");
  }

  return cloneScene(unwrapped);
}

function isAnimationType(value: unknown): value is AnimationType {
  return typeof value === "string" && ANIMATION_TYPE_VALUES.includes(value as AnimationType);
}

function findMatchingAnimationIndexes(scene: SceneData, targetId: string, type: AnimationType) {
  const canonicalType = normalizeAnimationType(type);

  return (scene.animations ?? [])
    .map((animation, index) => ({ animation, index }))
    .filter(({ animation }) => {
      const animationTargetId =
        (typeof animation.target_id === "string" && animation.target_id) ||
        (typeof animation.target === "string" && animation.target) ||
        "";

      if (!isAnimationType(animation.type)) {
        return false;
      }

      return animationTargetId === targetId && normalizeAnimationType(animation.type) === canonicalType;
    })
    .map(({ index }) => index);
}

function sanitizeExistingConfig(config: unknown) {
  return mergeAnimationConfig((config ?? undefined) as any, {}, false);
}

function buildStoredConfig(type: AnimationType, config: ReturnType<typeof sanitizeExistingConfig>) {
  const canonicalType = normalizeAnimationType(type);

  if (canonicalType === "pulse") {
    return normalizePulseConfig(config);
  }

  if (canonicalType === "rotate") {
    return {
      speed: config.speed ?? ANIMATION_DEFAULTS.rotate.speed,
      axis: config.axis ?? ANIMATION_DEFAULTS.rotate.axis ?? "y",
      range: config.range ?? ANIMATION_DEFAULTS.rotate.range
    };
  }

  if (canonicalType === "float") {
    return {
      speed: config.speed ?? ANIMATION_DEFAULTS.float.speed,
      axis: config.axis ?? ANIMATION_DEFAULTS.float.axis ?? "y",
      amplitude: config.amplitude ?? ANIMATION_DEFAULTS.float.amplitude
    };
  }

  return {
    speed: config.speed ?? ANIMATION_DEFAULTS.bounce.speed,
    axis: config.axis ?? ANIMATION_DEFAULTS.bounce.axis ?? "y",
    amplitude: config.amplitude ?? ANIMATION_DEFAULTS.bounce.amplitude
  };
}

function buildError(scene_data: SceneData, error: string): ApplyAnimationErrorOutput {
  return {
    status: "ERROR",
    error,
    scene_data
  };
}

type ProcessContext = {
  scene: SceneData;
  merge: boolean;
  entry: AnimationEntry;
  conflictWarnings: ChannelConflict[];
};

function processAnimationEntry(context: ProcessContext): ApplyAnimationSuccessOutput["applied"][number] {
  const { scene, merge, entry, conflictWarnings } = context;
  const target = resolveTargetObject(scene, entry.target_id);

  if (!target) {
    throw new Error(
      entry.target_id
        ? `No object found for target_id "${entry.target_id}".`
        : "No target object available. scene_data.objects must contain at least one object."
    );
  }

  if (!Array.isArray(scene.animations)) {
    scene.animations = [];
  }

  const matchingIndexes = findMatchingAnimationIndexes(scene, target.target_id, entry.type);
  const firstMatchIndex = matchingIndexes[0];
  const existingAnimation = typeof firstMatchIndex === "number" ? scene.animations[firstMatchIndex] : undefined;
  const configBefore = existingAnimation ? sanitizeExistingConfig(existingAnimation.config) : null;
  const incomingConfig = materializeAnimationConfig(entry.type, entry.config);
  const mergedConfig = merge
    ? mergeAnimationConfig(configBefore ?? undefined, incomingConfig, entry.override ?? false)
    : mergeAnimationConfig(undefined, incomingConfig, true);
  const canonicalType = normalizeAnimationType(entry.type);
  const storedConfig = buildStoredConfig(entry.type, mergedConfig);
  const configAfter = canonicalType === "pulse" ? normalizePulseConfig(mergedConfig) : mergedConfig;
  const animationPayload = {
    id: existingAnimation && merge ? existingAnimation.id : randomUUID(),
    target: target.target_name,
    target_id: target.target_id,
    type: canonicalType,
    config: storedConfig,
    loop: true,
    ...(canonicalType === "rotate" && typeof storedConfig.range === "number"
      ? { resolved_semantics: resolveRotateSemantics(storedConfig.range) }
      : {})
  };

  let action: "added" | "merged" | "replaced" = "added";

  if (!merge) {
    if (matchingIndexes.length > 0) {
      scene.animations = scene.animations.filter((_, index) => !matchingIndexes.includes(index));
      action = "replaced";
    }

    scene.animations.push(animationPayload as SceneData["animations"][number]);
  } else if (existingAnimation && typeof firstMatchIndex === "number") {
    scene.animations[firstMatchIndex] = animationPayload as SceneData["animations"][number];
    action = "merged";
  } else {
    scene.animations.push(animationPayload as SceneData["animations"][number]);
    action = "added";
  }

  const warnings = conflictWarnings
    .filter((conflict) => {
      return (
        conflict.affected_target_id === target.target_id &&
        conflict.affected_types.includes(entry.type)
      );
    })
    .map((conflict) => conflict.message);

  return {
    animation_id: animationPayload.id,
    type: entry.type,
    target_id: target.target_id,
    target_name: target.target_name,
    action,
    config_before: configBefore,
    config_after: configAfter,
    ...(canonicalType === "rotate" && typeof storedConfig.range === "number"
      ? { resolved_semantics: resolveRotateSemantics(storedConfig.range) }
      : {}),
    override_used: entry.override ?? false,
    warnings
  };
}

export function buildApplyAnimationOutput(input: ApplyAnimationInput): ApplyAnimationOutput {
  const scene = cloneScene(input.scene_data);

  if (input.animation_type && input.animations) {
    return buildError(
      scene,
      "Provide either animation_type (single) or animations[] (stacked), not both."
    );
  }

  const entries: AnimationEntry[] = input.animations ?? (
    input.animation_type
      ? [
          {
            type: input.animation_type,
            override: false
          }
        ]
      : []
  );

  if (entries.length === 0) {
    return buildError(scene, "Provide animation_type or at least one entry in animations[].");
  }

  try {
    const resolvedEntries = entries.map((entry) => {
      const target = resolveTargetObject(scene, entry.target_id);

      if (!target) {
        throw new Error(
          entry.target_id
            ? `No object found for target_id "${entry.target_id}".`
            : "No target object available. scene_data.objects must contain at least one object."
        );
      }

      return {
        ...entry,
        target_id: target.target_id,
        target_name: target.target_name
      };
    });
    const channelConflicts = detectChannelConflicts(resolvedEntries);
    const applied = entries.map((entry) =>
      processAnimationEntry({
        scene,
        merge: input.merge ?? true,
        entry,
        conflictWarnings: channelConflicts
      })
    );

    return {
      status: "SUCCESS",
      applied,
      channel_conflicts: channelConflicts,
      summary: {
        total_applied: applied.length,
        added: applied.filter((item) => item.action === "added").length,
        merged: applied.filter((item) => item.action === "merged").length,
        replaced: applied.filter((item) => item.action === "replaced").length,
        had_conflicts: channelConflicts.length > 0
      },
      scene_data: scene
    };
  } catch (error) {
    return buildError(scene, error instanceof Error ? error.message : "Failed to apply animations.");
  }
}

export function registerApplyAnimationTool(server: FastMCP): void {
  server.addTool(applyAnimationTool);
}

export const applyAnimationTool = {
  name: "apply_animation",
  description: APPLY_ANIMATION_DESCRIPTION,
  parameters: applyAnimationSchema,

  async execute(input: z.infer<typeof applyAnimationSchema>) {
    const normalizedScene = normalizeScene(input.scene_data);

    return createToolResult(
      buildApplyAnimationOutput({
        scene_data: normalizedScene,
        animation_type: input.animation_type,
        animations: input.animations,
        merge: input.merge
      })
    );
  }
};
