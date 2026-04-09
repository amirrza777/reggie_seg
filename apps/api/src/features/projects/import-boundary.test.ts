import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PROJECTS_DIR = path.resolve(process.cwd(), "src/features/projects");
const FORBIDDEN_IMPORT = "../moduleJoin/";

function listTypeScriptFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }
  return files;
}

function readImportStatements(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const matches = source.match(/from\s+["']([^"']+)["']/g) ?? [];
  return matches.map((match) => match.replace(/^from\s+["']/, "").replace(/["']$/, ""));
}

describe("projects import boundary", () => {
  it("does not import moduleJoin internals from projects feature", () => {
    const files = listTypeScriptFiles(PROJECTS_DIR);
    const offenders = files.flatMap((filePath) => {
      const imports = readImportStatements(filePath);
      const invalid = imports.filter((specifier) => specifier.includes(FORBIDDEN_IMPORT));
      return invalid.map((specifier) => `${path.relative(PROJECTS_DIR, filePath)} -> ${specifier}`);
    });
    expect(offenders).toEqual([]);
  });
});
