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

function buildBaseScene({ withSecondObject = false } = {}) {
  const objects = [
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
  ];

  if (withSecondObject) {
    objects.push({
      id: "orb_1",
      type: "primitive",
      name: "orb",
      shape: "sphere",
      position: [1, 0, 0],
      rotation: [0, 0, 0],
      scale: [0.5, 0.5, 0.5],
      material: {
        type: "glass",
        color: "#00F5FF"
      }
    });
  }

  return {
    scene_id: "scene_apply_animation",
    metadata: {
      title: "Apply Animation Test",
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
    lighting: [],
    objects,
    animations: []
  };
}

function runApplyAnimation(input) {
  const payload = JSON.stringify(input);

  return runJson(`
    import { applyAnimationTool } from "${DIST_ROOT}/tools/applyAnimation.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const result = unwrapToolPayload(await applyAnimationTool.execute(${payload}));
    console.log(JSON.stringify(result));
  `);
}

test("bug_regression_range_preserved", () => {
  const scene = buildBaseScene();
  scene.animations = [
    {
      id: "anim_rotate_existing",
      target: "robot",
      target_id: "robot_1",
      type: "rotate",
      resolved_semantics: "continuous",
      config: {
        speed: 0.4,
        axis: "y",
        range: 6.28
      },
      loop: true
    }
  ];

  const result = runApplyAnimation({
    scene_data: scene,
    animation_type: "rotate"
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.applied[0].action, "merged");
  assert.equal(result.applied[0].config_after.range, 6.28);
  assert.equal(result.applied[0].resolved_semantics, "continuous");
});

test("override_true_replaces_range", () => {
  const scene = buildBaseScene();
  scene.animations = [
    {
      id: "anim_rotate_existing",
      target: "robot",
      target_id: "robot_1",
      type: "rotate",
      resolved_semantics: "continuous",
      config: {
        speed: 0.4,
        axis: "y",
        range: 6.28
      },
      loop: true
    }
  ];

  const result = runApplyAnimation({
    scene_data: scene,
    animations: [
      {
        type: "rotate",
        config: {
          range: 0.04
        },
        override: true
      }
    ]
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.applied[0].config_after.range, 0.04);
  assert.equal(result.applied[0].resolved_semantics, "oscillation");
});

test("stacked_float_and_rotate", () => {
  const result = runApplyAnimation({
    scene_data: buildBaseScene(),
    animations: [{ type: "float" }, { type: "rotate" }]
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.scene_data.animations.length, 2);
  assert.ok(result.scene_data.animations.find((entry) => entry.type === "float" && entry.config.amplitude > 0));
  assert.ok(result.scene_data.animations.find((entry) => entry.type === "rotate" && entry.config.range >= 3.14));
  assert.equal(result.channel_conflicts.length, 0);
});

test("channel_conflict_float_and_bounce", () => {
  const result = runApplyAnimation({
    scene_data: buildBaseScene(),
    animations: [{ type: "float" }, { type: "bounce" }]
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.scene_data.animations.length, 2);
  assert.equal(result.channel_conflicts.length, 1);
  assert.match(result.channel_conflicts[0].affected_types.join(","), /float/);
  assert.match(result.channel_conflicts[0].affected_types.join(","), /bounce/);
});

test("backward_compat_single_string", () => {
  const result = runApplyAnimation({
    scene_data: buildBaseScene(),
    animation_type: "float"
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.scene_data.animations.length, 1);
  assert.equal(result.scene_data.animations[0].type, "float");
  assert.equal(result.scene_data.animations[0].config.amplitude, 0.18);
});

test("conflict_both_inputs_error", () => {
  const scene = buildBaseScene();
  const result = runApplyAnimation({
    scene_data: scene,
    animation_type: "float",
    animations: [{ type: "rotate" }]
  });

  assert.equal(result.status, "ERROR");
  assert.deepEqual(result.scene_data, scene);
  assert.match(result.error, /not both/i);
});

test("merge_false_replaces_existing", () => {
  const scene = buildBaseScene();
  scene.animations = [
    {
      id: "anim_float_existing",
      target: "robot",
      target_id: "robot_1",
      type: "float",
      config: {
        speed: 0.9,
        axis: "y",
        amplitude: 0.18
      },
      loop: true
    }
  ];

  const result = runApplyAnimation({
    scene_data: scene,
    animations: [
      {
        type: "float",
        config: {
          amplitude: 0.5
        }
      }
    ],
    merge: false
  });

  const floatAnimations = result.scene_data.animations.filter((entry) => entry.type === "float");

  assert.equal(result.status, "SUCCESS");
  assert.equal(floatAnimations.length, 1);
  assert.equal(floatAnimations[0].config.amplitude, 0.5);
});

test("target_id_omitted_targets_primary", () => {
  const scene = buildBaseScene({ withSecondObject: true });
  const result = runApplyAnimation({
    scene_data: scene,
    animations: [{ type: "rotate" }]
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.applied[0].target_id, "robot_1");
});

test("pulse_preserves_amplitude_and_exposes_derived_scale_fields", () => {
  const firstPass = runApplyAnimation({
    scene_data: buildBaseScene(),
    animations: [
      {
        type: "pulse",
        config: {
          amplitude: 0.03,
          speed: 1.2
        }
      }
    ]
  });

  assert.equal(firstPass.status, "SUCCESS");
  assert.equal(firstPass.applied[0].config_after.amplitude, 0.03);
  assert.equal(firstPass.applied[0].config_after.scale, 1.03);
  assert.deepEqual(firstPass.applied[0].config_after.scale_range, [1, 1.03]);
  assert.deepEqual(firstPass.applied[0].config_after._derived, {
    scale: 1.03,
    scale_range: [1, 1.03]
  });

  const secondPass = runApplyAnimation({
    scene_data: buildBaseScene(),
    animations: [
      {
        type: "pulse",
        config: firstPass.applied[0].config_after
      }
    ]
  });

  assert.equal(secondPass.status, "SUCCESS");
  assert.equal(secondPass.scene_data.animations[0].config.amplitude, 0.03);
  assert.equal(secondPass.scene_data.animations[0].config.scale, 1.03);
  assert.deepEqual(secondPass.scene_data.animations[0].config.scale_range, [1, 1.03]);
});
