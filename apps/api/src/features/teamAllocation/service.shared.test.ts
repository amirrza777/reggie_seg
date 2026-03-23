import { describe, expect, it } from "vitest";
import {
  buildConstrainedCustomPopulation,
  buildConstrainedRandomPlan,
  normalizeTeamSizeConstraints,
} from "./service.shared.js";

describe("service.shared", () => {
  it("normalizes valid constraints and rejects invalid ranges", () => {
    expect(normalizeTeamSizeConstraints({ minTeamSize: 2, maxTeamSize: 4 })).toEqual({ minTeamSize: 2, maxTeamSize: 4 });
    expect(() => normalizeTeamSizeConstraints({ minTeamSize: 5, maxTeamSize: 4 })).toThrow();
  });

  it("builds a constrained random plan and tracks unassigned students", () => {
    const plan = buildConstrainedRandomPlan([1, 2, 3, 4], 3, { maxTeamSize: 1 });
    const assigned = plan.teams.reduce((sum, team) => sum + team.members.length, 0);
    expect(plan.teams).toHaveLength(3);
    expect(assigned).toBe(3);
    expect(plan.unassignedStudents).toHaveLength(1);
  });

  it("honors non-respondent strategy in constrained custom planning", () => {
    const exclude = buildConstrainedCustomPopulation([1, 2], [3, 4], 2, { maxTeamSize: 1 }, "exclude");
    const distribute = buildConstrainedCustomPopulation([1], [2, 3], 2, { maxTeamSize: 2 }, "distribute_randomly");
    expect(exclude.assignableNonRespondents).toHaveLength(0);
    expect(exclude.unassignedNonRespondents).toHaveLength(2);
    expect(distribute.assignableNonRespondents.length).toBeGreaterThan(0);
  });
});