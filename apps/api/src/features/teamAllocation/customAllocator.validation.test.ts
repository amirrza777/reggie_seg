import { describe, expect, it } from "vitest";
import {
  assignIndexesToTeamTargets,
  distributeCountAcrossTeamCapacities,
  resolveTeamSizeTargets,
} from "./customAllocator.validation.js";

describe("customAllocator.validation", () => {
  it("builds balanced team size targets with constraints", () => {
    expect(resolveTeamSizeTargets(10, 3, 3, 4)).toEqual([4, 3, 3]);
  });

  it("rejects impossible size constraints", () => {
    expect(() => resolveTeamSizeTargets(3, 2, 2, 2)).toThrow(
      "team size constraints cannot be satisfied for the given student count",
    );
  });

  it("distributes counts without exceeding capacities", () => {
    expect(distributeCountAcrossTeamCapacities(5, [2, 2, 2])).toEqual([2, 2, 1]);
  });

  it("assigns indexes across team targets and guards overfill", () => {
    expect(assignIndexesToTeamTargets([10, 11, 12], [2, 1])).toEqual([[10, 12], [11]]);
    expect(() => assignIndexesToTeamTargets([1, 2, 3], [1, 1])).toThrow("team size targets are overfilled");
  });
});