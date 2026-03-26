#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appRoot = process.cwd();
const manifestPath = path.join(appRoot, ".next", "routes-manifest.json");

if (fs.existsSync(manifestPath)) {
  process.exit(0);
}

console.log("No production Next build found. Running `npm run build`...");

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Failed to run `npm run build`:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
