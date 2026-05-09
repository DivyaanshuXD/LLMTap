import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetsDir = resolve(root, "packages/dashboard/dist/assets");

const limits = [
  {
    label: "dashboard route chunk",
    pattern: /^Dashboard-.*\.js$/,
    maxKb: 95,
  },
  {
    label: "main app shell",
    pattern: /^index-.*\.js$/,
    maxKb: 450,
  },
  {
    label: "lazy recharts chunk",
    pattern: /^line-chart-recharts-.*\.js$/,
    maxKb: 430,
  },
];

function sizeKb(file) {
  return statSync(resolve(assetsDir, file)).size / 1024;
}

function fail(message) {
  console.error(`Dashboard bundle check failed: ${message}`);
  process.exit(1);
}

let files;
try {
  files = readdirSync(assetsDir).filter((file) => file.endsWith(".js"));
} catch {
  fail("packages/dashboard/dist/assets is missing. Run dashboard build first.");
}

for (const limit of limits) {
  const matches = files.filter((file) => limit.pattern.test(file));
  if (matches.length === 0) {
    fail(`missing ${limit.label}`);
  }

  const largest = matches
    .map((file) => ({ file, kb: sizeKb(file) }))
    .sort((a, b) => b.kb - a.kb)[0];

  if (largest.kb > limit.maxKb) {
    fail(
      `${limit.label} ${largest.file} is ${largest.kb.toFixed(1)} KB; limit is ${limit.maxKb} KB`
    );
  }

  console.log(
    `Dashboard bundle check: ${limit.label} ${largest.file} ${largest.kb.toFixed(1)} KB`
  );
}
