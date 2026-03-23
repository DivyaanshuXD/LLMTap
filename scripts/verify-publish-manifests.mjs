import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetArgs = process.argv.slice(2);
const packageDirs =
  targetArgs.length > 0
    ? targetArgs.map((target) => path.resolve(process.cwd(), target))
    : [
        path.join(root, "packages", "shared"),
        path.join(root, "packages", "sdk"),
        path.join(root, "packages", "collector"),
        path.join(root, "packages", "cli"),
      ];

const invalidProtocols = ["workspace:", "file:", "link:"];
const dependencyFields = ["dependencies", "peerDependencies", "optionalDependencies"];
const errors = [];

for (const packageDir of packageDirs) {
  const manifestPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push(`Missing package.json at ${manifestPath}`);
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  for (const field of dependencyFields) {
    const deps = manifest[field] ?? {};
    for (const [name, specifier] of Object.entries(deps)) {
      if (typeof specifier !== "string") continue;
      if (invalidProtocols.some((protocol) => specifier.startsWith(protocol))) {
        errors.push(
          `${manifest.name}: ${field}.${name} uses unsupported publish specifier "${specifier}"`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Publish manifest verification failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Publish manifest verification passed.");
