import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const requiredPackages = [
  "eslint",
  "@eslint/js",
  "typescript-eslint",
];

const missing = requiredPackages.filter((pkg) => {
  try {
    require.resolve(pkg);
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.error(`[deps] Missing dev dependencies: ${missing.join(", ")}`);
  console.error("[deps] Run: npm install");
  process.exitCode = 1;
} else {
  console.log("[deps] Dev dependency check passed");
}
