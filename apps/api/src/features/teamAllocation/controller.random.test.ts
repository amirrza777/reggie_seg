import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.random.js";

describe("controller.random", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["previewRandomAllocationHandler","applyRandomAllocationHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});