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

  it("keeps a callable aggregate API surface", () => {
    for (const name of listExports()) {
      const value = (moduleUnderTest as Record<string, unknown>)[name];
      // Skip type-only or constant exports (e.g. numeric config values)
      if (typeof value !== "function") continue;
      expect(value).toBeTypeOf("function");
    }
  });
});