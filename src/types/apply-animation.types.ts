import type { AnimationAxis, SceneData, SceneObject } from "./scene.types.js";

export type AnimationType = "rotate" | "float" | "pulse" | "bounce";
export type CanonicalAnimationType = "rotate" | "float" | "pulse" | "bounce";
export type AnimationChannel = "position.y" | "rotation.y" | "scale";

export interface AnimationConfig {
  speed?: number;
  amplitude?: number;
  range?: number;
  axis?: AnimationAxis;
  easing?: string;
  scale?: number;
  scale_range?: [number, number];
  _derived?: {
    scale?: number;
    scale_range?: [number, number];
  };
}

/**
 * Rotate semantics are derived from range:
 * - range >= Math.PI means a continuous spin
 * - range < Math.PI means an oscillating back-and-forth motion
 */
export enum RotateSemantics {
  CONTINUOUS = "continuous",
  OSCILLATION = "oscillation"
}

export type ChannelMap = Readonly<Record<AnimationType, AnimationChannel>>;

export interface ChannelConflict {
  type: "CHANNEL_CONFLICT";
  message: string;
  affected_types: string[];
  affected_target_id: string;
}

export interface AnimationEntry {
  type: AnimationType;
  target_id?: string;
  config?: Partial<AnimationConfig>;
  override?: boolean;
}

export interface AppliedAnimation {
  animation_id: string;
  type: AnimationType;
  target_id: string;
  target_name: string;
  action: "added" | "merged" | "replaced";
  config_before: AnimationConfig | null;
  config_after: AnimationConfig;
  resolved_semantics?: RotateSemantics;
  override_used: boolean;
  warnings: string[];
}

export interface ApplyAnimationInput {
  scene_data: SceneData;
  animation_type?: AnimationType;
  animations?: AnimationEntry[];
  merge?: boolean;
}

export interface ApplyAnimationSuccessOutput {
  status: "SUCCESS";
  applied: AppliedAnimation[];
  channel_conflicts: ChannelConflict[];
  summary: {
    total_applied: number;
    added: number;
    merged: number;
    replaced: number;
    had_conflicts: boolean;
  };
  scene_data: SceneData;
}

export interface ApplyAnimationErrorOutput {
  status: "ERROR";
  error: string;
  scene_data: SceneData;
}

export type ApplyAnimationOutput = ApplyAnimationSuccessOutput | ApplyAnimationErrorOutput;

export interface ResolvedAnimationTarget {
  target_id: string;
  target_name: string;
  object: SceneObject;
}
