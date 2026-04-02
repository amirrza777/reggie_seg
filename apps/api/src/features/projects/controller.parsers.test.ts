import { describe, expect, it } from "vitest";
import {
  parseCreateProjectBody,
  parseJoinModuleBody,
  parseModulesListQuery,
  parseTeamHealthResolveBody,
  parseTeamHealthReviewBody,
  parseTeamHealthMessageBody,
} from "./controller.parsers.js";

describe("projects controller parsers", () => {
  it("parses create project body", () => {
    const parsed = parseCreateProjectBody({
      name: "  Project Alpha  ",
      moduleId: "2",
      questionnaireTemplateId: 3,
      teamAllocationQuestionnaireTemplateId: 9,
      deadline: {
        taskOpenDate: "2026-03-24T09:00:00.000Z",
        taskDueDate: "2026-03-25T09:00:00.000Z",
        taskDueDateMcf: "2026-03-26T09:00:00.000Z",
        assessmentOpenDate: "2026-03-25T09:00:00.000Z",
        assessmentDueDate: "2026-03-26T09:00:00.000Z",
        assessmentDueDateMcf: "2026-03-27T09:00:00.000Z",
        feedbackOpenDate: "2026-03-26T09:00:00.000Z",
        feedbackDueDate: "2026-03-27T09:00:00.000Z",
        feedbackDueDateMcf: "2026-03-28T09:00:00.000Z",
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.name).toBe("Project Alpha");
    expect(parsed.value.moduleId).toBe(2);
    expect(parsed.value.teamAllocationQuestionnaireTemplateId).toBe(9);
  });

  it("parses modules list query", () => {
    expect(parseModulesListQuery({ scope: "staff", compact: "1", q: "  data  " })).toEqual({
      ok: true,
      value: { staffOnly: true, compact: true, query: "data" },
    });
  });

  it("requires a join code", () => {
    expect(parseJoinModuleBody({ code: "  ABCD1234 " })).toEqual({ ok: true, value: { code: "ABCD1234" } });
    expect(parseJoinModuleBody({ code: "" })).toEqual({ ok: false, error: "code is required" });
  });

  it("parses team health message body", () => {
    expect(parseTeamHealthMessageBody({ userId: "7", subject: " Help ", details: " Need support " })).toEqual({
      ok: true,
      value: { userId: 7, subject: "Help", details: "Need support" },
    });
  });

  it("parses team health review payloads", () => {
    expect(parseTeamHealthReviewBody({ resolved: true, responseText: " Fixed " })).toEqual({
      ok: true,
      value: { resolved: true, responseText: "Fixed" },
    });
    expect(parseTeamHealthReviewBody({ resolved: true })).toEqual({
      ok: false,
      error: "responseText is required when resolving a request",
    });
  });

  it("parses team health deadline override payloads", () => {
    const parsed = parseTeamHealthResolveBody({
      taskDueDate: "2026-03-15T12:00:00.000Z",
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 3 },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.deadlineOverrides.taskDueDate).toEqual(new Date("2026-03-15T12:00:00.000Z"));
    expect(parsed.value.options).toEqual({
      inputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 3 },
    });
  });
});
