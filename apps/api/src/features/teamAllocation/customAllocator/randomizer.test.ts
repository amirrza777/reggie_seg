import { describe, expect, it, vi } from "vitest";
import { planRandomTeams } from "./randomizer.js";

describe("randomizer", () => {
  it.each([0, -1, 2.5])("rejects invalid teamCount %p", (teamCount) => {
    expect(() => planRandomTeams([1, 2, 3], teamCount as number)).toThrow(
      "teamCount must be a positive integer",
    );
  });

  it("rejects empty student pools and team counts larger than student count", () => {
    expect(() => planRandomTeams([], 2)).toThrow("students must include at least one student");
    expect(() => planRandomTeams([1, 2], 3)).toThrow("teamCount cannot exceed the number of students");
  });

  it.each([
    [{ minTeamSize: 0 }, "minTeamSize must be a positive integer"],
    [{ maxTeamSize: 0 }, "maxTeamSize must be a positive integer"],
    [{ minTeamSize: 3, maxTeamSize: 2 }, "minTeamSize cannot exceed maxTeamSize"],
    [{ minTeamSize: 2, maxTeamSize: 2 }, "team size constraints cannot be satisfied for the given student count"],
  ])("validates team-size constraints %p", (options, message) => {
    expect(() => planRandomTeams([1, 2, 3], 2, options as any)).toThrow(message);
  });

  it("creates balanced teams with explicit size constraints", () => {
    const teams = planRandomTeams([1, 2, 3, 4, 5, 6], 3, { minTeamSize: 2, maxTeamSize: 2, seed: 42 });
    expect(teams).toHaveLength(3);
    expect(teams.every((team) => team.members.length === 2)).toBe(true);
  });

  it("uses provided rng callback and keeps distribution deterministic", () => {
    let calls = 0;
    const rng = () => {
      calls += 1;
      return 0.25;
    };
    const teams = planRandomTeams([1, 2, 3, 4], 2, { rng });
    expect(calls).toBeGreaterThan(0);
    expect(teams.flatMap((team) => team.members).sort()).toEqual([1, 2, 3, 4]);
  });

  it("is deterministic with the same seed", () => {
    const students = [1, 2, 3, 4, 5, 6];
    const first = planRandomTeams(students, 3, { seed: 9 });
    const second = planRandomTeams(students, 3, { seed: 9 });
    expect(first).toEqual(second);
  });

  it("throws when shuffled iteration produces more students than planned target capacity", () => {
    const students = [1] as number[];
    (students as any)[Symbol.iterator] = function* iterator() {
      yield 1;
      yield 2;
    };
    expect(() => planRandomTeams(students as any, 1, { rng: () => 0.1 })).toThrow(
      "team size targets are overfilled",
    );
  });

  it("skips swap operations when sparse-array values are undefined", () => {
    const sparse = [1, undefined, 3] as Array<number | undefined>;
    const teams = planRandomTeams(sparse, 2, { rng: () => 0.2 });
    expect(teams).toHaveLength(2);
    expect(teams.flatMap((team) => team.members).length).toBe(3);
  });

  it("covers constrained target loop branches when some teams are already full", () => {
    const fromSpy = vi.spyOn(Array, "from");
    fromSpy.mockImplementationOnce(() => [2, 1] as any);
    const planned = planRandomTeams([1, 2, 3], 2, { minTeamSize: 1, maxTeamSize: 2, seed: 1 });
    expect(planned.flatMap((team) => team.members)).toHaveLength(3);

    fromSpy.mockImplementationOnce(() => [2, 2] as any);
    expect(() => planRandomTeams([1, 2, 3], 2, { minTeamSize: 1, maxTeamSize: 2, seed: 1 })).toThrow(
      "team size constraints cannot be satisfied for the given student count",
    );
    fromSpy.mockRestore();
  });
});
