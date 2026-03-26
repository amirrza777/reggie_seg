import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.invites-scope.test-helpers.js";

const expectedFunctionExports = [
  "setupTeamAllocationRepoTestDefaults",
] as const;

const expectedValueExports = [
  "prisma",
] as const;

function getNamedExport(name: string) {
  return (moduleUnderTest as Record<string, unknown>)[name];
}

describe("repo.invites-scope.test-helpers", () => {
  it("exposes callable runtime functions", () => {
    for (const name of expectedFunctionExports) {
      expect(getNamedExport(name)).toBeTypeOf("function");
    }
  });

  it("exposes expected runtime values", () => {
    for (const name of expectedValueExports) {
      expect(getNamedExport(name)).toBeDefined();
      expect(getNamedExport(name)).toBeTypeOf("object");
    }
  });

  it("includes the expected export names", () => {
    const expectedNames = [...expectedFunctionExports, ...expectedValueExports];
    expect(Object.keys(moduleUnderTest)).toEqual(expect.arrayContaining(expectedNames));
  });
});