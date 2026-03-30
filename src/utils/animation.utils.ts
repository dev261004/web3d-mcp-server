import { resolveDefaultComplexity } from "../lib/complexity.profiles.js";
import type { SceneData } from "../types/scene.types.js";
import type {
  AnimationConfig,
  AnimationEntry,
  AnimationType,
  CanonicalAnimationType,
  ChannelConflict,
  ChannelMap,
  ResolvedAnimationTarget,
  RotateSemantics
} from "../types/apply-animation.types.js";
import { RotateSemantics as RotateSemanticsEnum } from "../types/apply-animation.types.js";

export { resolveDefaultComplexity };

export const ANIMATION_DEFAULTS: Record<AnimationType, AnimationConfig> = {
  rotate: { speed: 0.4, axis: "y", range: 6.28 },
  float: { speed: 0.9, axis: "y", amplitude: 0.18 },
  bounce: { speed: 1.2, axis: "y", amplitude: 0.25 },
  pulse: {
    speed: 1.0,
    amplitude: 0.1,
    scale: 1.1,
    scale_range: [1, 1.1],
    _derived: {
      scale: 1.1,
      scale_range: [1, 1.1]
    }
  }
} as const;

export const CHANNEL_MAP: ChannelMap = {
  float: "position.y",
  bounce: "position.y",
  rotate: "rotation.y",
  pulse: "scale"
} as const;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidAxis(value: unknown): value is "x" | "y" | "z" {
  return value === "x" || value === "y" || value === "z";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidScaleRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isPositiveNumber(value[0]) &&
    isPositiveNumber(value[1]) &&
    value[1] >= value[0]
  );
}

function isDerivedConfig(
  value: unknown
): value is NonNullable<AnimationConfig["_derived"]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.scale === undefined || isPositiveNumber(record.scale)) &&
    (record.scale_range === undefined || isValidScaleRange(record.scale_range))
  );
}

export function normalizePulseConfig(config: Partial<AnimationConfig> = {}): AnimationConfig {
  const speed = isPositiveNumber(config.speed) ? config.speed : ANIMATION_DEFAULTS.pulse.speed ?? 1;
  const amplitude =
    isPositiveNumber(config.amplitude)
      ? config.amplitude
      : isValidScaleRange(config.scale_range)
        ? Math.max(config.scale_range[1] - config.scale_range[0], 0.001)
        : isPositiveNumber(config.scale)
          ? Math.max(config.scale - 1, 0.001)
          : ANIMATION_DEFAULTS.pulse.amplitude ?? 0.1;
  const derivedScaleRange = isValidScaleRange(config.scale_range)
    ? [config.scale_range[0], config.scale_range[1]] as [number, number]
    : isDerivedConfig(config._derived) && isValidScaleRange(config._derived.scale_range)
      ? [config._derived.scale_range[0], config._derived.scale_range[1]] as [number, number]
      : [1, Number((1 + amplitude).toFixed(4))] as [number, number];
  const derivedScale = isPositiveNumber(config.scale)
    ? config.scale
    : isDerivedConfig(config._derived) && isPositiveNumber(config._derived.scale)
      ? config._derived.scale
      : derivedScaleRange[1];

  return {
    speed,
    amplitude,
    scale: derivedScale,
    scale_range: derivedScaleRange,
    _derived: {
      scale: derivedScale,
      scale_range: derivedScaleRange
    }
  };
}

function getConfigScale(config: AnimationConfig | undefined) {
  if (isPositiveNumber(config?.scale)) {
    return config.scale;
  }

  if (isValidScaleRange(config?.scale_range)) {
    return config.scale_range[1];
  }

  return undefined;
}

function sanitizeIncomingConfig(config: Partial<AnimationConfig>): AnimationConfig {
  const sanitized: AnimationConfig = {};

  if (isPositiveNumber(config.speed)) {
    sanitized.speed = config.speed;
  }

  if (isPositiveNumber(config.amplitude)) {
    sanitized.amplitude = config.amplitude;
  }

  if (isPositiveNumber(config.range)) {
    sanitized.range = config.range;
  }

  if (isValidAxis(config.axis)) {
    sanitized.axis = config.axis;
  }

  if (isNonEmptyString(config.easing)) {
    sanitized.easing = config.easing.trim();
  }

  if (isPositiveNumber(config.scale)) {
    sanitized.scale = config.scale;
  }

  if (isValidScaleRange(config.scale_range)) {
    sanitized.scale_range = [config.scale_range[0], config.scale_range[1]];
  }

  if (isDerivedConfig(config._derived)) {
    sanitized._derived = {};

    if (isPositiveNumber(config._derived.scale)) {
      sanitized._derived.scale = config._derived.scale;
    }

    if (isValidScaleRange(config._derived.scale_range)) {
      sanitized._derived.scale_range = [config._derived.scale_range[0], config._derived.scale_range[1]];
    }
  }

  if (!sanitized.scale && sanitized.scale_range) {
    sanitized.scale = sanitized.scale_range[1];
  }

  if (!sanitized.scale_range && sanitized.scale) {
    sanitized.scale_range = [1, sanitized.scale];
  }

  if (!sanitized._derived && (sanitized.scale || sanitized.scale_range)) {
    sanitized._derived = {
      scale: sanitized.scale,
      scale_range: sanitized.scale_range
    };
  }

  return sanitized;
}

export function mergeAnimationConfig(
  existing: AnimationConfig | undefined,
  incoming: Partial<AnimationConfig>,
  override: boolean
): AnimationConfig {
  const sanitizedIncoming = sanitizeIncomingConfig(incoming);
  const source = override ? undefined : existing;
  const merged: AnimationConfig = {};

  merged.speed = isPositiveNumber(source?.speed) ? source.speed : sanitizedIncoming.speed;
  merged.amplitude = isPositiveNumber(source?.amplitude) ? source.amplitude : sanitizedIncoming.amplitude;
  merged.range = isPositiveNumber(source?.range) ? source.range : sanitizedIncoming.range;
  merged.axis = isValidAxis(source?.axis) ? source.axis : sanitizedIncoming.axis;
  merged.easing = isNonEmptyString(source?.easing) ? source.easing.trim() : sanitizedIncoming.easing;

  const existingScale = getConfigScale(source);
  const incomingScale = getConfigScale(sanitizedIncoming);
  const resolvedScale = (override ? undefined : existingScale) ?? incomingScale;

  if (resolvedScale) {
    merged.scale = resolvedScale;
    merged.scale_range =
      (override ? undefined : isValidScaleRange(source?.scale_range) ? [source.scale_range[0], source.scale_range[1]] : undefined) ??
      sanitizedIncoming.scale_range ??
      [1, resolvedScale];
    merged._derived = {
      scale: merged.scale,
      scale_range: merged.scale_range
    };
  }

  return merged;
}

/**
 * Rotate semantics are range-driven:
 * - range >= Math.PI means continuous spin
 * - range < Math.PI means oscillation
 */
export function resolveRotateSemantics(range: number): RotateSemantics {
  return range >= Math.PI ? RotateSemanticsEnum.CONTINUOUS : RotateSemanticsEnum.OSCILLATION;
}

export function normalizeAnimationType(type: AnimationType): CanonicalAnimationType {
  return type;
}

export function materializeAnimationConfig(
  type: AnimationType,
  config?: Partial<AnimationConfig>
): AnimationConfig {
  if (type === "pulse") {
    return normalizePulseConfig({
      ...(config ?? {}),
      speed: isPositiveNumber(config?.speed) ? config.speed : ANIMATION_DEFAULTS.pulse.speed,
      amplitude: isPositiveNumber(config?.amplitude) ? config.amplitude : ANIMATION_DEFAULTS.pulse.amplitude
    });
  }

  return sanitizeIncomingConfig({
    ...ANIMATION_DEFAULTS[type],
    ...(config ?? {})
  });
}

export function resolveTargetObject(
  scene_data: SceneData,
  target_id?: string
): ResolvedAnimationTarget | null {
  if (!Array.isArray(scene_data.objects) || scene_data.objects.length === 0) {
    return null;
  }

  const object =
    (target_id ? scene_data.objects.find((candidate) => candidate.id === target_id) : undefined) ??
    scene_data.objects[0];

  if (!object) {
    return null;
  }

  return {
    target_id: object.id,
    target_name: object.name || object.id,
    object
  };
}

export function detectChannelConflicts(
  entries: Array<AnimationEntry & { target_id: string; target_name: string }>
): ChannelConflict[] {
  const conflicts: ChannelConflict[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < entries.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < entries.length; compareIndex += 1) {
      const left = entries[index];
      const right = entries[compareIndex];

      if (left.target_id !== right.target_id) {
        continue;
      }

      if (CHANNEL_MAP[left.type] !== CHANNEL_MAP[right.type]) {
        continue;
      }

      if (left.type === right.type) {
        continue;
      }

      const key = [left.target_id, ...[left.type, right.type].sort()].join(":");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      conflicts.push({
        type: "CHANNEL_CONFLICT",
        message: `${left.type} and ${right.type} both target ${CHANNEL_MAP[left.type]} on object '${left.target_name}'. Only the last one applied will be visible.`,
        affected_types: [left.type, right.type],
        affected_target_id: left.target_id
      });
    }
  }

  return conflicts;
}
