export function generateR3FCode(scene: any) {
  const { camera, lighting, objects, environment, animations } = scene;

  // 🎨 Background
  const background = environment?.background?.value || "#ffffff";

  // 💡 Lights
  const lightsCode = lighting.map((light: any) => {
    if (light.type === "ambient") {
      return `<ambientLight intensity={${light.intensity}} color="${light.color}" />`;
    }

    if (light.type === "spot") {
      return `<spotLight position={[${light.position}]} intensity={${light.intensity}} color="${light.color}" />`;
    }

    return "";
  }).join("\n");

  // 📦 Objects
  const objectsCode = objects.map((obj: any, index: number) => {
    const position = `[${obj.position}]`;
    const scale = `[${obj.scale}]`;
    const refProp = index === 0 && animations && animations.length > 0 ? "ref={ref}" : "";

    // 🟢 Model
    if (obj.type === "model" && obj.asset) {
      return `
<primitive 
  object={useGLTF("/models/${obj.asset}").scene} 
  ${refProp}
  position={${position}} 
  scale={${scale}} 
/>`;
    }

    // 🔵 Primitive
    if (obj.type === "primitive") {
      let geometry = "";

      if (obj.shape === "box") geometry = "<boxGeometry />";
      if (obj.shape === "sphere") geometry = "<sphereGeometry />";
      if (obj.shape === "cylinder") geometry = "<cylinderGeometry />";

      return `
<mesh ${refProp} position={${position}} scale={${scale}}>
  ${geometry}
  <meshStandardMaterial color="${obj.material.color}" />
</mesh>`;
    }

    return "";
  }).join("\n");

  // 🎞️ Animation (simple: only first animation)
  let animationCode = "";

  if (animations && animations.length > 0) {
    const anim = animations[0];

    if (anim.type === "float") {
      animationCode = `
useFrame((state) => {
  const t = state.clock.getElapsedTime();
  ref.current.position.y = Math.sin(t) * 0.2;
});`;
    }

    if (anim.type === "rotation") {
      animationCode = `
useFrame(() => {
  ref.current.rotation.y += 0.01;
});`;
    }

    if (anim.type === "bounce") {
      animationCode = `
useFrame((state) => {
  const t = state.clock.getElapsedTime();
  ref.current.position.y = Math.abs(Math.sin(t * 2)) * 0.25;
});`;
    }
  }

  // 🧩 Final Component
  return `
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useGLTF } from "@react-three/drei";

function Scene() {
  const ref = useRef();

  ${animationCode}

  return (
    <>
      ${lightsCode}

      ${objectsCode}
    </>
  );
}

export default function App() {
  return (
    <Canvas camera={{ position: [${camera.position}], fov: ${camera.fov} }}>
      <color attach="background" args={["${background}"]} />
      <Scene />
    </Canvas>
  );
}
`;
}
