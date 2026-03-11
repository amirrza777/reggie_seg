import { describe, expect, it } from "vitest";
import { planRandomTeams } from "./randomizer.js";

describe("team allocation randomizer", () => {
  it("throws when teamCount is invalid", () => {
    expect(() => planRandomTeams([1, 2, 3], 0)).toThrow("teamCount must be a positive integer");
    expect(() => planRandomTeams([1, 2, 3], -2)).toThrow("teamCount must be a positive integer");
    expect(() => planRandomTeams([1, 2, 3], 2.5)).toThrow("teamCount must be a positive integer");
  });

  it("throws when students are missing", () => {
    expect(() => planRandomTeams([], 1)).toThrow("students must include at least one student");
  });

  it("throws when teamCount exceeds student count", () => {
    expect(() => planRandomTeams([1, 2], 3)).toThrow("teamCount cannot exceed the number of students");
  });

  it("creates balanced teams where size difference is at most one", () => {
    const teams = planRandomTeams([1, 2, 3, 4, 5, 6, 7], 3, { seed: 123 });
    const sizes = teams.map((team) => team.members.length);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);

    expect(teams).toHaveLength(3);
    expect(max - min).toBeLessThanOrEqual(1);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(7);
  });

  it("returns deterministic output when the same seed is used", () => {
    const students = [1, 2, 3, 4, 5, 6, 7, 8];
    const first = planRandomTeams(students, 4, { seed: 9876 });
    const second = planRandomTeams(students, 4, { seed: 9876 });
    const third = planRandomTeams(students, 4, { seed: 5555 });

    expect(first).toEqual(second);
    expect(first).not.toEqual(third);
  });
});