import { describe, expect, it } from "vitest";
import { planCustomAllocationTeams } from "./customAllocator.js";

const respondents = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  firstName: `S${index + 1}`,
  responses: new Map([[1, index % 3]]),
}));

describe("customAllocator performance", () => {
  it("handles medium allocations without dropping students", () => {
    const result = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 3 }],
      teamCount: 4,
      nonRespondentStrategy: "exclude",
      seed: 123,
      iterations: 200,
    });
    const assigned = result.teams.flatMap((team) => team.members).length;
    expect(assigned).toBe(16);
  });
});