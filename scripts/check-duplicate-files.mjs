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

function isLikelyDuplicateFile(filePath, allPathsSet) {
  const numberSuffix = filePath.match(/^(.*) (\d+)(\.[^/]+)$/);
  if (numberSuffix) {
    const basePath = `${numberSuffix[1]}${numberSuffix[3]}`;
    if (allPathsSet.has(basePath)) {
      return { basePath, style: "space-number" };
    }
  }

  const parenSuffix = filePath.match(/^(.*) \((\d+)\)(\.[^/]+)$/);
  if (parenSuffix) {
    const basePath = `${parenSuffix[1]}${parenSuffix[3]}`;
    if (allPathsSet.has(basePath)) {
      return { basePath, style: "paren-number" };
    }
  }

  return null;
}

function main() {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();
  process.chdir(repoRoot);

  const tracked = parseNullSeparated(runGit(["ls-files", "-z"]));
  const untracked = parseNullSeparated(runGit(["ls-files", "--others", "--exclude-standard", "-z"]));
  const allPaths = [...new Set([...tracked, ...untracked])];
  const allPathsSet = new Set(allPaths);

  const duplicates = [];
  for (const filePath of allPaths) {
    const result = isLikelyDuplicateFile(filePath, allPathsSet);
    if (result) {
      duplicates.push({ filePath, ...result });
    }
  }

  if (duplicates.length === 0) {
    console.log("No accidental duplicate files detected.");
    return;
  }

  console.error("Detected likely accidental duplicate files:");
  for (const duplicate of duplicates.sort((a, b) => a.filePath.localeCompare(b.filePath))) {
    console.error(`- ${duplicate.filePath} (duplicate of ${duplicate.basePath}, pattern=${duplicate.style})`);
  }

  console.error("\nRemove these files before committing.");
  process.exit(1);
}

main();
