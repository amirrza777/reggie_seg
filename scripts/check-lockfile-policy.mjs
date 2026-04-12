#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function parseNullSeparated(output) {
  return output
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parentDir(filePath) {
  const slashIndex = filePath.lastIndexOf("/");
  return slashIndex === -1 ? "." : filePath.slice(0, slashIndex);
}

function packageJsonForLockfile(lockfilePath) {
  const dir = parentDir(lockfilePath);
  return dir === "." ? "package.json" : `${dir}/package.json`;
}

function main() {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();
  process.chdir(repoRoot);

  const tracked = parseNullSeparated(runGit(["ls-files", "-z"]));
  const trackedSet = new Set(tracked);

  const disallowed = tracked.filter((path) => path.endsWith("yarn.lock") || path.endsWith("pnpm-lock.yaml"));
  const packageLocks = tracked.filter((path) => path.endsWith("package-lock.json"));
  const orphanPackageLocks = packageLocks.filter((lockfilePath) => !trackedSet.has(packageJsonForLockfile(lockfilePath)));

  if (disallowed.length === 0 && orphanPackageLocks.length === 0) {
    console.log("Lockfile policy check passed.");
    return;
  }

  console.error("Lockfile policy check failed.");

  if (disallowed.length > 0) {
    console.error("\nDisallowed lockfiles (repo standard is npm):");
    for (const path of disallowed.sort()) {
      console.error(`- ${path}`);
    }
  }

  if (orphanPackageLocks.length > 0) {
    console.error("\npackage-lock.json files without sibling package.json:");
    for (const path of orphanPackageLocks.sort()) {
      console.error(`- ${path}`);
    }
  }

  process.exit(1);
}

main();
