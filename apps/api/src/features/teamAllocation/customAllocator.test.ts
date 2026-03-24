import { describe, expect, it } from "vitest";
import { planCustomAllocationTeams } from "./customAllocator.js";

function createRespondents() {
  return [
    { id: 1, firstName: "A", responses: new Map([[1, "x"]]) },
    { id: 2, firstName: "B", responses: new Map([[1, "x"]]) },
    { id: 3, firstName: "C", responses: new Map([[1, "y"]]) },
    { id: 4, firstName: "D", responses: new Map([[1, "y"]]) },
  ];
}

describe("customAllocator", () => {
  it("rejects invalid teamCount", () => {
    expect(() =>
      planCustomAllocationTeams({
        respondents: createRespondents(),
        nonRespondents: [],
        criteria: [],
        teamCount: 0,
        nonRespondentStrategy: "exclude",
      }),
    ).toThrow("teamCount must be a positive integer");
  });

  it("keeps non-respondents unassigned when strategy is exclude", () => {
    const result = planCustomAllocationTeams({
      respondents: createRespondents(),
      nonRespondents: [{ id: 5, firstName: "E" }],
      criteria: [{ questionId: 1, strategy: "group", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 8,
    });
    expect(result.unassignedNonRespondents).toHaveLength(1);
  });

  it("distributes non-respondents when strategy is distribute_randomly", () => {
    const result = planCustomAllocationTeams({
      respondents: createRespondents(),
      nonRespondents: [{ id: 5, firstName: "E" }],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      seed: 8,
    });
    const total = result.teams.flatMap((team) => team.members).length;
    expect(total).toBe(5);
    expect(result.unassignedNonRespondents).toHaveLength(0);
  });
});