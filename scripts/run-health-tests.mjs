import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const healthDistDir = resolve(rootDir, ".health-dist");
const tscBin = resolve(rootDir, "node_modules/typescript/bin/tsc");
const jestBin = resolve(rootDir, "node_modules/jest/bin/jest.js");
const healthSuites = [
  "tests/apply-animation.test.ts",
  "tests/refine-prompt.test.ts",
  "tests/preview.test.ts",
  "tests/export-asset.test.ts",
  "tests/validate-scene.test.ts",
  "tests/synthesis.test.ts",
  "tests/complexity.test.ts"
];

function runStep(label, command, args, extraEnv = {}) {
  console.log(`${label}...`);

  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function cleanupHealthArtifacts() {
  if (existsSync(healthDistDir)) {
    rmSync(healthDistDir, { recursive: true, force: true });
  }
}

cleanupHealthArtifacts();

try {
  runStep("Compiling temporary health-check artifacts", process.execPath, [
    tscBin,
    "-p",
    "tsconfig.json",
    "--outDir",
    ".health-dist"
  ]);

  runStep("Running Jest health suite", process.execPath, [jestBin, "--runInBand", ...healthSuites], {
    TEST_DIST_ROOT: "./.health-dist"
  });
} finally {
  cleanupHealthArtifacts();
}
