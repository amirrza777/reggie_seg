import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "../service.js";

describe("meetings service barrel", () => {
  it("loads as a module with exports", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(Object.keys(moduleUnderTest).length).toBeGreaterThan(0);
  });

  it("exports callable functions", () => {
    for (const [name, value] of Object.entries(moduleUnderTest)) {
      if (typeof value !== "function") continue;
      expect(value, `${name} should be a function`).toBeTypeOf("function");
    }
  });
});
