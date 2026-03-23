import { isAssetConfirmed } from "./assetService.js";
import { Animation, Material, SceneData, SceneObject } from "../types/scene.js";

export type R3FTypingMode = "none" | "typescript" | "prop-types";
export type R3FFramework = "nextjs" | "vite" | "plain";

export interface GenerateR3FOptions {
  typing?: R3FTypingMode;
  framework?: R3FFramework;
}

// ---------------------------------------------------------------------------
// Material classification helpers
// ---------------------------------------------------------------------------

type MaterialCategory = "transmission" | "physical" | "emissive" | "standard";

function classifyMaterial(material: Material): MaterialCategory {
  // Glass / transmission materials → MeshTransmissionMaterial (drei)
  if (
    material.type === "glass" ||
    (typeof material.transmission === "number" && material.transmission > 0)
  ) {
    return "transmission";
  }

  // Metal / chrome / high-metalness → meshPhysicalMaterial
  if (
    material.type === "metal" ||
    (typeof material.metalness === "number" && material.metalness >= 0.8)
  ) {
    return "physical";
  }

  // Neon / emissive-heavy → meshStandardMaterial + emissive (+ optional pointLight)
  if (
    typeof material.emissiveIntensity === "number" &&
    material.emissiveIntensity > 0.5
  ) {
    return "emissive";
  }

  return "standard";
}

function sceneUsesTransmission(scene: SceneData): boolean {
  return scene.objects.some((obj) => classifyMaterial(obj.material) === "transmission");
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

function getAnimatedObjectIdSet(objects: SceneObject[], animations: Animation[]) {
  const animatedIds = new Set<string>();

  for (const obj of objects) {
    const isAnimated = animations.some((animation) => {
      return animation.target_id === obj.id || animation.target === obj.id || animation.target === obj.name;
    });

    if (isAnimated) {
      animatedIds.add(obj.id);
    }
  }

  return animatedIds;
}

function getRefName(index: number) {
  return index === 0 ? "primaryRef" : `object${index + 1}Ref`;
}

function getAxisBaseValue(values: number[], axis: "x" | "y" | "z") {
  if (axis === "x") return values[0];
  if (axis === "y") return values[1];
  return values[2];
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function getDefaultSegments(shape: SceneObject["shape"]) {
  if (shape === "sphere") {
    return 64;
  }

  if (shape === "cylinder") {
    return 48;
  }

  return 1;
}

function resolveSegmentCount(object: SceneObject) {
  return object.render_hints?.segment_count ?? getDefaultSegments(object.shape);
}

function resolveAssetConfirmation(object: SceneObject) {
  if (!object.asset) {
    return false;
  }

  if (typeof object.asset_confirmed === "boolean") {
    return object.asset_confirmed;
  }

  return isAssetConfirmed(object.asset);
}

function inferFallbackShape(object: SceneObject): "box" | "sphere" | "cylinder" {
  if (object.shape) {
    return object.shape;
  }

  const lookup = `${object.name || ""} ${object.asset || ""}`.toLowerCase();

  if (lookup.includes("orb") || lookup.includes("sphere") || lookup.includes("globe")) {
    return "sphere";
  }

  if (lookup.includes("bottle") || lookup.includes("can")) {
    return "cylinder";
  }

  return "box";
}

// ---------------------------------------------------------------------------
// Material JSX generation — the translation layer
// ---------------------------------------------------------------------------

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

/**
 * Generate the JSX for a material based on its classification.
 * This is the core material translation layer:
 *   glass_frost / glass → <MeshTransmissionMaterial />
 *   metal / chrome      → <meshPhysicalMaterial metalness={1} />
 *   neon / emissive     → <meshStandardMaterial emissive={...} />
 *   default             → <meshStandardMaterial />
 */
function buildMaterialJsx(material: Material, extraIndent: number = 0): string {
  const category = classifyMaterial(material);
  const pad = " ".repeat(extraIndent);

  switch (category) {
    case "transmission": {
      const props: string[] = [
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

      if (material.envMapIntensity !== undefined) {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0.3}}`);
      }

      return `${pad}<MeshTransmissionMaterial\n${props.map((p) => `${pad}  ${p}`).join("\n")}\n${pad}/>`;
    }

    case "physical": {
      const props: string[] = [
        `color="${material.color}"`,
        `metalness={${material.metalness ?? 1}}`,
        `roughness={${material.roughness ?? 0.05}}`
      ];

      if (material.envMapIntensity !== undefined) {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0}}`);
      }

      if (material.flatShading) {
        props.push(`flatShading`);
      }

      return `${pad}<meshPhysicalMaterial ${props.join(" ")} />`;
    }

    case "emissive": {
      const props: string[] = [
        `color="${material.color}"`,
        `metalness={${material.metalness ?? 0.2}}`,
        `roughness={${material.roughness ?? 0.1}}`,
        `emissive="${material.emissive || material.color}"`,
        `emissiveIntensity={${material.emissiveIntensity ?? 1.0}}`
      ];

      if (material.envMapIntensity !== undefined) {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.flatShading) {
        props.push(`flatShading`);
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }

    case "standard":
    default: {
      const props: string[] = [
        `color="${material.color}"`
      ];

      if (material.metalness !== undefined) {
        props.push(`metalness={${material.metalness}}`);
      }

      if (material.roughness !== undefined) {
        props.push(`roughness={${material.roughness}}`);
      }

      if (material.emissive) {
        props.push(`emissive="${material.emissive}"`);
        props.push(`emissiveIntensity={${material.emissiveIntensity ?? 0}}`);
      }

      if (material.envMapIntensity !== undefined) {
        props.push(`envMapIntensity={${material.envMapIntensity}}`);
      }

      if (material.flatShading) {
        props.push(`flatShading`);
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }
  }
}

/**
 * For neon/emissive materials, optionally emit a companion pointLight
 * to simulate glow bleeding onto nearby surfaces.
 */
function buildEmissiveGlowLight(object: SceneObject): string {
  const category = classifyMaterial(object.material);
  if (category !== "emissive") {
    return "";
  }

  const glowColor = object.material.emissive || object.material.color;
  const intensity = Math.min((object.material.emissiveIntensity ?? 1.0) * 0.4, 1.5);
  const [x, y, z] = object.position;

  return `      <pointLight position={[${x}, ${y}, ${z}]} color="${glowColor}" intensity={${intensity.toFixed(2)}} distance={3} decay={2} />`;
}

// ---------------------------------------------------------------------------
// Animation hooks
// ---------------------------------------------------------------------------

function buildAnimationHooks(objects: SceneObject[], animations: Animation[]) {
  return animations.map((animation) => {
    const targetObject = objects.find((obj) => {
      return animation.target_id === obj.id || animation.target === obj.id || animation.target === obj.name;
    });

    if (!targetObject) {
      return "";
    }

    const objectIndex = objects.findIndex((obj) => obj.id === targetObject.id);
    const refName = getRefName(objectIndex);

    if (animation.type === "float" && "amplitude" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(targetObject.position, animation.config.axis)} + Math.sin(t) * ${animation.config.amplitude};
  });`;
    }

    if (animation.type === "rotate" && "range" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.rotation.${animation.config.axis} = ${getAxisBaseValue(targetObject.rotation, animation.config.axis)} + Math.sin(t) * ${animation.config.range};
  });`;
    }

    if (animation.type === "bounce" && "amplitude" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(targetObject.position, animation.config.axis)} + Math.abs(Math.sin(t)) * ${animation.config.amplitude};
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
      ${targetObject.scale[0]} * pulseScale,
      ${targetObject.scale[1]} * pulseScale,
      ${targetObject.scale[2]} * pulseScale
    );
  });`;
    }

    return "";
  }).filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Light JSX
// ---------------------------------------------------------------------------

function buildLightJsx(scene: SceneData) {
  return scene.lighting.map((light) => {
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
  }).filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Object JSX — now uses material translation layer
// ---------------------------------------------------------------------------

function buildComponentPropString(props: string[]) {
  return props.filter(Boolean).join(" ");
}

function buildObjectJsx(objects: SceneObject[], animatedObjectIds: Set<string>) {
  return objects.map((object, index) => {
    const refProp = animatedObjectIds.has(object.id) ? `ref={${getRefName(index)}}` : "";
    const position = `position={${JSON.stringify(object.position)}}`;
    const scale = `scale={${JSON.stringify(object.scale)}}`;
    const segmentCount = resolveSegmentCount(object);
    const materialJsx = buildMaterialJsx(object.material, 8);
    const glowLight = buildEmissiveGlowLight(object);

    if (object.asset && resolveAssetConfirmation(object)) {
      const props = buildComponentPropString([
        `url="/models/${object.asset}"`,
        position,
        scale,
        refProp ? `objectRef={${getRefName(index)}}` : ""
      ]);

      return `      <AssetModel ${props} />`;
    }

    if (object.asset) {
      // Procedural fallback for unconfirmed assets
      const shape = inferFallbackShape(object);
      const lines: string[] = [];

      lines.push(`      {/* Replace with useGLTF('/models/${object.asset}') when model is available */}`);
      lines.push(`      <group ${buildComponentPropString([refProp, position, scale])}>`);
      lines.push(buildProceduralFallbackJsx(object, shape, segmentCount, materialJsx));
      lines.push(`      </group>`);

      if (glowLight) {
        lines.push(glowLight);
      }

      return lines.join("\n");
    }

    // Pure primitive
    const shape = inferFallbackShape(object);
    const lines: string[] = [];

    lines.push(`      <mesh ${buildComponentPropString([refProp, position, scale])}>`);
    lines.push(buildGeometryJsx(shape, segmentCount, 8));
    lines.push(materialJsx);
    lines.push(`      </mesh>`);

    if (glowLight) {
      lines.push(glowLight);
    }

    return lines.join("\n");
  }).join("\n");
}

function buildGeometryJsx(shape: "box" | "sphere" | "cylinder", segmentCount: number, padSpaces: number): string {
  const pad = " ".repeat(padSpaces);
  const roundedSegments = Math.max(1, Math.round(segmentCount));

  if (shape === "sphere") {
    const widthSeg = Math.max(8, roundedSegments);
    const heightSeg = Math.max(6, Math.round(widthSeg / 2));
    return `${pad}<sphereGeometry args={[1, ${widthSeg}, ${heightSeg}]} />`;
  }

  if (shape === "cylinder") {
    const cylSeg = Math.max(8, roundedSegments);
    return `${pad}<cylinderGeometry args={[0.65, 0.65, 1.6, ${cylSeg}]} />`;
  }

  return `${pad}<boxGeometry args={[1, 1, 1, ${roundedSegments}, ${roundedSegments}, ${roundedSegments}]} />`;
}

function buildProceduralFallbackJsx(object: SceneObject, shape: "box" | "sphere" | "cylinder", segmentCount: number, materialJsx: string): string {
  const assetName = object.asset || "";

  if (/smartphone|phone/i.test(assetName)) {
    return buildSmartphoneFallback(object.material);
  }

  // Generic fallback
  const lines: string[] = [];
  lines.push(`        <mesh>`);
  lines.push(buildGeometryJsx(shape, segmentCount, 10));
  lines.push(indent(materialJsx, 2));
  lines.push(`        </mesh>`);
  return lines.join("\n");
}

function buildSmartphoneFallback(material: Material): string {
  const bodyMaterialJsx = buildMaterialJsx(material, 10);

  return `        {/* Smartphone procedural fallback */}
        <mesh scale={[0.95, 1.8, 0.12]}>
          <boxGeometry args={[1, 1, 1, 4, 8, 1]} />
${bodyMaterialJsx}
        </mesh>
        <mesh position={[0, 0, 0.07]} scale={[0.84, 1.55, 0.02]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.42} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.78, 0.075]} scale={[0.18, 0.04, 0.01]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.05} />
        </mesh>
        <mesh position={[0.27, -0.73, 0.08]} scale={[0.16, 0.16, 0.01]}>
          <circleGeometry args={[1, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.12} />
        </mesh>
        <mesh position={[-0.28, 0.67, 0.08]} scale={[0.1, 0.1, 0.04]}>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial color="#0b1020" roughness={0.25} metalness={0.25} />
        </mesh>
        <mesh position={[-0.12, 0.67, 0.08]} scale={[0.07, 0.07, 0.04]}>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial color="#0b1020" roughness={0.25} metalness={0.25} />
        </mesh>`;
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

function buildTypeDefinitions(typing: R3FTypingMode) {
  if (typing !== "typescript") {
    return "";
  }

  return `
import type { Mesh, Group } from "three";

type Vector3Tuple = [number, number, number];
type MeshShape = "box" | "sphere" | "cylinder";

type MaterialConfig = {
  type: "glass" | "metal" | "matte" | "standard";
  color: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flatShading?: boolean;
  envMapIntensity?: number;
};

interface AssetModelProps {
  url: string;
  position: Vector3Tuple;
  scale: Vector3Tuple;
  objectRef?: React.MutableRefObject<Group | null>;
}
`;
}

function buildPropTypesBlock(typing: R3FTypingMode, hasConfirmedAssets: boolean) {
  if (typing !== "prop-types") {
    return "";
  }

  return `
const vector3PropType = PropTypes.arrayOf(PropTypes.number).isRequired;
const objectRefPropType = PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.shape({ current: PropTypes.any })
]);
${hasConfirmedAssets ? `
AssetModel.propTypes = {
  url: PropTypes.string.isRequired,
  position: vector3PropType,
  scale: vector3PropType,
  objectRef: objectRefPropType
};` : ""}
`;
}

// ---------------------------------------------------------------------------
// Shared component blocks
// ---------------------------------------------------------------------------

function buildSharedComponentBlock(typing: R3FTypingMode, hasConfirmedAssets: boolean) {
  const assetPropsType = typing === "typescript" ? ": AssetModelProps" : "";

  const blocks: string[] = [];

  if (hasConfirmedAssets) {
    blocks.push(`
function AssetModel({ url, position, scale, objectRef }${assetPropsType}) {
  const gltf = useGLTF(url);
  const modelScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  return (
    <primitive
      ref={objectRef}
      object={modelScene}
      position={position}
      scale={scale}
      dispose={null}
    />
  );
}`);
  }

  return blocks.join("\n");
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

function buildImports(
  hasConfirmedAssets: boolean,
  hasAnimations: boolean,
  hasTransmission: boolean,
  typing: R3FTypingMode
) {
  const reactImports = [
    hasConfirmedAssets ? "Suspense" : "",
    hasConfirmedAssets ? "useMemo" : "",
    hasAnimations ? "useRef" : ""
  ].filter(Boolean);

  const fiberImports = ["Canvas", hasAnimations ? "useFrame" : ""].filter(Boolean);

  const dreiImports: string[] = [];
  if (hasConfirmedAssets) {
    dreiImports.push("useGLTF");
  }
  if (hasTransmission) {
    dreiImports.push("MeshTransmissionMaterial");
  }

  const importLines = [
    reactImports.length > 0 ? `import { ${reactImports.join(", ")} } from "react";` : "",
    `import { ${fiberImports.join(", ")} } from "@react-three/fiber";`
  ].filter(Boolean);

  if (dreiImports.length > 0) {
    importLines.push(`import { ${dreiImports.join(", ")} } from "@react-three/drei";`);
  }

  if (typing === "prop-types") {
    importLines.push(`import PropTypes from "prop-types";`);
  }

  return importLines.join("\n");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateR3FCode(scene: SceneData, options: GenerateR3FOptions = {}) {
  const typing = options.typing ?? "none";
  const framework = options.framework ?? "plain";
  const animationList = Array.isArray(scene.animations) ? scene.animations : [];
  const animatedObjectIds = getAnimatedObjectIdSet(scene.objects, animationList);
  const hasAnimations = animationList.length > 0;
  const hasConfirmedAssets = scene.objects.some((object) => object.asset && resolveAssetConfirmation(object));
  const hasTransmission = sceneUsesTransmission(scene);

  const refType = typing === "typescript" ? "<Mesh | Group | null>" : "";
  const refDeclarations = scene.objects
    .map((object, index) => {
      return animatedObjectIds.has(object.id) ? `  const ${getRefName(index)} = useRef${refType}(null);` : "";
    })
    .filter(Boolean)
    .join("\n");

  const animationHooks = buildAnimationHooks(scene.objects, animationList);
  const lightsCode = buildLightJsx(scene);
  const objectsCode = buildObjectJsx(scene.objects, animatedObjectIds);
  const background = scene.environment?.background?.value || "#ffffff";
  const imports = buildImports(hasConfirmedAssets, hasAnimations, hasTransmission, typing);
  const typeDefinitions = buildTypeDefinitions(typing);
  const sharedComponents = buildSharedComponentBlock(typing, hasConfirmedAssets);
  const propTypesBlock = buildPropTypesBlock(typing, hasConfirmedAssets);

  const useClientDirective = framework === "nextjs" ? `"use client";\n\n` : "";

  const sceneContent = `function SceneContent() {
${refDeclarations || ""}
${animationHooks ? `\n${animationHooks}\n` : ""}
  return (
    <>
${lightsCode}
${objectsCode}
    </>
  );
}`;

  const canvasChildren = hasConfirmedAssets
    ? `      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>`
    : `      <SceneContent />`;

  return `${useClientDirective}${imports}
${typeDefinitions}
${sharedComponents}
${propTypesBlock}
${sceneContent}

export default function GeneratedScene() {
  return (
    <Canvas camera={{ position: ${JSON.stringify(scene.camera.position)}, fov: ${scene.camera.fov} }}>
      <color attach="background" args={["${background}"]} />
${canvasChildren}
    </Canvas>
  );
}
`;
}
