import { describe, expect, it } from "vitest";
import { planCustomAllocationTeams, type CustomAllocationRespondent } from "./customAllocator.js";

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

function createStudent(id: number): Student {
  return {
    id,
    firstName: `Student${id}`,
    lastName: "Test",
    email: `student${id}@example.com`,
  };
}

function createRespondent(
  id: number,
  responses: Record<number, unknown>,
): CustomAllocationRespondent<Student> {
  return {
    ...createStudent(id),
    responses,
  };
}

describe("team allocation custom allocator", () => {
  it("returns deterministic output for the same seed", () => {
    const respondents = Array.from({ length: 10 }, (_unused, index) =>
      createRespondent(index + 1, {
        1: index < 5 ? "A" : "B",
      }),
    );

    const first = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 3 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 12345,
    });
    const second = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 3 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 12345,
    });

    expect(first).toEqual(second);
  });

  it("diversify strategy spreads categories across teams", () => {
    const respondents = [
      createRespondent(1, { 1: "A" }),
      createRespondent(2, { 1: "A" }),
      createRespondent(3, { 1: "A" }),
      createRespondent(4, { 1: "A" }),
      createRespondent(5, { 1: "B" }),
      createRespondent(6, { 1: "B" }),
      createRespondent(7, { 1: "B" }),
      createRespondent(8, { 1: "B" }),
    ];

    const plan = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 5 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 7,
    });

    for (const team of plan.teams) {
      const ids = team.members.map((member) => member.id);
      const hasA = ids.some((id) => id <= 4);
      const hasB = ids.some((id) => id >= 5);
      expect(hasA).toBe(true);
      expect(hasB).toBe(true);
    }
  });

  it("group strategy clusters similar categories together", () => {
    const respondents = [
      createRespondent(1, { 1: "A" }),
      createRespondent(2, { 1: "A" }),
      createRespondent(3, { 1: "A" }),
      createRespondent(4, { 1: "A" }),
      createRespondent(5, { 1: "B" }),
      createRespondent(6, { 1: "B" }),
      createRespondent(7, { 1: "B" }),
      createRespondent(8, { 1: "B" }),
    ];

    const plan = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "group", weight: 5 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 17,
    });

    const dominantRatios = plan.teams.map((team) => {
      const counts = team.members.reduce(
        (acc, member) => {
          const key = member.id <= 4 ? "A" : "B";
          acc[key] += 1;
          return acc;
        },
        { A: 0, B: 0 },
      );
      return Math.max(counts.A, counts.B) / team.members.length;
    });

    expect(dominantRatios[0]).toBeGreaterThanOrEqual(0.75);
    expect(dominantRatios[1]).toBeGreaterThanOrEqual(0.75);
  });

  it("higher criterion weight biases optimisation toward that criterion", () => {
    const respondents = [
      createRespondent(1, { 1: "A", 2: "X" }),
      createRespondent(2, { 1: "A", 2: "X" }),
      createRespondent(3, { 1: "A", 2: "X" }),
      createRespondent(4, { 1: "A", 2: "X" }),
      createRespondent(5, { 1: "B", 2: "Y" }),
      createRespondent(6, { 1: "B", 2: "Y" }),
      createRespondent(7, { 1: "B", 2: "Y" }),
      createRespondent(8, { 1: "B", 2: "Y" }),
    ];

    const groupWeighted = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [
        { questionId: 1, strategy: "group", weight: 5 },
        { questionId: 2, strategy: "diversify", weight: 1 },
      ],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 99,
      iterations: 1500,
    });

    const diversifyWeighted = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [
        { questionId: 1, strategy: "group", weight: 1 },
        { questionId: 2, strategy: "diversify", weight: 5 },
      ],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 99,
      iterations: 1500,
    });

    const groupPriorityScoreQ1 = groupWeighted.criterionScores.find((score) => score.questionId === 1)!;
    const groupPriorityScoreQ2 = groupWeighted.criterionScores.find((score) => score.questionId === 2)!;
    const diversifyPriorityScoreQ1 = diversifyWeighted.criterionScores.find((score) => score.questionId === 1)!;
    const diversifyPriorityScoreQ2 = diversifyWeighted.criterionScores.find((score) => score.questionId === 2)!;

    expect(groupPriorityScoreQ1.satisfactionScore).toBeGreaterThan(diversifyPriorityScoreQ1.satisfactionScore);
    expect(diversifyPriorityScoreQ2.satisfactionScore).toBeGreaterThan(groupPriorityScoreQ2.satisfactionScore);
  });

  it("handles non-respondents using both strategies", () => {
    const respondents = [
      createRespondent(1, { 1: "A" }),
      createRespondent(2, { 1: "B" }),
      createRespondent(3, { 1: "A" }),
      createRespondent(4, { 1: "B" }),
    ];
    const nonRespondents = [createStudent(10), createStudent(11), createStudent(12)];

    const distributed = planCustomAllocationTeams({
      respondents,
      nonRespondents,
      criteria: [{ questionId: 1, strategy: "diversify", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      seed: 501,
    });
    const distributedSizes = distributed.teams.map((team) => team.members.length);
    expect(distributed.unassignedNonRespondents).toEqual([]);
    expect(distributed.teams.flatMap((team) => team.members).filter((member) => member.responseStatus === "NO_RESPONSE")).toHaveLength(3);
    expect(Math.max(...distributedSizes) - Math.min(...distributedSizes)).toBeLessThanOrEqual(1);

    const excluded = planCustomAllocationTeams({
      respondents,
      nonRespondents,
      criteria: [{ questionId: 1, strategy: "diversify", weight: 2 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 501,
    });
    expect(excluded.unassignedNonRespondents.map((student) => student.id).sort((a, b) => a - b)).toEqual([
      10, 11, 12,
    ]);
    expect(excluded.teams.flatMap((team) => team.members)).toHaveLength(4);
  });

  it("handles edge cases", () => {
    const respondents = [
      createRespondent(1, { 1: 1 }),
      createRespondent(2, { 1: 1 }),
      createRespondent(3, { 1: 1 }),
    ];

    const singleTeam = planCustomAllocationTeams({
      respondents,
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "group", weight: 3 }],
      teamCount: 1,
      nonRespondentStrategy: "exclude",
      seed: 10,
    });
    expect(singleTeam.teams).toHaveLength(1);
    expect(singleTeam.teams[0].members).toHaveLength(3);

    const allDifferent = planCustomAllocationTeams({
      respondents: [
        createRespondent(1, { 1: "A" }),
        createRespondent(2, { 1: "B" }),
        createRespondent(3, { 1: "C" }),
      ],
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "group", weight: 3 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      seed: 12,
    });
    expect(allDifferent.overallScore).toBeGreaterThanOrEqual(0);
    expect(allDifferent.overallScore).toBeLessThanOrEqual(1);

    const zeroRespondents = planCustomAllocationTeams({
      respondents: [],
      nonRespondents: [createStudent(20), createStudent(21)],
      criteria: [{ questionId: 1, strategy: "diversify", weight: 3 }],
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      seed: 21,
    });
    expect(zeroRespondents.teams.flatMap((team) => team.members)).toHaveLength(2);
    expect(zeroRespondents.teams.flatMap((team) => team.members).every((member) => member.responseStatus === "NO_RESPONSE")).toBe(true);

    expect(() =>
      planCustomAllocationTeams({
        respondents: [createRespondent(1, { 1: "A" })],
        nonRespondents: [],
        criteria: [{ questionId: 1, strategy: "group", weight: 2 }],
        teamCount: 2,
        nonRespondentStrategy: "exclude",
      }),
    ).toThrow("teamCount cannot exceed the number of students");
  });
});