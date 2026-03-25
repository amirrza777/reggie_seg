import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.types.js";

describe("repo.types", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });
});