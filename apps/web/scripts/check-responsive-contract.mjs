#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const targetDirs = [path.join(rootDir, "app/styles"), path.join(rootDir, "src")];

const canonicalViewportBreakpoints = new Set([640, 768, 1024, 1280]);
const sanctionedViewportBreakpoints = new Set([480, 560, 860, 861]);
const sanctionedContainerBreakpoints = new Set([1320, 1700, 2080]);
const legacyViewportBreakpoints = new Set([
  520,
  600,
  639,
  720,
  899,
  900,
  920,
  980,
  1023,
  1025,
  1080,
  1100,
  1180,
  1200,
  1220,
  1240,
]);
const allowedViewportBreakpoints = new Set([
  ...canonicalViewportBreakpoints,
  ...sanctionedViewportBreakpoints,
  ...legacyViewportBreakpoints,
]);

const allowedHeightBreakpoints = new Set([560, 760, 820]);
const allowedAspectRatios = new Set(["5/4"]);
const strict = process.argv.includes("--strict");

const entries = [];

for (const dir of targetDirs) {
  collectCssFiles(dir, entries);
}

const unknownViewport = [];
const unknownHeight = [];
const unknownAspect = [];
const legacyViewport = [];

for (const entry of entries) {
  for (const value of entry.viewportBreakpoints) {
    if (isSanctionedContainerBreakpoint(value)) {
      continue;
    }
    if (!allowedViewportBreakpoints.has(value.value)) {
      unknownViewport.push(value);
      continue;
    }
    if (legacyViewportBreakpoints.has(value.value)) {
      legacyViewport.push(value);
    }
  }

  for (const value of entry.heightBreakpoints) {
    if (!allowedHeightBreakpoints.has(value.value)) {
      unknownHeight.push(value);
    }
  }

  for (const value of entry.aspectRatios) {
    if (!allowedAspectRatios.has(value.value)) {
      unknownAspect.push(value);
    }
  }
}

const hadUnknown = unknownViewport.length > 0 || unknownHeight.length > 0 || unknownAspect.length > 0;
const hadLegacy = legacyViewport.length > 0;

printHeader();
printBucket("Unknown viewport breakpoint(s)", unknownViewport, (item) => `${item.value}px`);
printBucket("Unknown height breakpoint(s)", unknownHeight, (item) => `${item.value}px`);
printBucket("Unknown aspect-ratio condition(s)", unknownAspect, (item) => item.value);

if (legacyViewport.length > 0) {
  console.log("\nLegacy viewport breakpoints still in use (migration backlog):");
  printGrouped(legacyViewport, (item) => `${item.value}px`);
  console.log("Tip: run with --strict to fail on these and force migration.");
}

if (!hadUnknown && !(strict && hadLegacy)) {
  console.log("\nResponsive contract check passed.");
  process.exit(0);
}

console.error("\nResponsive contract check failed.");
process.exit(1);

function printHeader() {
  console.log("Responsive Contract");
  console.log(`Canonical viewport breakpoints: ${[...canonicalViewportBreakpoints].sort((a, b) => a - b).join(", ")}px`);
  console.log(`Sanctioned viewport breakpoints: ${[...sanctionedViewportBreakpoints].sort((a, b) => a - b).join(", ")}px`);
  console.log(`Sanctioned container-only breakpoints: ${[...sanctionedContainerBreakpoints].sort((a, b) => a - b).join(", ")}px`);
}

function printBucket(title, records, valueFormatter) {
  if (records.length === 0) {
    return;
  }
  console.log(`\n${title}:`);
  printGrouped(records, valueFormatter);
}

function printGrouped(records, valueFormatter) {
  const grouped = new Map();
  for (const record of records) {
    const key = valueFormatter(record);
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }
  for (const key of [...grouped.keys()].sort(sortByNumericSuffix)) {
    const values = grouped.get(key);
    console.log(`- ${key}: ${values.length} occurrence(s)`);
    for (const value of values.slice(0, 8)) {
      console.log(`  - ${value.file}:${value.line}`);
    }
    if (values.length > 8) {
      console.log(`  - ... +${values.length - 8} more`);
    }
  }
}

function sortByNumericSuffix(a, b) {
  const aNum = Number.parseInt(a, 10);
  const bNum = Number.parseInt(b, 10);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return a.localeCompare(b);
}

function collectCssFiles(dir, results) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCssFiles(fullPath, results);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".css")) {
      continue;
    }
    results.push(extractQueryBreakpoints(fullPath));
  }
}

function extractQueryBreakpoints(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const normalizedPath = path.relative(rootDir, filePath);
  const viewportBreakpoints = [];
  const heightBreakpoints = [];
  const aspectRatios = [];
  const queryRegex = /@(media|container)\s+([^{]+)\{/g;
  for (const match of text.matchAll(queryRegex)) {
    const queryType = match[1];
    const header = match[0];
    const baseLine = lineFromIndex(text, match.index ?? 0);
    for (const widthMatch of header.matchAll(/(?:min|max)-width:\s*([0-9]+)px/g)) {
      viewportBreakpoints.push({
        value: Number.parseInt(widthMatch[1], 10),
        file: normalizedPath,
        line: baseLine,
        queryType,
      });
    }
    for (const heightMatch of header.matchAll(/(?:min|max)-height:\s*([0-9]+)px/g)) {
      heightBreakpoints.push({
        value: Number.parseInt(heightMatch[1], 10),
        file: normalizedPath,
        line: baseLine,
        queryType,
      });
    }
    for (const aspectMatch of header.matchAll(/(?:min|max)-aspect-ratio:\s*([0-9]+\/[0-9]+)/g)) {
      aspectRatios.push({
        value: aspectMatch[1],
        file: normalizedPath,
        line: baseLine,
        queryType,
      });
    }
  }
  return {
    file: normalizedPath,
    viewportBreakpoints,
    heightBreakpoints,
    aspectRatios,
  };
}

function isSanctionedContainerBreakpoint(value) {
  return value.queryType === "container" && sanctionedContainerBreakpoints.has(value.value);
}

function lineFromIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "\n") {
      line += 1;
    }
  }
  return line;
}
