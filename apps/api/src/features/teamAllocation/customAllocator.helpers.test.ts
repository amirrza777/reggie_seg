import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./customAllocator.helpers.js";

describe("customAllocator.helpers", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createSeededRng","shuffle","normalizeResponseValue","mean","variance","roundToTwo","stripResponses"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});