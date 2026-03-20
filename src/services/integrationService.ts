export function getIntegrationHelp(platform: string, format: string) {
  // 🟢 REACT (R3F)
  if (platform === "react") {
    return {
      steps: [
        "Install dependencies: npm install three @react-three/fiber @react-three/drei",
        "Create a React component",
        "Paste the generated R3F code into your component",
        "Ensure models are placed in /public/models folder",
        "Run your React app"
      ],
      code_example: `
import React from "react";
import Scene from "./Scene";

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Scene />
    </div>
  );
}
`
    };
  }

  // 🔵 NEXT.JS
  if (platform === "nextjs") {
    return {
      steps: [
        "Install dependencies: npm install three @react-three/fiber @react-three/drei",
        "Create a component inside /components",
        "Use dynamic import to disable SSR",
        "Place models in /public/models",
        "Use component inside a page"
      ],
      code_example: `
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("../components/Scene"), {
  ssr: false
});

export default function Home() {
  return <Scene />;
}
`
    };
  }

  // 🟡 HTML (basic guidance)
  if (platform === "html") {
    return {
      steps: [
        "Use Three.js via CDN",
        "Create a canvas element",
        "Initialize scene, camera, renderer",
        "Load model using GLTFLoader",
        "Render loop with requestAnimationFrame"
      ],
      note: "For better experience, use React Three Fiber instead of raw HTML setup."
    };
  }

  return {
    message: "Unsupported platform"
  };
}