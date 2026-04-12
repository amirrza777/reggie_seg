import { describe, expect, it } from "vitest";
import {
  buildConstrainedCustomPopulation,
  buildConstrainedRandomPlan,
  normalizeTeamSizeConstraints,
} from "./service.shared.js";

describe("service.shared", () => {
  it("normalizes valid constraints and rejects invalid ranges", () => {
    expect(normalizeTeamSizeConstraints({ minTeamSize: 2, maxTeamSize: 4 })).toEqual({ minTeamSize: 2, maxTeamSize: 4 });
    expect(normalizeTeamSizeConstraints({})).toEqual({});
    expect(() => normalizeTeamSizeConstraints({ minTeamSize: 5, maxTeamSize: 4 })).toThrow();
  });

  it("rejects invalid max team size constraint", () => {
    expect(() => normalizeTeamSizeConstraints({ maxTeamSize: 0 })).toThrow();
  });

  it("rejects invalid min team size constraint", () => {
    expect(() => normalizeTeamSizeConstraints({ minTeamSize: 0 })).toThrow();
  });

  it("builds a constrained random plan and tracks unassigned students", () => {
    const plan = buildConstrainedRandomPlan([1, 2, 3, 4], 3, { maxTeamSize: 1 });
    const assigned = plan.teams.reduce((sum, team) => sum + team.members.length, 0);
    expect(plan.teams).toHaveLength(3);
    expect(assigned).toBe(3);
    expect(plan.unassignedStudents).toHaveLength(1);
  });

  it("returns empty active teams when min size blocks team creation", () => {
    const plan = buildConstrainedRandomPlan([1], 3, { minTeamSize: 2 });
    expect(plan.teams).toEqual([
      { index: 0, members: [] },
      { index: 1, members: [] },
      { index: 2, members: [] },
    ]);
    expect(plan.unassignedStudents).toHaveLength(1);
  });

  it("honors non-respondent strategy in constrained custom planning", () => {
    const exclude = buildConstrainedCustomPopulation([1, 2], [3, 4], 2, { maxTeamSize: 1 }, "exclude");
    const distribute = buildConstrainedCustomPopulation([1], [2, 3], 2, { maxTeamSize: 2 }, "distribute_randomly");
    expect(exclude.assignableNonRespondents).toHaveLength(0);
    expect(exclude.unassignedNonRespondents).toHaveLength(2);
    expect(distribute.assignableNonRespondents.length).toBeGreaterThan(0);
  });

  it("keeps non-respondents unassigned when capacity is fully used by respondents", () => {
    const population = buildConstrainedCustomPopulation([1, 2, 3], [4, 5], 1, { maxTeamSize: 3 }, "distribute_randomly");
    expect(population.assignableRespondents).toHaveLength(3);
    expect(population.assignableNonRespondents).toHaveLength(0);
    expect(population.unassignedNonRespondents).toHaveLength(2);
  });
});
