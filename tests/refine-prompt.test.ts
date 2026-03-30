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

test("refine_prompt filters noisy object hints and exposes discarded hints", () => {
  const result = runJson(`
    import { refinePromptTool } from "${DIST_ROOT}/tools/refinePrompt.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const payload = unwrapToolPayload(await refinePromptTool.execute({
      user_prompt: "Create a luxury handbag that should respond to cursor movement when users hover over it, use rich premium lighting, and add floating particles when idle."
    }));

    console.log(JSON.stringify(payload));
  `);

  const objectHints = result.context.object_hints.map((entry) => entry.toLowerCase());
  const discardedHints = result.context.discarded_hints.map((entry) => entry.toLowerCase());

  assert.ok(objectHints.includes("handbag"));
  assert.ok(objectHints.includes("particles"));

  for (const noise of ["should", "cursor", "movement", "respond", "idle", "rich", "use", "over"]) {
    assert.equal(objectHints.includes(noise), false);
  }

  assert.ok(discardedHints.includes("should"));
  assert.ok(discardedHints.includes("cursor"));
  assert.ok(discardedHints.includes("movement"));
  assert.ok(discardedHints.includes("idle"));
});
