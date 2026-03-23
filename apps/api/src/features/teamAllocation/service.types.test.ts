import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.types.js";

describe("service.types", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });
});