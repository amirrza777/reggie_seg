import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./customAllocator.types.js";

describe("customAllocator.types", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["EPSILON"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});