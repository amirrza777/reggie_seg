import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.js";

describe("service", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(Object.keys(moduleUnderTest).length).toBeGreaterThan(0);
  });
});