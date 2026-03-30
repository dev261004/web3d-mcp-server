/** @jest-environment node */
// @ts-nocheck

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const DIST_ROOT = process.env.TEST_DIST_ROOT ?? "./dist";

const CACHE_DIR = join(process.cwd(), ".synthesis_cache");

function clearCache() {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}

function runJson(script) {
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output.trim());
}

function buildSceneScript({ includeSynthesized = false, includeAnimation = false } = {}) {
  return `
    import { buildSynthesisContract } from "${DIST_ROOT}/lib/synthesisContract.js";
    import { handleGenerateR3FCode } from "${DIST_ROOT}/services/r3fGenerator.js";

    const contract = buildSynthesisContract({
      objectId: "robot_1",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF"
    });

    const scene = {
      scene_id: "scene_1",
      notes: ["synthesis_contract_attached"],
      metadata: {
        title: "Test Scene",
        use_case: "showcase",
        style: "futuristic",
        design_tokens: {
          use_case: "showcase",
          theme: "futuristic",
          material_preset: "metal_chrome",
          animation: "none",
          lighting_preset: "neon_edge",
          background_preset: "gradient_vivid",
          composition: "floating_showcase"
        },
        color_hints: [
          {
            name: "cyan",
            hex: "#00F5FF",
            role: "accent"
          }
        ],
        created_at: "2026-03-25T00:00:00.000Z"
      },
      environment: {
        background: {
          type: "color",
          value: "#07182d"
        }
      },
      camera: {
        type: "perspective",
        position: [0, 2.1, 5.5],
        fov: 48,
        target: [0, 0.2, 0]
      },
      lighting: [
        {
          id: "light_1",
          type: "ambient",
          intensity: 0.24,
          color: "#d9ecff"
        }
      ],
      objects: [
        {
          id: "robot_1",
          type: "synthesis_contract",
          name: "robot",
          shape: "SYNTHESIS_REQUIRED",
          synthesis_contract: contract,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            type: "metal",
            color: "#f6f7fb",
            metalness: 1,
            roughness: 0.05
          },
          render_hints: {
            bounding_box: contract.bounding_box,
            min_parts: contract.min_parts,
            complexity: contract.complexity_hint
          }
        }
      ],
      animations: ${includeAnimation ? `[
        {
          id: "anim_1",
          target_id: "robot_1",
          target: "robot",
          type: "float",
          config: {
            amplitude: 0.2,
            speed: 1,
            axis: "y"
          },
          loop: true
        }
      ]` : "[]"}
    };

    const result = handleGenerateR3FCode(scene, {
      framework: "nextjs",
      typing: "typescript"${includeSynthesized ? `,
      synthesized_components: {
        robot_1: \`const RobotGeometry = React.forwardRef((props, ref) => (
  <group ref={ref}>
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f6f7fb" />
    </mesh>
    <mesh position={[0, 0.8, 0]}>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshStandardMaterial color="#00F5FF" emissive="#00F5FF" emissiveIntensity={3} />
    </mesh>
    <mesh position={[-0.4, 0.2, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 0.8, 12]} />
      <meshStandardMaterial color="#f6f7fb" />
    </mesh>
    <mesh position={[0.4, 0.2, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 0.8, 12]} />
      <meshStandardMaterial color="#f6f7fb" />
    </mesh>
    <mesh position={[-0.2, -0.9, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.9, 12]} />
      <meshStandardMaterial color="#f6f7fb" />
    </mesh>
    <mesh position={[0.2, -0.9, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.9, 12]} />
      <meshStandardMaterial color="#f6f7fb" />
    </mesh>
    <mesh position={[0, 0.35, 0.55]}>
      <ringGeometry args={[0.08, 0.14, 16]} />
      <meshStandardMaterial color="#00F5FF" emissive="#00F5FF" emissiveIntensity={2.5} />
    </mesh>
  </group>
));\`
      }` : ""}
    });

    console.log(JSON.stringify(result));
  `;
}

beforeEach(() => {
  clearCache();
});

test("detectCategory maps robot to humanoid", () => {
  const result = runJson(`
    import { detectCategory } from "${DIST_ROOT}/lib/objectCategories.js";
    console.log(JSON.stringify(detectCategory("robot")));
  `);

  assert.equal(result, "humanoid");
});

test("detectCategory maps coldrink to container", () => {
  const result = runJson(`
    import { detectCategory } from "${DIST_ROOT}/lib/objectCategories.js";
    console.log(JSON.stringify(detectCategory("coldrink")));
  `);

  assert.equal(result, "container");
});

test("detectCategory falls back to unknown", () => {
  const result = runJson(`
    import { detectCategory } from "${DIST_ROOT}/lib/objectCategories.js";
    console.log(JSON.stringify(detectCategory("unknownXYZ")));
  `);

  assert.equal(result, "unknown");
});

test("buildSynthesisContract returns expected robot contract", () => {
  const result = runJson(`
    import { buildSynthesisContract } from "${DIST_ROOT}/lib/synthesisContract.js";

    const contract = buildSynthesisContract({
      objectId: "robot_1",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF"
    });

    console.log(JSON.stringify({
      type: contract.__type,
      bounding_box: contract.bounding_box,
      min_parts: contract.min_parts,
      complexity_tier: contract.complexity_tier,
      max_parts: contract.max_parts
    }));
  `);

  assert.equal(result.type, "SYNTHESIS_REQUIRED");
  assert.deepEqual(result.bounding_box, [0.6, 1.8, 0.5]);
  assert.equal(result.min_parts, 28);
  assert.equal(result.complexity_tier, "high");
  assert.equal(result.max_parts, null);
});

test("handleGenerateR3FCode renders placeholders when synthesized components are missing", () => {
  const result = runJson(buildSceneScript());

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.placeholder_object_count, 1);
  assert.match(result.warning, /Placeholder meshes were used/i);
  assert.match(result.r3f_code, /robot placeholder rendered because synthesized JSX was not provided/i);
  assert.match(result.r3f_code, /<boxGeometry args=\{\[0\.6, 1\.8, 0\.5\]\} \/>/);
  assert.match(result.r3f_code, /meshStandardMaterial color="#666666" wireframe/);
});

test("handleGenerateR3FCode returns success when synthesized components are provided", () => {
  const result = runJson(buildSceneScript({ includeSynthesized: true, includeAnimation: true }));

  assert.equal(result.status, "SUCCESS");
  assert.match(result.r3f_code, /RobotGeometry/);
  assert.match(result.r3f_code, /const RobotGeometry = React\.forwardRef\(\(props, ref\) => \(\s*<group ref=\{ref\}>/s);
  assert.match(result.r3f_code, /RobotGeometry\.displayName = "RobotGeometry";/);
  assert.match(result.r3f_code, /const robotRef = useRef<ObjectRef \| null>\(null\);/);
  assert.match(result.r3f_code, /if \(!robotRef\.current\) return;/);
  assert.match(result.r3f_code, /<RobotGeometry ref=\{robotRef\} position=\{\[0,0,0\]\} rotation=\{\[0,0,0\]\} scale=\{\[1,1,1\]\} \/>/);
});

test("handleGenerateR3FCode falls back to a placeholder scene on internal failure", () => {
  const result = runJson(`
    import { handleGenerateR3FCode } from "${DIST_ROOT}/services/r3fGenerator.js";

    const brokenScene = {
      scene_id: "broken_scene",
      metadata: {
        title: "Broken Scene",
        use_case: "showcase",
        style: "minimal",
        created_at: "2026-03-30T00:00:00.000Z"
      },
      environment: {
        background: {
          type: "color",
          value: "#050a15"
        }
      },
      camera: {
        type: "perspective",
        position: [0, 2, 5],
        fov: 45,
        target: [0, 0, 0]
      },
      lighting: null,
      objects: null,
      animations: []
    };

    console.log(JSON.stringify(handleGenerateR3FCode(brokenScene, {
      framework: "plain",
      typing: "none"
    })));
  `);

  assert.equal(result.status, "PARTIAL");
  assert.match(result.warning, /placeholder scene/i);
  assert.match(result.r3f_code, /export default function PlaceholderScene/);
});

test("synthesis cache stores and retrieves geometry", () => {
  const result = runJson(`
    import {
      buildCacheKey,
      getCachedGeometry,
      setCachedGeometry
    } from "${DIST_ROOT}/lib/synthesisCache.js";

    const key = buildCacheKey({
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      accentColor: "#00F5FF"
    });

    const before = getCachedGeometry(key);

    setCachedGeometry(key, {
      jsx: "<group />",
      object_name: "robot",
      category: "humanoid",
      style: "futuristic",
      material_preset: "metal_chrome",
      accent_color: "#00F5FF"
    });

    const after = getCachedGeometry(key);
    console.log(JSON.stringify({ before, after }));
  `);

  assert.equal(result.before, null);
  assert.equal(result.after, "<group />");
});

test("synthesize_geometry tool returns a contract", () => {
  const result = runJson(`
    import { synthesizeGeometryTool } from "${DIST_ROOT}/tools/synthesizeGeometry.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const input = synthesizeGeometryTool.parameters.parse({
      object_name: "robot",
      style: "futuristic",
      material_preset: "metal_chrome",
      base_color: "#f6f7fb",
      accent_color: "#00F5FF",
      object_id: "robot_1"
    });
    const payload = unwrapToolPayload(await synthesizeGeometryTool.execute(input));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.synthesis_contract.__type, "SYNTHESIS_REQUIRED");
  assert.equal(result.synthesis_contract.object_name, "robot");
  assert.equal(result.synthesis_contract.complexity_tier, "medium");
  assert.equal(result.ready_to_generate, true);
});

test("generate_scene_plan treats mixed style cues as a recommendation instead of a warning", () => {
  const result = runJson(`
    import { generateScenePlanTool } from "${DIST_ROOT}/tools/generateScenePlan.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const payload = unwrapToolPayload(await generateScenePlanTool.execute({
      refined_prompt: "3D robot showcase with futuristic, sleek, high-tech, premium dark styling",
      context: {
        use_case: "website",
        style: "futuristic",
        animation: "none",
        design_tokens: {
          use_case: "website",
          theme: "futuristic",
          animation: "none"
        }
      }
    }));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.scene_plan.style, "futuristic");
  assert.equal(
    result.warnings.some((warning) => warning.includes("Prompt mixes multiple style cues")),
    false
  );
  assert.equal(result.recommendations[0].type, "style_resolution");
  assert.equal(result.recommendations[0].selected_style, "futuristic");
});

test("optimize_for_web tolerates objects without material definitions", () => {
  const result = runJson(`
    import { optimizeForWebTool } from "${DIST_ROOT}/tools/optimizeForWeb.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const payload = unwrapToolPayload(await optimizeForWebTool.execute({
      scene_data: {
        scene_id: "scene_missing_material",
        metadata: {
          title: "Missing Material",
          use_case: "showcase",
          style: "minimal",
          created_at: "2026-03-25T00:00:00.000Z"
        },
        environment: {
          background: {
            type: "color",
            value: "#ffffff"
          }
        },
        camera: {
          type: "perspective",
          position: [0, 1, 4],
          fov: 45,
          target: [0, 0, 0]
        },
        lighting: [
          {
            id: "light_1",
            type: "ambient",
            intensity: 0.5,
            color: "#ffffff"
          }
        ],
        objects: [
          {
            id: "broken_1",
            type: "primitive",
            shape: "box",
            name: "broken box",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        animations: []
      },
      target: "mobile"
    }));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.optimized_scene.objects[0].render_hints.transparency_mode, "opaque");
  assert.equal(result.report.target, "mobile");
});
