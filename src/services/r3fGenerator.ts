import {
  buildCacheKey,
  getCachedGeometry,
  setCachedGeometry
} from "../lib/synthesisCache.js";
import {
  Animation,
  Material,
  PrimitiveShape,
  SceneData,
  SceneObject
} from "../types/scene.types.js";
import {
  AssembledR3FOutput,
  GenerateR3FResult,
  SynthesisContract,
  SynthesisRequiredOutput
} from "../types/synthesis.types.js";

export type R3FTypingMode = "none" | "typescript" | "prop-types";
export type R3FFramework = "nextjs" | "vite" | "plain";

export interface GenerateR3FOptions {
  typing?: R3FTypingMode;
  framework?: R3FFramework;
  synthesized_components?: Record<string, string>;
}

type MaterialCategory = "transmission" | "physical" | "emissive" | "standard";

type SynthesizedComponentEntry = {
  objectId: string;
  object: SceneObject;
  componentName: string;
  refName: string;
  definitionBlock: string;
};

function classifyMaterial(material: Material): MaterialCategory {
  if (
    material.type === "glass" ||
    (typeof material.transmission === "number" && material.transmission > 0)
  ) {
    return "transmission";
  }

  if (
    material.type === "metal" ||
    (typeof material.metalness === "number" && material.metalness >= 0.8)
  ) {
    return "physical";
  }

  if (
    typeof material.emissiveIntensity === "number" &&
    material.emissiveIntensity > 0.5
  ) {
    return "emissive";
  }

  return "standard";
}

function sceneUsesTransmission(scene: SceneData): boolean {
  return scene.objects.some((object) => {
    return classifyMaterial(object.material) === "transmission";
  });
}

function isPrimitiveShape(shape: SceneObject["shape"]): shape is PrimitiveShape {
  return shape === "box" || shape === "sphere" || shape === "cylinder";
}

function isSynthesisObject(object: SceneObject): object is SceneObject & {
  type: "synthesis_contract";
  shape: "SYNTHESIS_REQUIRED";
  synthesis_contract: SynthesisContract;
} {
  return object.type === "synthesis_contract" && object.shape === "SYNTHESIS_REQUIRED" && Boolean(object.synthesis_contract);
}

function getAnimatedObjectIdSet(objects: SceneObject[], animations: Animation[]) {
  const animatedIds = new Set<string>();

  for (const object of objects) {
    const isAnimated = animations.some((animation) => {
      return (
        animation.target_id === object.id ||
        animation.target === object.id ||
        animation.target === object.name
      );
    });

    if (isAnimated) {
      animatedIds.add(object.id);
    }
  }

  return animatedIds;
}

function buildRefNameMap(objects: SceneObject[]) {
  const usedNames = new Set<string>();
  const refNames = new Map<string, string>();

  for (const [index, object] of objects.entries()) {
    const rawName = object.name?.trim() || object.id || `object${index + 1}`;
    const pascalName = toPascalCase(rawName);
    const camelBase = pascalName ? `${pascalName.charAt(0).toLowerCase()}${pascalName.slice(1)}` : `object${index + 1}`;
    const identifierBase = /^[A-Za-z_$]/.test(camelBase) ? camelBase : `object${index + 1}`;
    let refName = `${identifierBase}Ref`;
    let suffix = 2;

    while (usedNames.has(refName)) {
      refName = `${identifierBase}${suffix}Ref`;
      suffix += 1;
    }

    usedNames.add(refName);
    refNames.set(object.id, refName);
  }

  return refNames;
}

function getRefNameForObject(object: SceneObject, refNameMap: Map<string, string>) {
  return refNameMap.get(object.id) ?? "objectRef";
}

function getAxisBaseValue(values: number[], axis: "x" | "y" | "z") {
  if (axis === "x") {
    return values[0];
  }

  if (axis === "y") {
    return values[1];
  }

  return values[2];
}

function resolveSegmentCount(object: SceneObject) {
  if (!isPrimitiveShape(object.shape)) {
    return 1;
  }

  if (object.shape === "sphere") {
    return object.render_hints?.segment_count ?? 64;
  }

  if (object.shape === "cylinder") {
    return object.render_hints?.segment_count ?? 48;
  }

  return object.render_hints?.segment_count ?? 1;
}

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);

  return code
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

function isVector3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function getSafeVector3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  return isVector3(value) ? value : fallback;
}

function buildMaterialJsx(material: Material, extraIndent = 0): string {
  const category = classifyMaterial(material);
  const pad = " ".repeat(extraIndent);

  switch (category) {
    case "transmission": {
      const props = [
        `color="${material.color}"`,
        `transmission={${material.transmission ?? 0.85}}`,
        `roughness={${material.roughness ?? 0.1}}`,
        `thickness={0.5}`,
        `chromaticAberration={0.03}`,
        `anisotropy={0.1}`,
        `distortion={0.0}`,
        `distortionScale={0.3}`,
        `temporalDistortion={0.0}`
      ];

      if (typeof material.metalness === "number") {
        props.push(`metalness={${material.metalness}}`);
      }

      if (typeof material.envMapIntensity === "number") {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0.3}}`);
      }

      return `${pad}<MeshTransmissionMaterial\n${props.map((prop) => `${pad}  ${prop}`).join("\n")}\n${pad}/>`;
    }

    case "physical": {
      const props = [
        `color="${material.color}"`,
        `metalness={${material.metalness ?? 1}}`,
        `roughness={${material.roughness ?? 0.05}}`
      ];

      if (typeof material.envMapIntensity === "number") {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0}}`);
      }

      if (material.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshPhysicalMaterial ${props.join(" ")} />`;
    }

    case "emissive": {
      const props = [
        `color="${material.color}"`,
        `metalness={${material.metalness ?? 0.2}}`,
        `roughness={${material.roughness ?? 0.1}}`,
        `emissive="${material.emissive || material.color}"`,
        `emissiveIntensity={${material.emissiveIntensity ?? 1}}`
      ];

      if (typeof material.envMapIntensity === "number") {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }

    case "standard":
    default: {
      const props = [`color="${material.color}"`];

      if (typeof material.metalness === "number") {
        props.push(`metalness={${material.metalness}}`);
      }

      if (typeof material.roughness === "number") {
        props.push(`roughness={${material.roughness}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0}}`);
      }

      if (typeof material.envMapIntensity === "number") {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }
  }
}

function buildEmissiveGlowLight(object: SceneObject): string {
  if (classifyMaterial(object.material) !== "emissive") {
    return "";
  }

  const glowColor = object.material.emissive || object.material.color;
  const intensity = Math.min((object.material.emissiveIntensity ?? 1) * 0.4, 1.5);
  const [x, y, z] = getSafeVector3(object.position, [0, 0, 0]);

  return `      <pointLight position={[${x}, ${y}, ${z}]} color="${glowColor}" intensity={${intensity.toFixed(2)}} distance={3} decay={2} />`;
}

function buildAnimationHooks(
  objects: SceneObject[],
  animations: Animation[],
  refNameMap: Map<string, string>
) {
  return animations
    .map((animation) => {
      const targetObject = objects.find((object) => {
        return (
          animation.target_id === object.id ||
          animation.target === object.id ||
          animation.target === object.name
        );
      });

      if (!targetObject) {
        return "";
      }

      const refName = getRefNameForObject(targetObject, refNameMap);
      const basePosition = getSafeVector3(targetObject.position, [0, 0, 0]);
      const baseRotation = getSafeVector3(targetObject.rotation, [0, 0, 0]);
      const baseScale = getSafeVector3(targetObject.scale, [1, 1, 1]);

      if (animation.type === "float" && "amplitude" in animation.config) {
        return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(basePosition, animation.config.axis)} + Math.sin(t) * ${animation.config.amplitude};
  });`;
      }

      if (animation.type === "rotate" && "range" in animation.config) {
        const isContinuous =
          animation.resolved_semantics === "continuous" ||
          animation.config.range >= Math.PI;
        const axis = animation.config.axis;
        const speed = animation.config.speed;
        const range = animation.config.range;
        const baseRotationValue = getAxisBaseValue(baseRotation, axis);

        if (isContinuous) {
          return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime();
    ${refName}.current.rotation.${axis} = ${baseRotationValue} + t * ${speed};
  });`;
        }

        return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${speed};
    ${refName}.current.rotation.${axis} = ${baseRotationValue} + Math.sin(t) * ${range};
  });`;
      }

      if (animation.type === "bounce" && "amplitude" in animation.config) {
        return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(basePosition, animation.config.axis)} + Math.abs(Math.sin(t)) * ${animation.config.amplitude};
  });`;
      }

      if (animation.type === "pulse" && "scale_range" in animation.config) {
        const [minScale, maxScale] = animation.config.scale_range;
        const scaleDelta = maxScale - minScale;

        return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    const pulseScale = ${minScale} + ((Math.sin(t) + 1) / 2) * ${scaleDelta};
    ${refName}.current.scale.set(
      ${baseScale[0]} * pulseScale,
      ${baseScale[1]} * pulseScale,
      ${baseScale[2]} * pulseScale
    );
  });`;
      }

      if (animation.type === "pulse" && "scale" in animation.config) {
        const maxScale = animation.config.scale ?? 1.1;
        const minScale = 1;
        const scaleDelta = maxScale - minScale;

        return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    const pulseScale = ${minScale} + ((Math.sin(t) + 1) / 2) * ${scaleDelta};
    ${refName}.current.scale.set(
      ${baseScale[0]} * pulseScale,
      ${baseScale[1]} * pulseScale,
      ${baseScale[2]} * pulseScale
    );
  });`;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildLightingJsx(scene: SceneData) {
  return scene.lighting
    .map((light) => {
      if (light.type === "ambient") {
        return `      <ambientLight intensity={${light.intensity}} color="${light.color}" />`;
      }

      if (light.type === "directional") {
        return `      <directionalLight position={${JSON.stringify(light.position || [3, 4, 2])}} intensity={${light.intensity}} color="${light.color}" />`;
      }

      if (light.type === "spot") {
        return `      <spotLight position={${JSON.stringify(light.position || [2, 5, 2])}} intensity={${light.intensity}} color="${light.color}" />`;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildGeometryJsx(shape: PrimitiveShape, segmentCount: number, padSpaces: number): string {
  const pad = " ".repeat(padSpaces);
  const roundedSegments = Math.max(1, Math.round(segmentCount));

  if (shape === "sphere") {
    const widthSegments = Math.max(8, roundedSegments);
    const heightSegments = Math.max(6, Math.round(widthSegments / 2));
    return `${pad}<sphereGeometry args={[1, ${widthSegments}, ${heightSegments}]} />`;
  }

  if (shape === "cylinder") {
    const radialSegments = Math.max(8, roundedSegments);
    return `${pad}<cylinderGeometry args={[0.65, 0.65, 1.6, ${radialSegments}]} />`;
  }

  return `${pad}<boxGeometry args={[1, 1, 1, ${roundedSegments}, ${roundedSegments}, ${roundedSegments}]} />`;
}

function toPascalCase(value: string) {
  const segments = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  if (segments.length === 0) {
    return "SynthesizedObject";
  }

  return segments.join("");
}

function toPlaceholderToken(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "OBJECT";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractForwardRefComponentName(jsxString: string) {
  const match = jsxString.trim().match(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*React\.forwardRef\b/);

  return match?.[1] ?? null;
}

function ensureComponentDisplayName(componentCode: string, componentName: string) {
  const displayNamePattern = new RegExp(`\\b${escapeRegex(componentName)}\\.displayName\\s*=`);

  if (displayNamePattern.test(componentCode)) {
    return componentCode;
  }

  return `${componentCode}\n${componentName}.displayName = "${componentName}";`;
}

function buildSynthesizedComponentEntries(
  scene: SceneData,
  synthesizedComponents: Record<string, string>,
  refNameMap: Map<string, string>
) {
  const entries: SynthesizedComponentEntry[] = [];
  const warnings: string[] = [];

  for (const [objectId, jsxString] of Object.entries(synthesizedComponents)) {
    const object = scene.objects.find((entry) => entry.id === objectId);

    if (!object) {
      warnings.push(`// Warning: synthesized component [${objectId}] has no matching object in scene_data; skipped.`);
      continue;
    }

    const trimmed = jsxString.trim();
    const extractedComponentName = extractForwardRefComponentName(trimmed);
    const componentName = extractedComponentName ?? `${toPascalCase(object.name ?? object.id)}Geometry`;
    const definitionBody = extractedComponentName
      ? ensureComponentDisplayName(trimmed, componentName)
      : `// Warning: synthesized component [${objectId}] does not start with "const "; emitted as-is for debugging.\n${trimmed}`;

    entries.push({
      objectId,
      object,
      componentName,
      refName: getRefNameForObject(object, refNameMap),
      definitionBlock: `// Auto-synthesized geometry for: ${object.name ?? object.id}\n${definitionBody}`
    });
  }

  return {
    entries,
    warningComments: warnings,
    entryByObjectId: new Map(entries.map((entry) => [entry.objectId, entry]))
  };
}

function buildSceneGraph(
  scene: SceneData,
  synthesizedComponents: Map<string, SynthesizedComponentEntry>,
  animatedObjectIds: Set<string>,
  refNameMap: Map<string, string>
) {
  return scene.objects
    .map((object) => {
      const synthesizedEntry = synthesizedComponents.get(object.id);
      const refName = synthesizedEntry
        ? synthesizedEntry.refName
        : animatedObjectIds.has(object.id)
          ? getRefNameForObject(object, refNameMap)
          : null;
      const refProp = refName ? `ref={${refName}} ` : "";
      const position = `position={${JSON.stringify(getSafeVector3(object.position, [0, 0, 0]))}}`;
      const rotation = `rotation={${JSON.stringify(getSafeVector3(object.rotation, [0, 0, 0]))}}`;
      const scale = `scale={${JSON.stringify(getSafeVector3(object.scale, [1, 1, 1]))}}`;

      if (synthesizedEntry) {
        const lines = [
          `      <${synthesizedEntry.componentName} ${refProp}${position} ${rotation} ${scale} />`
        ];
        const glowLight = buildEmissiveGlowLight(object);

        if (glowLight) {
          lines.push(glowLight);
        }

        return lines.join("\n");
      }

      if (object.type === "primitive" && isPrimitiveShape(object.shape)) {
        const lines = [
          `      <mesh ${refProp}${position} ${rotation} ${scale}>`,
          buildGeometryJsx(object.shape, resolveSegmentCount(object), 8),
          buildMaterialJsx(object.material, 8),
          "      </mesh>"
        ];
        const glowLight = buildEmissiveGlowLight(object);

        if (glowLight) {
          lines.push(glowLight);
        }

        return lines.join("\n");
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildImports(
  hasAnimations: boolean,
  hasTransmission: boolean,
  hasRefs: boolean,
  typing: R3FTypingMode
) {
  const reactImports = ["Suspense"];

  if (hasRefs) {
    reactImports.push("useRef");
  }

  const fiberImports = ["Canvas"];
  if (hasAnimations) {
    fiberImports.push("useFrame");
  }

  const dreiImports = ["Environment"];
  if (hasTransmission) {
    dreiImports.push("MeshTransmissionMaterial");
  }

  const importLines = [
    `import React, { ${reactImports.join(", ")} } from "react";`,
    `import { ${fiberImports.join(", ")} } from "@react-three/fiber";`,
    `import { ${dreiImports.join(", ")} } from "@react-three/drei";`
  ];

  if (typing === "prop-types") {
    importLines.push(`import PropTypes from "prop-types";`);
  }

  return importLines.join("\n");
}

function buildTypeDefinitions(typing: R3FTypingMode) {
  if (typing !== "typescript") {
    return "";
  }

  return `import type { Group, Mesh } from "three";

type ObjectRef = Group | Mesh;
`;
}

function buildPropTypesBlock(typing: R3FTypingMode) {
  if (typing !== "prop-types") {
    return "";
  }

  return `
GeneratedScene.propTypes = {};
`;
}

function getSceneStyle(scene: SceneData) {
  return scene.metadata?.style || "minimal";
}

function getSceneMaterialPreset(scene: SceneData) {
  return scene.metadata?.design_tokens?.material_preset || "matte_soft";
}

function getSceneAccentColor(scene: SceneData) {
  return scene.metadata?.color_hints?.find((hint) => hint.role === "accent")?.hex ?? "#00F5FF";
}

function getCacheKeyForObject(scene: SceneData, object: SceneObject) {
  return buildCacheKey({
    objectName: object.name || object.id,
    style: getSceneStyle(scene),
    materialPreset: getSceneMaterialPreset(scene),
    accentColor: getSceneAccentColor(scene)
  });
}

function buildSynthesizedComponentsTemplate(contractObjects: SceneObject[]) {
  const template: Record<string, string> = {};

  for (const object of contractObjects) {
    template[object.id] = `<REPLACE_WITH_JSX_FOR_${toPlaceholderToken(object.name || object.id)}>`;
  }

  return template;
}

function buildSynthesisRequiredResponse(
  contractObjects: SceneObject[],
  scene: SceneData,
  framework: R3FFramework,
  typing: R3FTypingMode,
  customMessage?: string
): SynthesisRequiredOutput {
  const contracts = contractObjects
    .filter(isSynthesisObject)
    .map((object) => object.synthesis_contract);

  return {
    status: "SYNTHESIS_REQUIRED",
    message:
      customMessage ??
      `${contractObjects.length} object(s) require geometry synthesis before code can be generated. Generate JSX geometry for each object listed in "objects_needing_synthesis" following their constraints exactly, then call generate_r3f_code again with the "synthesized_components" parameter populated.`,
    objects_needing_synthesis: contracts.map((contract) => ({
      object_id: contract.object_id,
      object_name: contract.object_name,
      category: contract.category,
      bounding_box: contract.bounding_box,
      complexity_tier: contract.complexity_tier,
      min_parts: contract.min_parts,
      max_parts: contract.max_parts,
      complexity_hint: contract.complexity_hint,
      lod_note: contract.lod_note,
      constraints: contract.constraints,
      expected_output: {
        component_name: `${toPascalCase(contract.object_name)}Geometry`,
        format: "React.forwardRef component - JSX only, no imports, no exports",
        example_signature: `const ${toPascalCase(contract.object_name)}Geometry = React.forwardRef((props, ref) => (\n  <group ref={ref}>\n    {/* meshes here */}\n  </group>\n));`
      }
    })),
    resume_instructions: {
      tool: "generate_r3f_code",
      call_with: {
        scene_data: "pass the same scene_data unchanged",
        framework,
        typing,
        synthesized_components: buildSynthesizedComponentsTemplate(contractObjects)
      },
      note: "Replace each placeholder value in synthesized_components with the actual JSX string you generated."
    }
  };
}

function assembleR3FComponent(
  scene: SceneData,
  framework: R3FFramework,
  typing: R3FTypingMode,
  synthesizedComponents: Record<string, string>
): AssembledR3FOutput {
  const animationList = Array.isArray(scene.animations) ? scene.animations : [];
  const animatedObjectIds = getAnimatedObjectIdSet(scene.objects, animationList);
  const refNameMap = buildRefNameMap(scene.objects);
  const synthesizedComponentEntries = buildSynthesizedComponentEntries(scene, synthesizedComponents, refNameMap);
  const refObjectIds = new Set(animatedObjectIds);
  const hasTransmission = sceneUsesTransmission(scene);

  for (const entry of synthesizedComponentEntries.entries) {
    refObjectIds.add(entry.objectId);
  }

  const hasAnimations = animatedObjectIds.size > 0;
  const hasRefs = refObjectIds.size > 0;
  const refType = typing === "typescript" ? "<ObjectRef | null>" : "";
  const refDeclarations = scene.objects
    .map((object) => {
      return refObjectIds.has(object.id) ? `  const ${getRefNameForObject(object, refNameMap)} = useRef${refType}(null);` : "";
    })
    .filter(Boolean)
    .join("\n");

  const animationHooks = buildAnimationHooks(scene.objects, animationList, refNameMap);
  const lightingJsx = buildLightingJsx(scene);
  const sceneGraph = buildSceneGraph(
    scene,
    synthesizedComponentEntries.entryByObjectId,
    animatedObjectIds,
    refNameMap
  );
  const injectedComponents = [
    ...synthesizedComponentEntries.warningComments,
    ...synthesizedComponentEntries.entries.map((entry) => entry.definitionBlock)
  ].join("\n\n");
  const imports = buildImports(hasAnimations, hasTransmission, hasRefs, typing);
  const typeDefinitions = buildTypeDefinitions(typing);
  const propTypesBlock = buildPropTypesBlock(typing);
  const useClientDirective = framework === "nextjs" ? `"use client";\n\n` : "";

  const sceneContent = `function SceneContent() {
${refDeclarations || ""}
${animationHooks ? `\n${animationHooks}\n` : ""}
  return (
    <>
${lightingJsx}
${sceneGraph}
    </>
  );
}`;

  const fullComponent = `${useClientDirective}${imports}
${typeDefinitions}
${injectedComponents ? `${injectedComponents}\n\n` : ""}${sceneContent}

export default function GeneratedScene() {
  return (
    <Canvas camera={{ position: ${JSON.stringify(scene.camera.position)}, fov: ${scene.camera.fov} }}>
      <color attach="background" args={["${scene.environment.background.value}"]} />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} />
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
${propTypesBlock}`;

  return {
    status: "SUCCESS",
    r3f_code: fullComponent,
    language: typing === "typescript" ? "tsx" : "jsx",
    framework,
    synthesized_object_count: Object.keys(synthesizedComponents).length,
    scene_id: scene.scene_id
  };
}

export function handleGenerateR3FCode(
  scene: SceneData,
  options: GenerateR3FOptions = {}
): GenerateR3FResult {
  const framework = options.framework ?? "plain";
  const typing = options.typing ?? "none";
  const contractObjects = scene.objects.filter(isSynthesisObject);
  const providedComponents = options.synthesized_components ?? {};
  const autoFilledComponents: Record<string, string> = { ...providedComponents };

  for (const object of contractObjects) {
    if (autoFilledComponents[object.id]) {
      continue;
    }

    const cachedGeometry = getCachedGeometry(getCacheKeyForObject(scene, object));
    if (cachedGeometry) {
      autoFilledComponents[object.id] = cachedGeometry;
    }
  }

  if (contractObjects.length > 0) {
    const missingObjects = contractObjects.filter((object) => !autoFilledComponents[object.id]);

    if (missingObjects.length > 0) {
      const customMessage = Object.keys(providedComponents).length > 0
        ? `synthesized_components was provided but missing entries for: ${missingObjects.map((object) => object.name || object.id).join(", ")}. Generate the missing components and call again.`
        : undefined;

      return buildSynthesisRequiredResponse(missingObjects, scene, framework, typing, customMessage);
    }
  }

  const result = assembleR3FComponent(scene, framework, typing, autoFilledComponents);

  for (const [objectId, jsx] of Object.entries(providedComponents)) {
    const object = contractObjects.find((entry) => entry.id === objectId);

    if (!object) {
      continue;
    }

    setCachedGeometry(getCacheKeyForObject(scene, object), {
      jsx,
      object_name: object.name || object.id,
      category: object.synthesis_contract.category,
      style: getSceneStyle(scene),
      material_preset: getSceneMaterialPreset(scene),
      accent_color: getSceneAccentColor(scene)
    });
  }

  return result;
}

export function generateR3FCode(scene: SceneData, options: GenerateR3FOptions = {}) {
  const result = handleGenerateR3FCode(scene, options);

  if (result.status !== "SUCCESS") {
    throw new Error(result.message);
  }

  return result.r3f_code;
}
