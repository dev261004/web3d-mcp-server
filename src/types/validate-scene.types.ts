export type Vector3 = [number, number, number];

export interface ColorHint {
  name?: string;
  hex?: string;
  role?: "background" | "accent" | "general" | string;
}

export interface Material {
  type?: string;
  color?: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flatShading?: boolean;
  envMapIntensity?: number;
}

export interface SynthesisContractRef {
  __type?: string;
  [key: string]: unknown;
}

export interface SceneObject {
  id?: string;
  type?: string;
  name?: string;
  shape?: string;
  synthesis_contract?: SynthesisContractRef;
  position?: unknown;
  rotation?: unknown;
  scale?: unknown;
  material?: Material;
  render_hints?: Record<string, unknown>;
}

export interface Light {
  id?: string;
  type?: "ambient" | "spot" | "directional" | "point" | string;
  intensity?: number;
  color?: string;
  position?: unknown;
}

export interface AnimationConfig {
  amplitude?: number;
  speed?: number;
  axis?: string;
  range?: number;
  scale_range?: [number, number];
  [key: string]: unknown;
}

export interface Animation {
  id?: string;
  target?: string;
  target_id?: string;
  type?: "float" | "rotate" | "pulse" | "bounce" | string;
  config?: AnimationConfig;
  loop?: boolean;
}

export interface SceneData {
  scene_id?: string;
  notes?: string[];
  metadata?: {
    title?: string;
    use_case?: string;
    style?: string;
    design_tokens?: Record<string, unknown>;
    color_hints?: ColorHint[];
    created_at?: string;
  };
  environment?: {
    background?: {
      type?: string;
      value?: string;
    };
  };
  camera?: {
    type?: string;
    position?: unknown;
    fov?: number;
    target?: unknown;
  };
  lighting?: Light[];
  objects?: SceneObject[];
  animations?: Animation[];
}

export const SEVERITY_VALUES = ["error", "warn", "info"] as const;
export type Severity = typeof SEVERITY_VALUES[number];

export const RULE_STATUS_VALUES = ["pass", "fail"] as const;
export type RuleStatus = typeof RULE_STATUS_VALUES[number];

export interface ValidationResult {
  rule_id: string;
  rule_name: string;
  severity: Severity;
  status: RuleStatus;
  message: string | null;
  fix_hint: string | null;
  affected: string[] | null;
  promoted?: boolean;
  original_severity?: Severity;
}

export type Validator = (scene_data: SceneData) => ValidationResult | null;

export interface ValidateSceneOutput {
  validation_id: string;
  scene_id: string;
  validated_at: string;
  strict_mode: boolean;
  is_valid: boolean;
  summary: {
    total_rules_run: number;
    passed: number;
    warnings: number;
    errors: number;
    promoted_to_error: number;
    blocked: boolean;
  };
  results: ValidationResult[];
  errors_detail: Array<{
    rule_id: string;
    message: string;
    fix_hint: string;
  }>;
  next_step: string;
}
