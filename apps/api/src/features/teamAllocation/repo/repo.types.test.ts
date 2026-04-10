import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.types.js";

describe("repo.types", () => {
  it("loads as a plain module object", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
    expect(moduleUnderTest).not.toBeNull();
  });

  it("has no runtime exports because it is type-only", () => {
    expect(Object.keys(moduleUnderTest)).toHaveLength(0);
  });
});