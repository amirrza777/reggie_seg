import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.custom-allocation.shared.js";

const expectedFunctionExports = [
  "normalizeCustomAllocationQuestionType",
  "getCustomAllocationResponseThreshold",
  "storeCustomAllocationPreview",
  "getStoredCustomAllocationPreview",
  "parseCustomAllocationAnswers",
  "resolveCustomAllocationTeamNames",
  "findStaleStudentsFromPreview",
  "deleteCustomAllocationPreview",
] as const;

const expectedValueExports = [
  "CUSTOM_ALLOCATION_PREVIEW_TTL_MS",
] as const;

function getNamedExport(name: string) {
  return (moduleUnderTest as Record<string, unknown>)[name];
}

describe("service.custom-allocation.shared", () => {
  it("exposes callable runtime functions", () => {
    for (const name of expectedFunctionExports) {
      expect(getNamedExport(name)).toBeTypeOf("function");
    }
  });

  it("exposes expected runtime values", () => {
    for (const name of expectedValueExports) {
      expect(getNamedExport(name)).toBeDefined();
    }
  });

  it("includes the expected export names", () => {
    const expectedNames = [...expectedFunctionExports, ...expectedValueExports];
    expect(Object.keys(moduleUnderTest)).toEqual(expect.arrayContaining(expectedNames));
  });
});