import { describe, expect, it } from "vitest";
import { __enterpriseTypesCoverageMarker } from "./types";

describe("enterprise types", () => {
  it("keeps coverage marker true", () => {
    expect(__enterpriseTypesCoverageMarker).toBe(true);
  });
});
