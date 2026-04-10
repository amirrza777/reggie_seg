import { describe, expect, it } from "vitest";
import {
  parseProjectDeadline,
  parseStudentDeadlineOverridePayload,
} from "./controller.deadline-parsers.js";

const baseDeadline = {
  taskOpenDate: "2026-01-10T09:00:00.000Z",
  taskDueDate: "2026-01-11T09:00:00.000Z",
  taskDueDateMcf: "2026-01-12T09:00:00.000Z",
  assessmentOpenDate: "2026-01-11T09:00:00.000Z",
  assessmentDueDate: "2026-01-13T09:00:00.000Z",
  assessmentDueDateMcf: "2026-01-14T09:00:00.000Z",
  feedbackOpenDate: "2026-01-13T09:00:00.000Z",
  feedbackDueDate: "2026-01-15T09:00:00.000Z",
  feedbackDueDateMcf: "2026-01-16T09:00:00.000Z",
};

describe("projects deadline parsers", () => {
  it("parses a valid student override payload with trimmed reason", () => {
    const parsed = parseStudentDeadlineOverridePayload({
      taskOpenDate: "2026-01-01T09:00:00.000Z",
      taskDueDate: "",
      assessmentOpenDate: null,
      feedbackDueDate: "2026-01-20T09:00:00.000Z",
      reason: "  approved extension  ",
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
        taskDueDate: null,
        assessmentOpenDate: null,
        feedbackDueDate: new Date("2026-01-20T09:00:00.000Z"),
        reason: "approved extension",
      },
    });
  });

  it("accepts null reason and omits untouched fields", () => {
    const parsed = parseStudentDeadlineOverridePayload({
      reason: null,
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        reason: null,
      },
    });
  });

  it("parses all override date fields when provided", () => {
    const parsed = parseStudentDeadlineOverridePayload({
      taskOpenDate: "2026-02-01T09:00:00.000Z",
      taskDueDate: "2026-02-02T09:00:00.000Z",
      assessmentOpenDate: "2026-02-03T09:00:00.000Z",
      assessmentDueDate: "2026-02-04T09:00:00.000Z",
      feedbackOpenDate: "2026-02-05T09:00:00.000Z",
      feedbackDueDate: "2026-02-06T09:00:00.000Z",
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        taskOpenDate: new Date("2026-02-01T09:00:00.000Z"),
        taskDueDate: new Date("2026-02-02T09:00:00.000Z"),
        assessmentOpenDate: new Date("2026-02-03T09:00:00.000Z"),
        assessmentDueDate: new Date("2026-02-04T09:00:00.000Z"),
        feedbackOpenDate: new Date("2026-02-05T09:00:00.000Z"),
        feedbackDueDate: new Date("2026-02-06T09:00:00.000Z"),
      },
    });
  });

  it("rejects invalid student override payload shapes", () => {
    expect(parseStudentDeadlineOverridePayload(null)).toEqual({
      ok: false,
      error: "Override payload must be an object",
    });
    expect(parseStudentDeadlineOverridePayload({ taskOpenDate: "bad" })).toEqual({
      ok: false,
      error: "taskOpenDate must be a valid date string",
    });
    expect(parseStudentDeadlineOverridePayload({ reason: 123 })).toEqual({
      ok: false,
      error: "reason must be a string, null, or omitted",
    });
    expect(parseStudentDeadlineOverridePayload({ taskDueDate: "bad" })).toEqual({
      ok: false,
      error: "taskDueDate must be a valid date string",
    });
    expect(parseStudentDeadlineOverridePayload({ assessmentOpenDate: "bad" })).toEqual({
      ok: false,
      error: "assessmentOpenDate must be a valid date string",
    });
    expect(parseStudentDeadlineOverridePayload({ assessmentDueDate: "bad" })).toEqual({
      ok: false,
      error: "assessmentDueDate must be a valid date string",
    });
    expect(parseStudentDeadlineOverridePayload({ feedbackOpenDate: "bad" })).toEqual({
      ok: false,
      error: "feedbackOpenDate must be a valid date string",
    });
    expect(parseStudentDeadlineOverridePayload({ feedbackDueDate: "bad" })).toEqual({
      ok: false,
      error: "feedbackDueDate must be a valid date string",
    });
  });

  it("rejects non-object project deadline payload", () => {
    expect(parseProjectDeadline(null)).toEqual({
      ok: false,
      error: "deadline is required",
    });
  });

  it("rejects invalid date formats for required and optional deadline fields", () => {
    expect(parseProjectDeadline({ ...baseDeadline, taskOpenDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.taskOpenDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, taskDueDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.taskDueDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, taskDueDateMcf: "bad" })).toEqual({
      ok: false,
      error: "deadline.taskDueDateMcf must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentOpenDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.assessmentOpenDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentDueDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.assessmentDueDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentDueDateMcf: "bad" })).toEqual({
      ok: false,
      error: "deadline.assessmentDueDateMcf must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackOpenDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.feedbackOpenDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackDueDate: "bad" })).toEqual({
      ok: false,
      error: "deadline.feedbackDueDate must be a valid date string",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackDueDateMcf: "bad" })).toEqual({
      ok: false,
      error: "deadline.feedbackDueDateMcf must be a valid date string",
    });
    expect(
      parseProjectDeadline({
        ...baseDeadline,
        teamAllocationQuestionnaireOpenDate: "bad",
      }),
    ).toEqual({
      ok: false,
      error: "deadline.teamAllocationQuestionnaireOpenDate must be a valid date string",
    });
    expect(
      parseProjectDeadline({
        ...baseDeadline,
        teamAllocationQuestionnaireDueDate: "bad",
      }),
    ).toEqual({
      ok: false,
      error: "deadline.teamAllocationQuestionnaireDueDate must be a valid date string",
    });
  });

  it("rejects invalid project deadline ordering and MCF windows", () => {
    expect(parseProjectDeadline({ ...baseDeadline, taskOpenDate: baseDeadline.taskDueDate })).toEqual({
      ok: false,
      error: "deadline.taskOpenDate must be before deadline.taskDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentOpenDate: "2026-01-10T08:00:00.000Z" })).toEqual({
      ok: false,
      error: "deadline.assessmentOpenDate must be on or after deadline.taskDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentDueDate: baseDeadline.assessmentOpenDate })).toEqual({
      ok: false,
      error: "deadline.assessmentOpenDate must be before deadline.assessmentDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackOpenDate: "2026-01-12T09:00:00.000Z" })).toEqual({
      ok: false,
      error: "deadline.feedbackOpenDate must be on or after deadline.assessmentDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackDueDate: baseDeadline.feedbackOpenDate })).toEqual({
      ok: false,
      error: "deadline.feedbackOpenDate must be before deadline.feedbackDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, taskDueDateMcf: "2026-01-10T09:00:00.000Z" })).toEqual({
      ok: false,
      error: "deadline.taskDueDateMcf must be on or after deadline.taskDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, assessmentDueDateMcf: "2026-01-12T09:00:00.000Z" })).toEqual({
      ok: false,
      error: "deadline.assessmentDueDateMcf must be on or after deadline.assessmentDueDate",
    });
    expect(parseProjectDeadline({ ...baseDeadline, feedbackDueDateMcf: "2026-01-14T09:00:00.000Z" })).toEqual({
      ok: false,
      error: "deadline.feedbackDueDateMcf must be on or after deadline.feedbackDueDate",
    });
  });

  it("rejects invalid team-allocation questionnaire windows", () => {
    expect(
      parseProjectDeadline({
        ...baseDeadline,
        teamAllocationQuestionnaireOpenDate: "2026-01-05T09:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-01-05T09:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      error: "deadline.teamAllocationQuestionnaireOpenDate must be before deadline.teamAllocationQuestionnaireDueDate",
    });

    expect(
      parseProjectDeadline({
        ...baseDeadline,
        teamAllocationQuestionnaireOpenDate: "2026-01-07T09:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-01-10T09:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      error: "deadline.teamAllocationQuestionnaireDueDate must be before deadline.taskOpenDate",
    });
  });

  it("parses valid project deadlines with and without questionnaire dates", () => {
    const withoutQuestionnaire = parseProjectDeadline(baseDeadline);
    expect(withoutQuestionnaire.ok).toBe(true);
    if (withoutQuestionnaire.ok) {
      expect(withoutQuestionnaire.value).toEqual({
        taskOpenDate: new Date(baseDeadline.taskOpenDate),
        taskDueDate: new Date(baseDeadline.taskDueDate),
        taskDueDateMcf: new Date(baseDeadline.taskDueDateMcf),
        assessmentOpenDate: new Date(baseDeadline.assessmentOpenDate),
        assessmentDueDate: new Date(baseDeadline.assessmentDueDate),
        assessmentDueDateMcf: new Date(baseDeadline.assessmentDueDateMcf),
        feedbackOpenDate: new Date(baseDeadline.feedbackOpenDate),
        feedbackDueDate: new Date(baseDeadline.feedbackDueDate),
        feedbackDueDateMcf: new Date(baseDeadline.feedbackDueDateMcf),
      });
      expect("teamAllocationQuestionnaireOpenDate" in withoutQuestionnaire.value).toBe(false);
      expect("teamAllocationQuestionnaireDueDate" in withoutQuestionnaire.value).toBe(false);
    }

    const withQuestionnaire = parseProjectDeadline({
      ...baseDeadline,
      teamAllocationQuestionnaireOpenDate: "2026-01-01T09:00:00.000Z",
      teamAllocationQuestionnaireDueDate: "2026-01-02T09:00:00.000Z",
    });
    expect(withQuestionnaire).toEqual({
      ok: true,
      value: {
        taskOpenDate: new Date(baseDeadline.taskOpenDate),
        taskDueDate: new Date(baseDeadline.taskDueDate),
        taskDueDateMcf: new Date(baseDeadline.taskDueDateMcf),
        assessmentOpenDate: new Date(baseDeadline.assessmentOpenDate),
        assessmentDueDate: new Date(baseDeadline.assessmentDueDate),
        assessmentDueDateMcf: new Date(baseDeadline.assessmentDueDateMcf),
        feedbackOpenDate: new Date(baseDeadline.feedbackOpenDate),
        feedbackDueDate: new Date(baseDeadline.feedbackDueDate),
        feedbackDueDateMcf: new Date(baseDeadline.feedbackDueDateMcf),
        teamAllocationQuestionnaireOpenDate: new Date("2026-01-01T09:00:00.000Z"),
        teamAllocationQuestionnaireDueDate: new Date("2026-01-02T09:00:00.000Z"),
      },
    });
  });
});
