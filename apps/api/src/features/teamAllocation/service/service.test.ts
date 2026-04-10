import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.js";

function listExports() {
  return Object.keys(moduleUnderTest);
}

describe("service", () => {
  it("loads as a module with runtime exports", () => {
    const names = listExports();
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(names.length).toBeGreaterThan(0);
  });

  it("keeps runtime exports callable or primitive constants", () => {
    for (const name of listExports()) {
      const value = (moduleUnderTest as Record<string, unknown>)[name];
      const valueType = typeof value;
      expect(["function", "number", "string", "boolean"]).toContain(valueType);
    }
  });
});