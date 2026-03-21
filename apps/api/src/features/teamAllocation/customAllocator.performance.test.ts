import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { planCustomAllocationTeams, type CustomAllocationRespondent } from "./customAllocator.js";

type BenchmarkStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

function createBenchmarkStudent(id: number): BenchmarkStudent {
  return {
    id,
    firstName: `Student${id}`,
    lastName: "Benchmark",
    email: `student${id}@example.com`,
  };
}

function createBenchmarkRespondent(
  id: number,
  responses: Record<number, unknown>,
): CustomAllocationRespondent<BenchmarkStudent> {
  return {
    ...createBenchmarkStudent(id),
    responses,
  };
}

describe("team allocation custom allocator performance", () => {
  it("completes within 5 seconds for 500 students", () => {
    const totalStudents = 500;
    const respondentCount = 420;
    const respondents = Array.from({ length: respondentCount }, (_unused, index) => {
      const id = index + 1;
      return createBenchmarkRespondent(id, {
        1: index % 5, // slider-like numeric
        2: index % 2 === 0 ? "Backend" : "Frontend", // multiple-choice categorical
        3: (index % 5) + 1, // rating-like numeric
      });
    });
    const nonRespondents = Array.from({ length: totalStudents - respondentCount }, (_unused, index) =>
      createBenchmarkStudent(respondentCount + index + 1),
    );

    const start = performance.now();
    const plan = planCustomAllocationTeams({
      respondents,
      nonRespondents,
      criteria: [
        { questionId: 1, strategy: "diversify", weight: 4 },
        { questionId: 2, strategy: "group", weight: 3 },
        { questionId: 3, strategy: "diversify", weight: 5 },
      ],
      teamCount: 25,
      nonRespondentStrategy: "distribute_randomly",
      seed: 2026,
    });
    const durationMs = performance.now() - start;

    expect(durationMs).toBeLessThanOrEqual(5000);
    const assignedStudents = plan.teams.reduce((sum, team) => sum + team.members.length, 0);
    expect(assignedStudents + plan.unassignedNonRespondents.length).toBe(totalStudents);
  });
});