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

function buildPerfectScene() {
  return {
    scene_id: "perfect_scene",
    metadata: {
      title: "Perfect Scene",
      use_case: "website",
      style: "futuristic",
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
      position: [0, 2, 5],
      fov: 45,
      target: [0, 0, 0]
    },
    lighting: [
      {
        id: "spot_1",
        type: "spot",
        intensity: 1.2,
        color: "#ffffff",
        position: [1, 3, 2]
      }
    ],
    objects: [
      {
        id: "robot_1",
        type: "primitive",
        name: "robot",
        shape: "box",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          type: "metal",
          color: "#f6f7fb"
        }
      }
    ],
    animations: [
      {
        id: "anim_float_1",
        target: "robot",
        target_id: "robot_1",
        type: "float",
        config: {
          amplitude: 0.18
        },
        loop: true
      }
    ]
  };
}

function validateScene(scene, strict = false) {
  const payload = JSON.stringify({ scene_data: scene, strict });

  return runJson(`
    import { validateSceneTool } from "${DIST_ROOT}/tools/validate-scene.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const result = unwrapToolPayload(await validateSceneTool.execute(${payload}));
    console.log(JSON.stringify(result));
  `);
}

function getFailedRules(result) {
  return result.results.filter((entry) => entry.status === "fail");
}

function getRule(result, ruleId) {
  return result.results.find((entry) => entry.rule_id === ruleId);
}

test("perfect_scene passes every validation rule", () => {
  const result = validateScene(buildPerfectScene());

  assert.equal(result.strict_mode, false);
  assert.equal(result.is_valid, true);
  assert.equal(result.summary.total_rules_run, 13);
  assert.equal(result.summary.passed, 13);
  assert.equal(result.summary.warnings, 0);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.promoted_to_error, 0);
  assert.deepEqual(getFailedRules(result), []);
  assert.match(result.next_step, /READY:/);
});

test("missing_scene_id blocks validation with S1 error", () => {
  const scene = buildPerfectScene();
  delete scene.scene_id;
  const result = validateScene(scene);
  const failedRules = getFailedRules(result);

  assert.equal(result.is_valid, false);
  assert.deepEqual(failedRules.map((entry) => entry.rule_id), ["S1"]);
  assert.equal(failedRules[0].severity, "error");
  assert.match(result.next_step, /BLOCKED/);
});

test("dead_animation_target blocks validation and points to the real object id", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "dead_animation_target";
  scene.animations[0].target_id = "ghost-id-999";
  const result = validateScene(scene);
  const rule = getRule(result, "A1");

  assert.equal(result.is_valid, false);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "error");
  assert.match(rule.fix_hint, /robot_1/);
  assert.match(result.next_step, /BLOCKED/);
});

test("overlapping_objects returns a warning on O4 without blocking", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "overlapping_objects";
  scene.objects.push({
    id: "robot_2",
    type: "primitive",
    name: "robot_clone",
    shape: "box",
    position: [0.1, 0, 0.1],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      type: "metal",
      color: "#cccccc"
    }
  });
  const result = validateScene(scene);
  const rule = getRule(result, "O4");

  assert.equal(result.is_valid, true);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "warn");
  assert.deepEqual(rule.affected.sort(), ["robot", "robot_clone"]);
  assert.match(result.next_step, /READY WITH WARNINGS/);
});

test("out_of_bounds_object returns a warning on O3", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "out_of_bounds_object";
  scene.objects[0].position = [3.5, 0, 0];
  const result = validateScene(scene);
  const rule = getRule(result, "O3");

  assert.equal(result.is_valid, true);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "warn");
  assert.match(result.next_step, /READY WITH WARNINGS/);
});

test("pending_synthesis_contracts blocks on O5 without strict mode", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "pending_synthesis_contracts";
  scene.objects[0].type = "synthesis_contract";
  scene.objects[0].shape = "SYNTHESIS_REQUIRED";
  scene.objects[0].synthesis_contract = {
    __type: "SYNTHESIS_REQUIRED"
  };
  const result = validateScene(scene);
  const rule = getRule(result, "O5");

  assert.equal(result.is_valid, false);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "error");
  assert.match(rule.message, /synthesize_geometry/);
  assert.equal(
    result.next_step,
    "ERROR: Unresolved synthesis contracts detected. Call synthesize_geometry for each pending object before calling generate_r3f_code."
  );
});

test("strict_mode_warns_become_errors blocks overlapping_objects", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "strict_mode_warns_become_errors";
  scene.objects.push({
    id: "robot_2",
    type: "primitive",
    name: "robot_clone",
    shape: "box",
    position: [0.1, 0, 0.1],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      type: "metal",
      color: "#cccccc"
    }
  });
  const result = validateScene(scene, true);
  const rule = getRule(result, "O4");

  assert.equal(result.strict_mode, true);
  assert.equal(result.is_valid, false);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "error");
  assert.equal(rule.promoted, true);
  assert.equal(rule.original_severity, "warn");
  assert.equal(result.errors_detail[0].rule_id, "O4");
  assert.equal(result.summary.promoted_to_error, 1);
  assert.match(result.next_step, /\[STRICT MODE\] BLOCKED/);
});

test("ambient_light_only returns a warning on L1", () => {
  const scene = buildPerfectScene();
  scene.scene_id = "ambient_light_only";
  scene.lighting = [
    {
      id: "ambient_1",
      type: "ambient",
      intensity: 0.5,
      color: "#ffffff"
    }
  ];
  const result = validateScene(scene);
  const rule = getRule(result, "L1");

  assert.equal(result.is_valid, true);
  assert.equal(rule.status, "fail");
  assert.equal(rule.severity, "warn");
  assert.match(result.next_step, /READY WITH WARNINGS/);
});
