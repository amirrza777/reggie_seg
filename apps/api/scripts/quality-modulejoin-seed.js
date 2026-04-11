import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = process.cwd();
const MODULE_JOIN_DIR = path.join(ROOT, "src/features/moduleJoin");
const SEED_RUNTIME_DIR = path.join(ROOT, "prisma/seed");
const SEED_TEST_GLOB_DIR = path.join(ROOT, "src/prisma");

const PROD_FN_MAX = 35;
const TEST_FILE_MAX = 250;

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, acc);
      continue;
    }
    if (predicate(full)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function findLongFunctions(files, maxLen) {
  const issues = [];
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) &&
        node.body
      ) {
        const start = source.getLineAndCharacterOfPosition(node.body.getStart(source)).line + 1;
        const end = source.getLineAndCharacterOfPosition(node.body.getEnd()).line + 1;
        const len = end - start + 1;
        if (len > maxLen) issues.push({ file: rel(file), start, end, len });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return issues;
}

function countAsAny(files) {
  let count = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(/\bas any\b/g);
    count += matches?.length ?? 0;
  }
  return count;
}

const runtimeFiles = [
  ...walk(MODULE_JOIN_DIR, (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts")),
  ...walk(SEED_RUNTIME_DIR, (f) => /\.(ts|tsx)$/.test(f)),
];

const testFiles = [
  ...walk(MODULE_JOIN_DIR, (f) => f.endsWith(".test.ts")),
  ...walk(SEED_TEST_GLOB_DIR, (f) => f.endsWith(".seed.test.ts") || f.endsWith(".integration.seed.test.ts")),
];

const longProdFunctions = findLongFunctions(runtimeFiles, PROD_FN_MAX);
const longTestFiles = testFiles
  .map((file) => ({ file: rel(file), lines: fs.readFileSync(file, "utf8").split("\n").length }))
  .filter((row) => row.lines > TEST_FILE_MAX);
const asAnyCount = countAsAny(testFiles);

if (longProdFunctions.length > 0) {
  console.error("[quality] production function length violations:");
  for (const issue of longProdFunctions) {
    console.error(`- ${issue.file}:${issue.start}-${issue.end} (${issue.len} lines)`);
  }
}

if (longTestFiles.length > 0) {
  console.error("[quality] test file length violations:");
  for (const issue of longTestFiles) {
    console.error(`- ${issue.file} (${issue.lines} lines)`);
  }
}

if (asAnyCount > 0) {
  console.error(`[quality] as any occurrences in moduleJoin+seed tests: ${asAnyCount}`);
}

if (longProdFunctions.length > 0 || longTestFiles.length > 0 || asAnyCount > 0) {
  process.exitCode = 1;
} else {
  console.log("[quality] moduleJoin+seed checks passed");
}
