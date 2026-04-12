import { describe, expect, it } from "vitest";
import { planCustomAllocationTeams } from "./customAllocator.js";

function respondents() {
  return [
    { id: 1, firstName: "A", responses: { 1: "x", 2: 1 } },
    { id: 2, firstName: "B", responses: { 1: "x", 2: 2 } },
    { id: 3, firstName: "C", responses: { 1: "y", 2: 3 } },
    { id: 4, firstName: "D", responses: { 1: "y", 2: 4 } },
  ];
}

describe("customAllocator", () => {
  it("rejects invalid teamCount and empty student populations", () => {
    expect(() =>
      planCustomAllocationTeams({ respondents: respondents(), nonRespondents: [], criteria: [], teamCount: 0, nonRespondentStrategy: "exclude" }),
    ).toThrow("teamCount must be a positive integer");
    expect(() =>
      planCustomAllocationTeams({ respondents: [], nonRespondents: [], criteria: [], teamCount: 1, nonRespondentStrategy: "exclude" }),
    ).toThrow("students must include at least one student");
  });

  it("treats non-array respondent collections as empty", () => {
    expect(() =>
      planCustomAllocationTeams({
        respondents: null as any,
        nonRespondents: "invalid" as any,
        criteria: [],
        teamCount: 1,
        nonRespondentStrategy: "exclude",
      }),
    ).toThrow("students must include at least one student");
  });

  it("rejects impossible team counts and invalid criterion weights", () => {
    expect(() =>
      planCustomAllocationTeams({ respondents: respondents(), nonRespondents: [], criteria: [], teamCount: 9, nonRespondentStrategy: "exclude" }),
    ).toThrow("teamCount cannot exceed the number of students");
    expect(() =>
      planCustomAllocationTeams({
        respondents: respondents(),
        nonRespondents: [],
        criteria: [{ questionId: 1, strategy: "group", weight: 7 }],
        teamCount: 2,
        nonRespondentStrategy: "exclude",
      }),
    ).toThrow("criterion weights must be between 1 and 5");
  });

  it("returns respondent-only teams when non-respondent strategy is exclude", () => {
    const result = planCustomAllocationTeams({
      respondents: respondents(),
      nonRespondents: [{ id: 5, firstName: "E" }],
      criteria: [{ questionId: 1, strategy: "group", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 8,
    });
    expect(result.unassignedNonRespondents).toEqual([{ id: 5, firstName: "E" }]);
    expect(result.teams.flatMap((team) => team.members).every((member) => member.responseStatus === "RESPONDED")).toBe(true);
  });

  it("distributes non-respondents when requested and keeps scores bounded", () => {
    const result = planCustomAllocationTeams({
      respondents: respondents(),
      nonRespondents: [{ id: 5, firstName: "E" }],
      criteria: [{ questionId: 2, strategy: "diversify", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      seed: 8,
      iterations: 5,
    });
    expect(result.teams.flatMap((team) => team.members)).toHaveLength(5);
    expect(result.unassignedNonRespondents).toHaveLength(0);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it("honors constrained team sizes for distribution", () => {
    const result = planCustomAllocationTeams({
      respondents: respondents().slice(0, 2),
      nonRespondents: [{ id: 5, firstName: "E" }, { id: 6, firstName: "F" }],
      criteria: [{ questionId: 1, strategy: "group", weight: 1 }],
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      minTeamSize: 2,
      maxTeamSize: 2,
      seed: 3,
    });
    expect(result.teams[0]?.members).toHaveLength(2);
    expect(result.teams[1]?.members).toHaveLength(2);
  });

  it("distributes non-respondents with a single team using zero start offset", () => {
    const result = planCustomAllocationTeams({
      respondents: respondents().slice(0, 1),
      nonRespondents: [{ id: 5, firstName: "E" }],
      criteria: [{ questionId: 1, strategy: "group", weight: 1 }],
      teamCount: 1,
      nonRespondentStrategy: "distribute_randomly",
      seed: 3,
      minTeamSize: 2,
      maxTeamSize: 2,
    });
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0]?.members).toHaveLength(2);
  });

  it("throws when team-size constraints cannot fit assigned population", () => {
    expect(() =>
      planCustomAllocationTeams({
        respondents: respondents(),
        nonRespondents: [],
        criteria: [{ questionId: 1, strategy: "group", weight: 1 }],
        teamCount: 2,
        nonRespondentStrategy: "exclude",
        minTeamSize: 3,
        maxTeamSize: 3,
      }),
    ).toThrow("team size constraints cannot be satisfied");
  });
});
