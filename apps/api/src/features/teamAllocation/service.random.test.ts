import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.random.js";

describe("service.random", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["previewRandomAllocationForProject","applyRandomAllocationForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});