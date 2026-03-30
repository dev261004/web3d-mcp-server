import type { ObjectCategory } from "../lib/objectCategories.js";
import type { ComplexityTier } from "../lib/complexity.profiles.js";

export type SynthesisStatus = "SYNTHESIS_REQUIRED" | "SUCCESS";

export interface SynthesisConstraints {
  geometryOnly: string;
  boundingBox: string;
  minParts: string;
  materialsAllowed: string;
  materialInstructions: string;
  noExternalAssets: string;
  refRequirement: string;
  returnFormat: string;
  assemblyHint: string;
  styleHint: string;
  accentColorHint: string;
}

export interface SynthesisContract {
  __type: "SYNTHESIS_REQUIRED";
  object_id: string;
  object_name: string;
  category: ObjectCategory;
  bounding_box: [number, number, number];
  complexity_tier: ComplexityTier;
  min_parts: number;
  max_parts: number | null;
  complexity_hint: ComplexityTier;
  lod_note: string;
  style: string;
  material_preset: string;
  base_color: string;
  accent_color: string;
  constraints: SynthesisConstraints;
  inject_into_tool: "generate_r3f_code";
  inject_as_parameter: "synthesized_components";
  parameter_format: string;
}

export interface SynthesisInstruction {
  object_id: string;
  object_name: string;
  category: string;
  bounding_box: [number, number, number];
  complexity_tier: ComplexityTier;
  min_parts: number;
  max_parts: number | null;
  complexity_hint: ComplexityTier;
  lod_note: string;
  constraints: SynthesisConstraints;
  expected_output: {
    component_name: string;
    format: string;
    example_signature: string;
  };
}

export interface ResumeInstructions {
  tool: "generate_r3f_code";
  call_with: {
    scene_data: string;
    framework: string;
    typing: string;
    synthesized_components: Record<string, string>;
  };
  note: string;
}

export interface SynthesisRequiredOutput {
  status: "SYNTHESIS_REQUIRED";
  message: string;
  objects_needing_synthesis: SynthesisInstruction[];
  resume_instructions: ResumeInstructions;
}

export interface AssembledR3FOutput {
  status: "SUCCESS";
  r3f_code: string;
  language: "tsx" | "jsx";
  framework: string;
  synthesized_object_count: number;
  placeholder_object_count?: number;
  warning?: string;
  scene_id: string;
}

export interface PartialR3FOutput {
  status: "PARTIAL";
  warning: string;
  r3f_code: string;
  language: "tsx" | "jsx";
  framework: string;
  scene_id: string;
  error?: string;
  hint?: string;
}

export interface ErrorR3FOutput {
  status: "ERROR";
  error: string;
  hint: string;
  scene_id: string | null;
}

export type GenerateR3FResult =
  | SynthesisRequiredOutput
  | AssembledR3FOutput
  | PartialR3FOutput
  | ErrorR3FOutput;
