import type { DesignTokens } from "./designTokens.js";

export type Vector3 = [number, number, number];

export interface Material {
  type: "glass" | "metal" | "matte";
  color: string;
  metalness?: number;
  roughness?: number;
}

export interface SceneObject {
  id: string;
  type: "model" | "primitive";
  name?: string;
  shape?: "box" | "sphere" | "cylinder";
  asset?: string | null;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  material: Material;
}

export interface Light {
  id: string;
  type: "ambient" | "spot";
  intensity: number;
  color: string;
  position?: Vector3;
}

export interface Animation {
  id: string;
  target: string;
  type: "rotation" | "float" | "bounce";
  axis?: "x" | "y" | "z";
  speed: number;
  loop: boolean;
}

export interface SceneData {
  scene_id: string;

  metadata: {
    title: string;
    use_case: string;
    style: string;
    design_tokens?: DesignTokens;
    created_at: string;
  };

  environment: {
    background: {
      type: "color";
      value: string;
    };
  };

  camera: {
    type: "perspective";
    position: Vector3;
    fov: number;
    target: Vector3;
  };

  lighting: Light[];
  objects: SceneObject[];
  animations: Animation[];
}
