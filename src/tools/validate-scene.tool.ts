import { randomUUID } from "node:crypto";
import type { FastMCP } from "fastmcp";
import { z } from "zod";
import type {
  SceneData,
  Severity,
  ValidateSceneOutput,
  ValidationResult
} from "../types/validate-scene.types.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";
import { VALIDATOR_DEFINITIONS } from "../validators/index.js";

const VALIDATE_SCENE_DESCRIPTION = `Validate scene_data before generating 3D code.

Runs 12 structural checks across 4 categories:
  S — Structure (4 rules): scene_id, objects array, camera validity
  O — Objects  (5 rules): ids, positions, frustum bounds, 
                           overlap, pending synthesis contracts
  L — Lighting (2 rules): non-ambient light presence, 
                           intensity range
  A — Animation(2 rules): target_id resolution, config fields

Severity levels:
  error → blocks codegen. Must fix before generate_r3f_code.
  warn  → does not block. Review before proceeding.

Returns is_valid: true only when zero "error" rules fail.
Returns next_step string with exact instruction for what to do next.

Call this tool AFTER generate_scene and BEFORE synthesize_geometry.
If is_valid is false, call edit_scene to fix errors, then 
re-run validate_scene before proceeding to codegen.`;

const validateSceneSchema = z.object({
  scene_data: z
    .object({})
    .passthrough()
    .describe("The scene_data object from generate_scene or edit_scene."),
  strict: z
    .boolean()
    .default(false)
    .describe(`When true, treat "warn" severity as "error". Useful for CI/CD pipelines or production exports.`)
});

function buildPassResult(
  rule_id: string,
  rule_name: string,
  severity: Severity
): ValidationResult {
  return {
    rule_id,
    rule_name,
    severity,
    status: "pass",
    message: null,
    fix_hint: null,
    affected: null
  };
}

function normalizeSceneData(scene_data: unknown): SceneData {
  if (!scene_data || typeof scene_data !== "object" || Array.isArray(scene_data)) {
    return {};
  }

  return scene_data as SceneData;
}

function buildNextStep(
  is_valid: boolean,
  warnings: number,
  errorCount: number,
  strict: boolean,
  totalRulesRun: number,
  hasUnresolvedSynthesisContracts: boolean
) {
  if (hasUnresolvedSynthesisContracts) {
    return "ERROR: Unresolved synthesis contracts detected. Call synthesize_geometry for each pending object before calling generate_r3f_code.";
  }

  const strictPrefix = strict ? "[STRICT MODE] " : "";

  if (!is_valid) {
    return `${strictPrefix}BLOCKED: Fix ${errorCount} error(s) before proceeding. See errors_detail for required fixes.`;
  }

  if (warnings > 0) {
    return `${strictPrefix}READY WITH WARNINGS: ${warnings} warning(s) found. Review results, then call synthesize_geometry or generate_r3f_code.`;
  }

  return `${strictPrefix}READY: All ${totalRulesRun} validation checks passed. Proceed to synthesize_geometry → generate_r3f_code.`;
}

export function buildValidateSceneOutput(scene_data: SceneData, strict = false): ValidateSceneOutput {
  const results = VALIDATOR_DEFINITIONS.map((definition) => {
    const validationFailure = definition.validate(scene_data);

    if (!validationFailure) {
      return buildPassResult(definition.rule_id, definition.rule_name, definition.severity);
    }

    const promoted = strict && validationFailure.severity === "warn";

    return {
      ...validationFailure,
      severity: promoted ? "error" : validationFailure.severity,
      ...(promoted
        ? {
            promoted: true,
            original_severity: validationFailure.severity
          }
        : {})
    };
  });

  const passed = results.filter((result) => result.status === "pass").length;
  const warnings = results.filter((result) => result.status === "fail" && result.severity === "warn").length;
  const errors = results.filter((result) => result.status === "fail" && result.severity === "error").length;
  const promotedToError = results.filter((result) => result.promoted === true).length;
  const is_valid = errors === 0;
  const errors_detail = results
    .filter((result) => result.status === "fail" && result.severity === "error")
    .map((result) => ({
      rule_id: result.rule_id,
      message: result.message ?? "",
      fix_hint: result.fix_hint ?? ""
    }));
  const hasUnresolvedSynthesisContracts = results.some((result) => result.rule_id === "O5" && result.status === "fail");

  return {
    validation_id: randomUUID(),
    scene_id: typeof scene_data.scene_id === "string" ? scene_data.scene_id : "",
    validated_at: new Date().toISOString(),
    strict_mode: strict,
    is_valid,
    summary: {
      total_rules_run: VALIDATOR_DEFINITIONS.length,
      passed,
      warnings,
      errors,
      promoted_to_error: promotedToError,
      blocked: !is_valid
    },
    results,
    errors_detail,
    next_step: buildNextStep(
      is_valid,
      warnings,
      errors_detail.length,
      strict,
      VALIDATOR_DEFINITIONS.length,
      hasUnresolvedSynthesisContracts
    )
  };
}

export function registerValidateSceneTool(server: FastMCP): void {
  server.addTool(validateSceneTool);
}

export const validateSceneTool = {
  name: "validate_scene",
  description: VALIDATE_SCENE_DESCRIPTION,
  parameters: validateSceneSchema,

  async execute({ scene_data, strict = false }: z.infer<typeof validateSceneSchema>) {
    const normalizedScene = normalizeSceneData(unwrapToolPayload<SceneData>(scene_data, "scene_data"));

    return createToolResult(buildValidateSceneOutput(normalizedScene, strict));
  }
};
