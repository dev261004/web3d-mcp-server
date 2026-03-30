/** @jest-environment node */
// @ts-nocheck

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const DIST_ROOT = process.env.TEST_DIST_ROOT ?? "./dist";

function runJson(script) {
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output.trim());
}

function buildPreviewScript() {
  return `
    import { buildPreviewResult } from "${DIST_ROOT}/tools/preview.tool.js";

    const scene = {
      scene_id: "scene_preview_mock",
      metadata: {
        title: "Robot Overlap Test",
        use_case: "showcase",
        style: "futuristic",
        design_tokens: {
          use_case: "showcase",
          theme: "futuristic",
          material_preset: "metal_chrome",
          animation: "float",
          lighting_preset: "neon_edge",
          background_preset: "dark_studio",
          composition: "hero_centered"
        },
        color_hints: [
          {
            name: "cyan",
            hex: "#00e5ff",
            role: "accent"
          }
        ],
        created_at: "2026-03-25T00:00:00.000Z"
      },
      environment: {
        background: {
          type: "color",
          value: "#050a15"
        }
      },
      camera: {
        type: "perspective",
        position: [0, 2.1, 5.5],
        fov: 48,
        target: [0, 0, 0]
      },
      lighting: [
        {
          id: "light_spot_1",
          type: "spot",
          position: [-3.8, 2.6, 2.4],
          intensity: 1.08,
          color: "#00e5ff"
        }
      ],
      objects: [
        {
          id: "robot_1",
          type: "synthesis_contract",
          name: "Robot Alpha",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            type: "metal",
            color: "#f6f7fb",
            metalness: 1,
            roughness: 0.05
          },
          synthesis_contract: {
            __type: "SYNTHESIS_REQUIRED",
            category: "humanoid",
            bounding_box: [0.6, 1.8, 0.5]
          }
        },
        {
          id: "robot_2",
          type: "primitive",
          name: "Robot Beta",
          position: [0.1, 0, 0.1],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            type: "metal",
            color: "#d9ecff",
            metalness: 0.9,
            roughness: 0.1
          }
        }
      ],
      animations: [
        {
          id: "anim_missing_target",
          target: "ghost_robot",
          target_id: "ghost_robot_id",
          type: "float",
          config: {
            amplitude: 0.2,
            speed: 1.1,
            axis: "y"
          },
          loop: true
        }
      ]
    };

    const result = buildPreviewResult(scene, "top", {
      previewId: "00000000-0000-4000-8000-000000000000",
      generatedAt: "2026-03-25T00:00:00.000Z"
    });

    console.log(JSON.stringify(result));
  `;
}

function buildCategoryPreviewScript() {
  return `
    import { buildPreviewResult } from "${DIST_ROOT}/tools/preview.tool.js";

    const scene = {
      scene_id: "scene_preview_categories",
      metadata: {
        title: "Category Preview",
        use_case: "showcase",
        style: "premium",
        design_tokens: {
          use_case: "showcase",
          theme: "premium",
          material_preset: "metal_chrome",
          animation: "none",
          lighting_preset: "studio_soft",
          background_preset: "dark_studio",
          composition: "hero_centered"
        },
        color_hints: [
          {
            name: "cyan",
            hex: "#00e5ff",
            role: "accent"
          }
        ],
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
      lighting: [],
      objects: [
        {
          id: "bag_1",
          type: "synthesis_contract",
          name: "luxury_handbag",
          position: [-1, 0, 0.2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          synthesis_contract: {
            __type: "SYNTHESIS_REQUIRED",
            category: "container",
            bounding_box: [1, 0.7, 0.45]
          }
        },
        {
          id: "surface_1",
          type: "synthesis_contract",
          name: "ground_reflection",
          position: [0, -1, -0.8],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          synthesis_contract: {
            __type: "SYNTHESIS_REQUIRED",
            category: "surface",
            bounding_box: [6, 0.05, 6]
          }
        },
        {
          id: "particles_1",
          type: "synthesis_contract",
          name: "floating_particles",
          position: [1.2, 0.6, -0.1],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          synthesis_contract: {
            __type: "SYNTHESIS_REQUIRED",
            category: "particle_system",
            bounding_box: [1.2, 1.2, 1.2]
          }
        }
      ],
      animations: []
    };

    const result = buildPreviewResult(scene, "top", {
      previewId: "11111111-1111-4111-8111-111111111111",
      generatedAt: "2026-03-30T00:00:00.000Z"
    });

    console.log(JSON.stringify(result));
  `;
}

test("buildPreviewResult generates SVG wireframe with scene title and pending marker", () => {
  const result = runJson(buildPreviewScript());

  assert.equal(result.preview_id, "00000000-0000-4000-8000-000000000000");
  assert.equal(result.generated_at, "2026-03-25T00:00:00.000Z");
  assert.equal(result.scene_id, "scene_preview_mock");
  assert.match(result.svg_wireframe, /^<svg[\s\S]*<\/svg>$/);
  assert.match(result.svg_wireframe, /fill="#050a15"/);
  assert.match(result.svg_wireframe, /Robot Overlap Test/);
  assert.match(result.svg_wireframe, /#00e5ff/);
  assert.match(result.svg_wireframe, /pending/i);
  assert.match(result.svg_wireframe, /stroke-dasharray="4 2"/);
  assert.match(result.svg_wireframe, /\u2726|✦/);
});

test("buildPreviewResult reports overlap warning and invalid animation target failure", () => {
  const result = runJson(buildPreviewScript());
  const checksById = Object.fromEntries(
    result.text_description.spatial_validation.checks.map((check) => [check.id, check])
  );

  assert.equal(checksById.check_1_bounds.status, "PASS");
  assert.equal(checksById.check_2_overlap.status, "WARN");
  assert.equal(checksById.check_3_camera.status, "PASS");
  assert.equal(checksById.check_4_lighting.status, "PASS");
  assert.equal(checksById.check_5_synthesis_pending.status, "WARN");
  assert.equal(checksById.check_6_animation_target.status, "FAIL");
  assert.equal(result.text_description.spatial_validation.passed, 3);
  assert.equal(result.text_description.spatial_validation.total, 6);
  assert.equal(result.text_description.spatial_validation.confidence_score, 5);
  assert.match(
    result.text_description.spatial_validation.recommendation,
    /Fix spatial issues before calling generate_r3f_code/
  );
  assert.match(result.text_description.scene_overview, /Background: deep navy #050a15/);
  assert.match(result.text_description.objects[0], /\[Robot Alpha\].*synthesis: PENDING/);
  assert.match(result.text_description.animation_summary[0], /ghost_robot_id/);
});

test("buildPreviewResult uses category-aware SVG shapes for bags, surfaces, and particles", () => {
  const result = runJson(buildCategoryPreviewScript());

  assert.match(result.svg_wireframe, /data-object-id="bag_1"[\s\S]*<rect/s);
  assert.match(result.svg_wireframe, /data-object-id="surface_1"[\s\S]*height="4"/s);
  assert.match(result.svg_wireframe, /data-object-id="particles_1"[\s\S]*<circle[\s\S]*<circle[\s\S]*<circle/s);
  assert.match(result.svg_wireframe, /\u26a0 pending|⚠ pending/);
  assert.match(result.svg_wireframe, /solid stroke = resolved, dashed stroke = pending synthesis/);
});
