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

function runGenerateScenePlan(refinedPrompt, context = {}) {
  const prompt = JSON.stringify(refinedPrompt);
  const ctx = JSON.stringify(context);

  return runJson(`
    import { generateScenePlanTool } from "${DIST_ROOT}/tools/generateScenePlan.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const payload = unwrapToolPayload(await generateScenePlanTool.execute({
      refined_prompt: ${prompt},
      context: ${ctx}
    }));

    console.log(JSON.stringify(payload));
  `);
}

test("scaffolding word filter keeps watch and wallet only", () => {
  const result = runGenerateScenePlan(
    "Watch ad. Secondary object: wallet.",
    {
      use_case: "advertisement",
      style: "premium",
      animation: "float"
    }
  );

  assert.ok(result.scene_plan.objects.includes("watch"));
  assert.ok(result.scene_plan.objects.includes("wallet"));
  assert.ok(!result.scene_plan.objects.includes("secondary"));
  assert.ok(!result.scene_plan.objects.includes("object"));
});

test("material descriptor filter excludes finish accent hardware and glossy", () => {
  const result = runGenerateScenePlan(
    "Premium rotating watch advertisement with glossy finish and gold accent hardware.",
    {
      use_case: "advertisement",
      style: "premium",
      animation: "rotate"
    }
  );

  assert.ok(result.scene_plan.objects.includes("watch"));
  assert.ok(!result.scene_plan.objects.includes("finish"));
  assert.ok(!result.scene_plan.objects.includes("accent"));
  assert.ok(!result.scene_plan.objects.includes("hardware"));
  assert.ok(!result.scene_plan.objects.includes("glossy"));
});

test("primary object ordering follows first known object mention", () => {
  const result = runGenerateScenePlan(
    "A wallet next to a watch on a dark surface.",
    {
      use_case: "advertisement",
      style: "premium",
      animation: "none"
    }
  );

  assert.equal(result.scene_plan.objects[0], "wallet");
  assert.equal(result.scene_plan.objects[1], "watch");
});

test("known vocabulary priority keeps phone and excludes scene glow and pedestal", () => {
  const result = runGenerateScenePlan(
    "A dark futuristic scene with a glowing phone floating above a pedestal.",
    {
      use_case: "website",
      style: "futuristic",
      animation: "float"
    }
  );

  assert.ok(result.scene_plan.objects.includes("phone"));
  assert.ok(!result.scene_plan.objects.includes("pedestal"));
  assert.ok(!result.scene_plan.objects.includes("scene"));
  assert.ok(!result.scene_plan.objects.includes("glow"));
  assert.ok(!result.scene_plan.objects.includes("glowing"));
});

test("animation words are not treated as objects when sneaker is present", () => {
  const result = runGenerateScenePlan(
    "Rotating sneaker with float and bounce animations.",
    {
      use_case: "advertisement",
      style: "premium",
      animation: "rotate",
      confirmed_objects: ["sneaker"]
    }
  );

  assert.ok(result.scene_plan.objects.includes("sneaker"));
  assert.ok(!result.scene_plan.objects.includes("rotate"));
  assert.ok(!result.scene_plan.objects.includes("float"));
  assert.ok(!result.scene_plan.objects.includes("bounce"));
  assert.ok(!result.scene_plan.objects.includes("animations"));
});
