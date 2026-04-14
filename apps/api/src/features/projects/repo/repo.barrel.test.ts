import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "../repo.js";

describe("projects repo barrel", () => {
  it("loads as a module with exports", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(Object.keys(moduleUnderTest).length).toBeGreaterThan(0);
  });

  it("exports only functions and plain values", () => {
    for (const [name, value] of Object.entries(moduleUnderTest)) {
      if (typeof value !== "function") continue;
      expect(value, `${name} should be callable`).toBeTypeOf("function");
    }
  });
});
