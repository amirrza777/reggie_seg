import { describe, expect, it } from "vitest";
import { planRandomTeams } from "./randomizer.js";

describe("randomizer", () => {
  it.each([0, -1, 2.5])("rejects invalid teamCount %p", (teamCount) => {
    expect(() => planRandomTeams([1, 2, 3], teamCount as number)).toThrow(
      "teamCount must be a positive integer",
    );
  });

  it("creates balanced teams", () => {
    const teams = planRandomTeams([1, 2, 3, 4, 5, 6, 7], 3, { seed: 42 });
    const sizes = teams.map((team) => team.members.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(7);
  });

  it("is deterministic with the same seed", () => {
    const students = [1, 2, 3, 4, 5, 6];
    const first = planRandomTeams(students, 3, { seed: 9 });
    const second = planRandomTeams(students, 3, { seed: 9 });
    expect(first).toEqual(second);
  });
});