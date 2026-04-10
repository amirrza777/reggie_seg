import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.js";

function listExports() {
  return Object.keys(moduleUnderTest);
}

describe("repo", () => {
  it("loads as a module with runtime exports", () => {
    const names = listExports();
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(names.length).toBeGreaterThan(0);
  });

  it("keeps a runtime export surface with callable entry points", () => {
    for (const name of listExports()) {
      const value = (moduleUnderTest as Record<string, unknown>)[name];
      expect(value).toBeDefined();
      expect(["function", "object"]).toContain(typeof value);
    }
  });
});