import { describe, expect, it } from "vitest";
import {
  parseAssessmentAnswersBody,
  parseAssessmentIdParam,
  parseAssessmentQuery,
  parseCreateAssessmentBody,
  parseProjectIdParam,
  parseUserIdAndProjectIdParams,
  parseUserIdAndTeamIdQuery,
} from "./controller.parsers.js";

describe("peerAssessment controller parsers", () => {
  it("parses route and query identifiers", () => {
    expect(parseUserIdAndTeamIdQuery({ query: { userId: "4" }, params: { teamId: "1" } })).toEqual({
      ok: true,
      value: { userId: 4, teamId: 1 },
    });
    expect(
      parseAssessmentQuery({ query: { projectId: "1", teamId: "2", reviewerId: "3", revieweeId: "4" } }),
    ).toEqual({
      ok: true,
      value: { projectId: 1, teamId: 2, reviewerId: 3, revieweeId: 4 },
    });
    expect(parseAssessmentIdParam("8")).toEqual({ ok: true, value: 8 });
    expect(parseUserIdAndProjectIdParams({ params: { userId: "4", projectId: "9" } })).toEqual({
      ok: true,
      value: { userId: 4, projectId: 9 },
    });
    expect(parseProjectIdParam("7")).toEqual({ ok: true, value: 7 });
  });

  it("parses assessment mutation bodies", () => {
    expect(
      parseCreateAssessmentBody({
        projectId: 1,
        teamId: 1,
        reviewerUserId: 4,
        revieweeUserId: 2,
        templateId: 10,
        answersJson: [{ question: "1", answer: "x" }],
      }),
    ).toEqual({
      ok: true,
      value: {
        projectId: 1,
        teamId: 1,
        reviewerUserId: 4,
        revieweeUserId: 2,
        templateId: 10,
        answersJson: [{ question: "1", answer: "x" }],
      },
    });
    expect(parseAssessmentAnswersBody({ answersJson: { 1: "x" } })).toEqual({
      ok: true,
      value: { answersJson: { 1: "x" } },
    });
  });
});
