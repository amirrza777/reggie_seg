import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.custom-allocation.apply.js";

describe("service.custom-allocation.apply", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["applyCustomAllocationForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});