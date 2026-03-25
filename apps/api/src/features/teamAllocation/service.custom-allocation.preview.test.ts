import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.custom-allocation.preview.js";

describe("service.custom-allocation.preview", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["previewCustomAllocationForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});