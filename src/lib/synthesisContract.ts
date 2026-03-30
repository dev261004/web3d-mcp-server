import {
  buildAssemblyHint,
  detectCategory,
  getBoundingBox
} from "./objectCategories.js";
import {
  COMPLEXITY_PROFILES,
  resolveDefaultComplexity,
  type ComplexityTier,
  type SynthesisTarget
} from "./complexity.profiles.js";
import type { SynthesisContract } from "../types/synthesis.types.js";

export function buildSynthesisContract(params: {
  objectId: string;
  objectName: string;
  style: string;
  materialPreset: string;
  baseColor: string;
  accentColor: string;
  complexity?: ComplexityTier;
  useCase?: string;
  composition?: string;
  target?: SynthesisTarget;
}): SynthesisContract {
  const category = detectCategory(params.objectName);
  const complexityTier = resolveContractComplexity(params);
  const profile = COMPLEXITY_PROFILES[complexityTier];
  const boundingBox = getBoundingBox(category, complexityTier);
  const materialInstructions = buildMaterialInstructions(
    params.materialPreset,
    params.baseColor,
    params.accentColor,
    complexityTier,
    profile.material_rule
  );

  return {
    __type: "SYNTHESIS_REQUIRED",
    object_id: params.objectId,
    object_name: params.objectName,
    category,
    bounding_box: boundingBox,
    complexity_tier: complexityTier,
    min_parts: profile.min_parts,
    max_parts: Number.isFinite(profile.max_parts) ? profile.max_parts : null,
    complexity_hint: profile.complexity_hint,
    lod_note: profile.lod_note,
    style: params.style,
    material_preset: params.materialPreset,
    base_color: params.baseColor,
    accent_color: params.accentColor,
    constraints: {
      geometryOnly: `Use ONLY these Three.js geometries: ${profile.allowed_geometries.join(", ")}. No custom buffer geometries.`,
      boundingBox: `All meshes must fit within a bounding box of ${boundingBox[0]}w x ${boundingBox[1]}h x ${boundingBox[2]}d units, centered at world origin [0,0,0].`,
      minParts: Number.isFinite(profile.max_parts)
        ? `The group MUST contain between ${profile.min_parts} and ${profile.max_parts} distinct <mesh> elements. A single mesh or box is never acceptable.`
        : `The group MUST contain at least ${profile.min_parts} distinct <mesh> elements. A single mesh or box is never acceptable.`,
      materialsAllowed:
        "Use only: meshPhysicalMaterial (for metal/glass), meshStandardMaterial (for matte/emissive/neon). No ShaderMaterial, no RawShaderMaterial.",
      materialInstructions,
      noExternalAssets:
        "NO useGLTF, NO useLoader, NO external URLs, NO asset imports of any kind. All geometry must be 100% procedural JSX.",
      refRequirement:
        "The root <group> element MUST accept a forwarded ref: use React.forwardRef and apply the ref to the root <group ref={ref}>.",
      returnFormat:
        "Return ONLY the JSX - a single React.forwardRef component. No import statements. No export statements. No markdown. No explanation. Just the raw JSX starting with: const ComponentName = React.forwardRef((",
      assemblyHint: buildAssemblyHint(category, complexityTier),
      styleHint: `Visual style is "${params.style}". Reflect this in proportions, details, and material choices. Futuristic = sharp angles + neon accents. Premium = smooth + chrome. Playful = rounded + bright colors. Minimal = clean + simple forms.`,
      accentColorHint: complexityTier === "low"
        ? `Primary accent color is ${params.accentColor}. Use it on at most 1 non-emissive accent surface. Do not add glow, emissive joints, or neon highlights at this tier.`
        : complexityTier === "medium"
          ? `Primary accent color is ${params.accentColor}. Use it on up to 3 accent elements. Emissive highlights are allowed for eyes, chest core, or 1 joint only.`
          : `Primary accent color is ${params.accentColor}. Use it on emissive elements, glowing joints, edge highlights, or neon details via meshStandardMaterial with emissive="${params.accentColor}" and emissiveIntensity between 2 and 5.`
    },
    inject_into_tool: "generate_r3f_code",
    inject_as_parameter: "synthesized_components",
    parameter_format: `{ "${params.objectId}": "<raw JSX string of the forwardRef component>" }`
  };
}

function buildMaterialInstructions(
  materialPreset: string,
  baseColor: string,
  accentColor: string,
  complexityTier: ComplexityTier,
  materialRule: string
): string {
  const presets: Record<string, string> = {
    metal_chrome: `Use meshPhysicalMaterial with color="${baseColor}", metalness={1}, roughness={0.04}, envMapIntensity={2.2} for primary surfaces.`,
    metal_brushed: `Use meshPhysicalMaterial with color="${baseColor}", metalness={0.85}, roughness={0.35} for primary surfaces.`,
    glass_clear: `Use meshPhysicalMaterial with color="${baseColor}", transmission={0.96}, roughness={0.02}, ior={1.5}, thickness={0.5} for glass surfaces. Structural elements use meshPhysicalMaterial with metalness={0.8}, roughness={0.1}.`,
    glass_frost: `Use meshPhysicalMaterial with color="${baseColor}", transmission={0.75}, roughness={0.35}, ior={1.4}, thickness={0.3} for frosted glass. Frame and structure use meshPhysicalMaterial with metalness={0.6}.`,
    matte_soft: `Use meshStandardMaterial with color="${baseColor}", roughness={0.85}, metalness={0} for matte surfaces.`,
    plastic_gloss: `Use meshStandardMaterial with color="${baseColor}", roughness={0.15}, metalness={0.1} for glossy plastic.`
  };

  const baseInstruction = (
    presets[materialPreset] ||
    `Use meshStandardMaterial with color="${baseColor}", roughness={0.5} for primary surfaces.`
  );
  const accentInstruction = complexityTier === "low"
    ? `Accent elements use meshStandardMaterial with color="${accentColor}" only. Do not use emissive materials.`
    : complexityTier === "medium"
      ? `Accent emissive is allowed on up to 3 elements using meshStandardMaterial with emissive="${accentColor}" and emissiveIntensity between 1.5 and 3.`
      : `Accent emissive is allowed on full-detail hero elements using meshStandardMaterial with emissive="${accentColor}" and emissiveIntensity between 2 and 5.`;

  return `${baseInstruction} ${accentInstruction} Complexity rule: ${materialRule}`;
}

function resolveContractComplexity(params: {
  complexity?: ComplexityTier;
  useCase?: string;
  composition?: string;
  target?: SynthesisTarget;
}) {
  if (params.complexity) {
    return params.complexity;
  }

  if (
    typeof params.useCase === "string" ||
    typeof params.composition === "string" ||
    typeof params.target === "string"
  ) {
    return resolveDefaultComplexity(params.useCase, params.composition, params.target);
  }

  return "high";
}
