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
      expect((moduleUnderTest as Record<string, unknown>)[name]).toBeTypeOf("function");
    }
  });
});