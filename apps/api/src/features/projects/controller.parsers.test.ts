import { describe, expect, it } from "vitest";
import {
  parseAuthenticatedQueryUserId,
  parseAuthenticatedUserId,
  parseCreateProjectBody,
  parseDeadlineProfileBody,
  parseJoinModuleBody,
  parseModulesListQuery,
  parseProjectAndUserQuery,
  parseProjectIdParam,
  parseProjectTeamAndUserQuery,
  parseProjectTeamRequestAndUserBody,
  parseStaffStudentOverrideRoute,
  parseStudentDeadlineOverrideBody,
  parseTeamHealthMessageBody,
  parseTeamHealthResolveBody,
  parseTeamHealthReviewBody,
  parseTeamIdParam,
} from "./controller.parsers.js";

const validDeadline = {
  taskOpenDate: "2026-03-24T09:00:00.000Z",
  taskDueDate: "2026-03-25T09:00:00.000Z",
  taskDueDateMcf: "2026-03-26T09:00:00.000Z",
  assessmentOpenDate: "2026-03-25T09:00:00.000Z",
  assessmentDueDate: "2026-03-26T09:00:00.000Z",
  assessmentDueDateMcf: "2026-03-27T09:00:00.000Z",
  feedbackOpenDate: "2026-03-26T09:00:00.000Z",
  feedbackDueDate: "2026-03-27T09:00:00.000Z",
  feedbackDueDateMcf: "2026-03-28T09:00:00.000Z",
};

describe("projects controller parsers", () => {
  it("parses create project body", () => {
    const parsed = parseCreateProjectBody({
      name: "  Project Alpha  ",
      moduleId: "2",
      questionnaireTemplateId: 3,
      teamAllocationQuestionnaireTemplateId: 9,
      deadline: validDeadline,
    });
    expect(parsed).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({
          name: "Project Alpha",
          moduleId: 2,
          teamAllocationQuestionnaireTemplateId: 9,
        }),
      }),
    );
  });

  it("validates create project body failures and optional student ids", () => {
    expect(parseCreateProjectBody({ name: "", moduleId: 1, questionnaireTemplateId: 1, deadline: {} as any })).toEqual({
      ok: false,
      error: "Project name is required and must be a string",
    });
    expect(parseCreateProjectBody("bad")).toEqual({ ok: false, error: "Project name must be a string" });
    expect(parseCreateProjectBody({ name: "x".repeat(161), moduleId: 1, questionnaireTemplateId: 1, deadline: {} as any })).toEqual({
      ok: false,
      error: "Project name must be 160 characters or fewer",
    });
    expect(parseCreateProjectBody({ name: "P", moduleId: "x", questionnaireTemplateId: 1, deadline: {} as any })).toEqual({
      ok: false,
      error: "moduleId and questionnaireTemplateId must be positive integers",
    });
    expect(parseCreateProjectBody({ name: "Project", moduleId: 1, questionnaireTemplateId: 1, deadline: "bad" })).toEqual({
      ok: false,
      error: "deadline is required",
    });
    expect(parseCreateProjectBody({ name: "Project", moduleId: 1, questionnaireTemplateId: 1, deadline: validDeadline, teamAllocationQuestionnaireTemplateId: "x" })).toEqual({
      ok: false,
      error: "teamAllocationQuestionnaireTemplateId must be a positive integer",
    });
    expect(parseCreateProjectBody({ name: "Project", moduleId: 1, questionnaireTemplateId: 1, deadline: validDeadline, studentIds: [1, "2"] })).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ studentIds: [1, 2] }),
      }),
    );
    expect(parseCreateProjectBody({ name: "Project", moduleId: 1, questionnaireTemplateId: 1, deadline: validDeadline, studentIds: ["x"] })).toEqual({
      ok: false,
      error: "studentIds must be an array of positive integers",
    });
  });

  it("parses modules list query", () => {
    expect(parseModulesListQuery({ scope: "staff", compact: "1", q: "  data  " })).toEqual({
      ok: true,
      value: { staffOnly: true, compact: true, query: "data" },
    });
  });

  it("validates modules list query errors", () => {
    expect(parseModulesListQuery({ q: "a".repeat(121) })).toEqual({
      ok: false,
      error: "q must be 120 characters or fewer",
    });
    expect(parseModulesListQuery({})).toEqual({
      ok: true,
      value: { staffOnly: false, compact: false },
    });
    expect(parseModulesListQuery(null)).toEqual({
      ok: true,
      value: { staffOnly: false, compact: false },
    });
  });

  it("requires a join code", () => {
    expect(parseJoinModuleBody({ code: "  ABCD1234 " })).toEqual({ ok: true, value: { code: "ABCD1234" } });
    expect(parseJoinModuleBody({ code: "" })).toEqual({ ok: false, error: "code is required" });
    expect(parseJoinModuleBody(null)).toEqual({ ok: false, error: "code is required" });
  });

  it("parses team health message body", () => {
    expect(parseTeamHealthMessageBody({ userId: "7", subject: " Help ", details: " Need support " })).toEqual({
      ok: true,
      value: { userId: 7, subject: "Help", details: "Need support" },
    });
  });

  it("validates team health message body errors", () => {
    expect(parseTeamHealthMessageBody({ userId: "x", subject: "a", details: "b" })).toEqual({
      ok: false,
      error: "Invalid user ID or project ID",
    });
    expect(parseTeamHealthMessageBody({ userId: 1, subject: 1, details: "b" })).toEqual({
      ok: false,
      error: "subject and details are required strings",
    });
    expect(parseTeamHealthMessageBody({ userId: 1, subject: "", details: "" })).toEqual({
      ok: false,
      error: "subject and details cannot be empty",
    });
    expect(parseTeamHealthMessageBody(null)).toEqual({
      ok: false,
      error: "Invalid user ID or project ID",
    });
  });

  it("parses team health review payloads", () => {
    expect(parseTeamHealthReviewBody({ resolved: true, responseText: " Fixed " })).toEqual({
      ok: true,
      value: { resolved: true, responseText: "Fixed" },
    });
    expect(parseTeamHealthReviewBody({ resolved: false })).toEqual({
      ok: true,
      value: { resolved: false },
    });
    expect(parseTeamHealthReviewBody({ resolved: true })).toEqual({
      ok: false,
      error: "responseText is required when resolving a request",
    });
  });

  it("validates team health review payload errors", () => {
    expect(parseTeamHealthReviewBody({ resolved: "yes" })).toEqual({
      ok: false,
      error: "resolved must be a boolean",
    });
    expect(parseTeamHealthReviewBody({ resolved: false, responseText: 1 })).toEqual({
      ok: false,
      error: "responseText must be a string when provided",
    });
    expect(parseTeamHealthReviewBody(null)).toEqual({
      ok: false,
      error: "resolved must be a boolean",
    });
  });

  it("parses and validates team health deadline override payloads", () => {
    expect(
      parseTeamHealthResolveBody({
        taskDueDate: "2026-03-15T12:00:00.000Z",
        deadlineInputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 3 },
      }),
    ).toEqual({
      ok: true,
      value: {
        deadlineOverrides: { taskDueDate: new Date("2026-03-15T12:00:00.000Z") },
        options: { inputMode: "SHIFT_DAYS", shiftDays: { taskDueDate: 3 } },
      },
    });
    expect(parseTeamHealthResolveBody({ taskDueDate: "bad" })).toEqual({
      ok: false,
      error: "taskDueDate must be a valid ISO date string",
    });
    expect(parseTeamHealthResolveBody({ deadlineInputMode: "BAD" })).toEqual({
      ok: false,
      error: "deadlineInputMode must be SHIFT_DAYS or SELECT_DATE when provided",
    });
    expect(parseTeamHealthResolveBody({ shiftDays: [] })).toEqual({
      ok: false,
      error: "shiftDays must be an object when provided",
    });
    expect(parseTeamHealthResolveBody({ shiftDays: { taskDueDate: -1 } })).toEqual({
      ok: false,
      error: "taskDueDate shift must be a whole number of 0 or greater",
    });
    expect(parseTeamHealthResolveBody({ shiftDays: { taskDueDate: "x" } })).toEqual({
      ok: false,
      error: "taskDueDate shift must be a whole number of 0 or greater",
    });
    expect(parseTeamHealthResolveBody({ shiftDays: { taskDueDate: "1" } })).toEqual({
      ok: false,
      error: "taskDueDate shift must be a whole number of 0 or greater",
    });
    expect(parseTeamHealthResolveBody({ shiftDays: { taskDueDate: 0 } })).toEqual({
      ok: true,
      value: { deadlineOverrides: {}, options: { shiftDays: { taskDueDate: 0 } } },
    });
    expect(parseTeamHealthResolveBody({})).toEqual({
      ok: true,
      value: { deadlineOverrides: {}, options: {} },
    });
    expect(parseTeamHealthResolveBody(null)).toEqual({
      ok: true,
      value: { deadlineOverrides: {}, options: {} },
    });
  });

  it("parses auth and route/query helpers", () => {
    expect(parseAuthenticatedUserId({ user: { sub: 2 } } as any)).toEqual({ ok: true, value: 2 });
    expect(parseAuthenticatedUserId({ user: undefined } as any)).toEqual({ ok: false, error: "Unauthorized" });
    expect(parseAuthenticatedQueryUserId({ user: { sub: 2 }, query: {} } as any)).toEqual({ ok: true, value: 2 });
    expect(parseAuthenticatedQueryUserId({ user: undefined, query: {} } as any)).toEqual({
      ok: false,
      error: "Unauthorized",
    });
    expect(parseAuthenticatedQueryUserId({ user: { sub: 2 }, query: { userId: "2" } } as any)).toEqual({
      ok: true,
      value: 2,
    });
    expect(parseAuthenticatedQueryUserId({ user: { sub: 2 }, query: { userId: "x" } } as any)).toEqual({
      ok: false,
      error: "Invalid user ID",
    });
    expect(parseAuthenticatedQueryUserId({ user: { sub: 2 }, query: { userId: "3" } } as any)).toEqual({
      ok: false,
      error: "Forbidden",
    });
    expect(parseProjectIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseProjectIdParam("x")).toEqual({ ok: false, error: "Invalid project ID" });
    expect(parseTeamIdParam("5")).toEqual({ ok: true, value: 5 });
    expect(parseTeamIdParam("x")).toEqual({ ok: false, error: "Invalid team ID" });
  });

  it("parses deadline profile and staff/student route bodies", () => {
    expect(parseDeadlineProfileBody({ deadlineProfile: "STANDARD" })).toEqual({ ok: true, value: "STANDARD" });
    expect(parseDeadlineProfileBody({ deadlineProfile: "BAD" })).toEqual({
      ok: false,
      error: "deadlineProfile must be STANDARD or MCF",
    });
    expect(parseDeadlineProfileBody(null)).toEqual({
      ok: false,
      error: "deadlineProfile must be STANDARD or MCF",
    });
    expect(parseStaffStudentOverrideRoute({ user: { sub: 2 }, params: { projectId: "1", studentId: "3" } } as any)).toEqual({
      ok: true,
      value: { actorUserId: 2, projectId: 1, studentId: 3 },
    });
    expect(parseStaffStudentOverrideRoute({ user: { sub: 2 }, params: { projectId: "x", studentId: "3" } } as any)).toEqual({
      ok: false,
      error: "Invalid project ID or student ID",
    });
    expect(parseStaffStudentOverrideRoute({ user: undefined, params: { projectId: "1", studentId: "3" } } as any)).toEqual({
      ok: false,
      error: "Unauthorized",
    });
    expect(parseStudentDeadlineOverrideBody({ taskDueDate: "2026-03-15T12:00:00.000Z" })).toEqual({
      ok: true,
      value: { taskDueDate: new Date("2026-03-15T12:00:00.000Z") },
    });
    expect(parseStudentDeadlineOverrideBody(null)).toEqual({
      ok: false,
      error: "Override payload must be an object",
    });
  });

  it("parses project and team query helpers", () => {
    expect(parseProjectAndUserQuery({ params: { projectId: "1" }, query: { userId: "2" } } as any)).toEqual({
      ok: true,
      value: { projectId: 1, userId: 2 },
    });
    expect(parseProjectAndUserQuery({ params: { projectId: "x" }, query: { userId: "2" } } as any)).toEqual({
      ok: false,
      error: "Invalid user ID or project ID",
    });
    expect(parseProjectTeamAndUserQuery({ params: { projectId: "1", teamId: "2" }, query: { userId: "3" } } as any)).toEqual({
      ok: true,
      value: { projectId: 1, teamId: 2, userId: 3 },
    });
    expect(parseProjectTeamAndUserQuery({ params: { projectId: "1", teamId: "x" }, query: { userId: "3" } } as any)).toEqual({
      ok: false,
      error: "Invalid user ID, project ID, or team ID",
    });
    expect(
      parseProjectTeamRequestAndUserBody({
        params: { projectId: "1", teamId: "2", requestId: "3" },
        body: { userId: "4" },
      } as any),
    ).toEqual({
      ok: true,
      value: { projectId: 1, teamId: 2, requestId: 3, userId: 4 },
    });
    expect(
      parseProjectTeamRequestAndUserBody({
        params: { projectId: "1", teamId: "2", requestId: "x" },
        body: { userId: "4" },
      } as any),
    ).toEqual({
      ok: false,
      error: "Invalid user ID, project ID, team ID, or request ID",
    });
    expect(
      parseProjectTeamRequestAndUserBody({
        params: { projectId: "1", teamId: "2", requestId: "3" },
        body: null,
      } as any),
    ).toEqual({
      ok: false,
      error: "Invalid user ID, project ID, team ID, or request ID",
    });
  });
});
