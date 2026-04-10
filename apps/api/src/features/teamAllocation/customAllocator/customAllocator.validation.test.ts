import { describe, expect, it } from "vitest";
import {
  assignIndexesToTeamTargets,
  distributeCountAcrossTeamCapacities,
  resolveTeamSizeTargets,
} from "./customAllocator.validation.js";

describe("customAllocator.validation", () => {
  it("builds balanced team size targets with constraints", () => {
    expect(resolveTeamSizeTargets(10, 3, 3, 4)).toEqual([4, 3, 3]);
    expect(resolveTeamSizeTargets(5, 2)).toEqual([3, 2]);
  });

  it.each([
    [() => resolveTeamSizeTargets(6, 2, 0, 3), "minTeamSize must be a positive integer"],
    [() => resolveTeamSizeTargets(6, 2, 1, 0), "maxTeamSize must be a positive integer"],
    [() => resolveTeamSizeTargets(6, 2, 4, 3), "minTeamSize cannot exceed maxTeamSize"],
    [() => resolveTeamSizeTargets(3, 2, 2, 2), "team size constraints cannot be satisfied for the given student count"],
  ])("rejects invalid size configuration", (run, message) => {
    expect(run).toThrow(message);
  });

  it("distributes counts without exceeding capacities", () => {
    expect(distributeCountAcrossTeamCapacities(5, [2, 2, 2])).toEqual([2, 2, 1]);
  });

  it("throws when respondent count exceeds total capacities", () => {
    expect(() => distributeCountAcrossTeamCapacities(3, [1, 1])).toThrow(
      "respondents cannot fit into constrained team sizes",
    );
  });

  it("assigns indexes across team targets and guards overfill", () => {
    expect(assignIndexesToTeamTargets([10, 11, 12], [2, 1])).toEqual([[10, 12], [11]]);
    expect(() => assignIndexesToTeamTargets([1, 2, 3], [1, 1])).toThrow("team size targets are overfilled");
  });
});