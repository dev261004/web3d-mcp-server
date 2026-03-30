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

test("resolveDefaultComplexity covers the expected mapping combinations", () => {
  const result = runJson(`
    import { resolveDefaultComplexity } from "${DIST_ROOT}/lib/complexity.profiles.js";

    console.log(JSON.stringify({
      advertisement_hero: resolveDefaultComplexity("advertisement", "hero_centered"),
      advertisement_product: resolveDefaultComplexity("advertisement", "product_closeup"),
      website_hero: resolveDefaultComplexity("website", "hero_centered"),
      website_floating: resolveDefaultComplexity("website", "floating_showcase"),
      showcase_hero: resolveDefaultComplexity("showcase", "hero_centered"),
      showcase_floating: resolveDefaultComplexity("showcase", "floating_showcase"),
      mobile_override: resolveDefaultComplexity("website", "hero_centered", "mobile"),
      fallback: resolveDefaultComplexity()
    }));
  `);

  assert.deepEqual(result, {
    advertisement_hero: "high",
    advertisement_product: "medium",
    website_hero: "high",
    website_floating: "medium",
    showcase_hero: "high",
    showcase_floating: "high",
    mobile_override: "low",
    fallback: "medium"
  });
});

test("complexity profiles shape the synthesis contract as expected", () => {
  const result = runJson(`
    import { buildSynthesisContract } from "${DIST_ROOT}/lib/synthesisContract.js";

    const low = buildSynthesisContract({
      objectId: "robot_low",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF",
      complexity: "low"
    });

    const high = buildSynthesisContract({
      objectId: "robot_high",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF",
      complexity: "high"
    });

    console.log(JSON.stringify({
      low: {
        min_parts: low.min_parts,
        max_parts: low.max_parts,
        geometryOnly: low.constraints.geometryOnly,
        assemblyHint: low.constraints.assemblyHint
      },
      high: {
        min_parts: high.min_parts,
        max_parts: high.max_parts,
        bounding_box: high.bounding_box,
        geometryOnly: high.constraints.geometryOnly,
        assemblyHint: high.constraints.assemblyHint
      }
    }));
  `);

  assert.equal(result.low.min_parts, 4);
  assert.equal(result.low.max_parts, 7);
  assert.equal(result.high.min_parts, 28);
  assert.equal(result.high.max_parts, null);
  assert.deepEqual(result.high.bounding_box, [0.6, 1.8, 0.5]);
  assert.doesNotMatch(result.low.geometryOnly, /CapsuleGeometry/);
  assert.match(result.high.geometryOnly, /RingGeometry/);
  assert.doesNotMatch(result.low.assemblyHint, /knee joint/i);
  assert.match(result.high.assemblyHint, /knee joint/i);
});

test("category-aware synthesis contracts use correct hints and bounding boxes", () => {
  const result = runJson(`
    import { buildSynthesisContract } from "${DIST_ROOT}/lib/synthesisContract.js";

    const handbag = buildSynthesisContract({
      objectId: "bag_1",
      objectName: "luxury_handbag",
      style: "premium",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#c6924c",
      complexity: "high"
    });

    const particles = buildSynthesisContract({
      objectId: "particles_1",
      objectName: "floating_particles",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF",
      complexity: "high"
    });

    const surface = buildSynthesisContract({
      objectId: "surface_1",
      objectName: "ground_reflection",
      style: "minimal",
      materialPreset: "glass_clear",
      baseColor: "#e5e7eb",
      accentColor: "#00F5FF",
      complexity: "high"
    });

    console.log(JSON.stringify({
      handbag: {
        category: handbag.category,
        bounding_box: handbag.bounding_box,
        assemblyHint: handbag.constraints.assemblyHint
      },
      particles: {
        category: particles.category,
        bounding_box: particles.bounding_box,
        assemblyHint: particles.constraints.assemblyHint
      },
      surface: {
        category: surface.category,
        bounding_box: surface.bounding_box,
        assemblyHint: surface.constraints.assemblyHint
      }
    }));
  `);

  assert.equal(result.handbag.category, "container");
  assert.deepEqual(result.handbag.bounding_box, [1, 0.7, 0.45]);
  assert.match(result.handbag.assemblyHint, /bag|flap|handle|hardware/i);
  assert.doesNotMatch(result.handbag.assemblyHint, /knee joint|forearm|leg/i);

  assert.equal(result.particles.category, "particle_system");
  assert.deepEqual(result.particles.bounding_box, [1.2, 1.2, 1.2]);
  assert.match(result.particles.assemblyHint, /particles/i);
  assert.doesNotMatch(result.particles.assemblyHint, /torso|knee joint/i);

  assert.equal(result.surface.category, "surface");
  assert.deepEqual(result.surface.bounding_box, [6, 0.05, 6]);
  assert.match(result.surface.assemblyHint, /plane|ring|radial/i);
  assert.doesNotMatch(result.surface.assemblyHint, /head|arm|leg/i);
});

test('synthesize_geometry resolves target "mobile" to low complexity when complexity is omitted', () => {
  const result = runJson(`
    import { synthesizeGeometryTool } from "${DIST_ROOT}/tools/synthesizeGeometry.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const input = synthesizeGeometryTool.parameters.parse({
      object_name: "robot",
      style: "futuristic",
      material_preset: "metal_chrome",
      base_color: "#f6f7fb",
      accent_color: "#00F5FF",
      object_id: "robot_mobile",
      target: "mobile"
    });
    const payload = unwrapToolPayload(await synthesizeGeometryTool.execute(input));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.synthesis_contract.complexity_tier, "low");
  assert.equal(result.synthesis_contract.min_parts, 4);
});

test('synthesize_geometry defaults omitted complexity to "medium" for non-mobile targets', () => {
  const result = runJson(`
    import { synthesizeGeometryTool } from "${DIST_ROOT}/tools/synthesizeGeometry.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const input = synthesizeGeometryTool.parameters.parse({
      object_name: "robot",
      style: "futuristic",
      material_preset: "metal_chrome",
      base_color: "#f6f7fb",
      accent_color: "#00F5FF",
      object_id: "robot_default"
    });
    const payload = unwrapToolPayload(await synthesizeGeometryTool.execute(input));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.synthesis_contract.complexity_tier, "medium");
  assert.equal(result.synthesis_contract.min_parts, 10);
});
