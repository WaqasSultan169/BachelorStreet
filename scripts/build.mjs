import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const HEAP = "--max-old-space-size=8192";
const nodeOptions = [process.env.NODE_OPTIONS, HEAP].filter(Boolean).join(" ");

// Constrain Next's build workers unless the caller overrides it. Each worker
// loads the app (mongoose, etc.); on low-memory machines the default one-per-CPU
// count exhausts RAM during "Collecting page data".
const buildCpus = process.env.NEXT_BUILD_CPUS ?? "1";

const nextBin = require.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions, NEXT_BUILD_CPUS: buildCpus },
});

process.exit(result.status ?? 1);
