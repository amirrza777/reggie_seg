import { describe, expect, it } from "vitest";
import {
  applyMcfOffsetDaysToDeadlineState,
  buildDeadlinePreview,
  buildDefaultDeadlineState,
  buildPresetDeadlineState,
  formatDateTime,
  parseLocalDateTime,
  parseAndValidateDeadlineState,
} from "./StaffProjectCreatePanel.deadlines";

describe("StaffProjectCreatePanel.deadlines", () => {
  it("applies a matching MCF offset to all due dates", () => {
    const deadline = buildDefaultDeadlineState();
    const result = applyMcfOffsetDaysToDeadlineState(deadline, 14);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validated = parseAndValidateDeadlineState(result.value);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(validated.value.taskDueDateMcf.getTime() - validated.value.taskDueDate.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(validated.value.assessmentDueDateMcf.getTime() - validated.value.assessmentDueDate.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(validated.value.feedbackDueDateMcf.getTime() - validated.value.feedbackDueDate.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("rejects invalid MCF offsets when standard due dates are missing", () => {
    const deadline = buildDefaultDeadlineState();
    deadline.taskDueDate = "";

    const result = applyMcfOffsetDaysToDeadlineState(deadline, 7);

    expect(result).toEqual({
      ok: false,
      error: "Set valid standard due dates first, then apply an MCF offset.",
    });
  });

  it("rejects invalid deadline ordering and builds a preview range", () => {
    const deadline = buildDefaultDeadlineState();
    deadline.taskOpenDate = deadline.taskDueDate;

    const invalid = parseAndValidateDeadlineState(deadline);
    expect(invalid).toEqual({
      ok: false,
      error: "Task open must be before task due.",
    });

    const preview = buildDeadlinePreview(buildDefaultDeadlineState());
    expect(preview.totalDays).not.toBeNull();
    expect((preview.totalDays ?? 0) > 0).toBe(true);
  });

  it("parses and formats date values", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("not-a-date")).toBeNull();
    const parsed = parseLocalDateTime("2026-04-10T09:00");
    expect(parsed).not.toBeNull();
    expect(formatDateTime(null)).toBe("-");
  });

  it("builds a preset schedule and validates all ordering guards", () => {
    const preset = buildPresetDeadlineState(6);
    const valid = parseAndValidateDeadlineState(preset);
    expect(valid.ok).toBe(true);

    const invalidTaskToAssessment = {
      ...preset,
      assessmentOpenDate: preset.taskOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidTaskToAssessment)).toEqual({
      ok: false,
      error: "Assessment open must be on or after task due.",
    });

    const invalidAssessmentRange = {
      ...preset,
      assessmentDueDate: preset.assessmentOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidAssessmentRange)).toEqual({
      ok: false,
      error: "Assessment open must be before assessment due.",
    });

    const invalidFeedbackOpen = {
      ...preset,
      feedbackOpenDate: preset.assessmentOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidFeedbackOpen)).toEqual({
      ok: false,
      error: "Feedback open must be on or after assessment due.",
    });

    const invalidFeedbackRange = {
      ...preset,
      feedbackDueDate: preset.feedbackOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidFeedbackRange)).toEqual({
      ok: false,
      error: "Feedback open must be before feedback due.",
    });

    const invalidTaskMcf = {
      ...preset,
      taskDueDateMcf: preset.taskOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidTaskMcf)).toEqual({
      ok: false,
      error: "MCF task due must be on or after standard task due.",
    });

    const invalidAssessmentMcf = {
      ...preset,
      assessmentDueDateMcf: preset.assessmentOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidAssessmentMcf)).toEqual({
      ok: false,
      error: "MCF assessment due must be on or after standard assessment due.",
    });

    const invalidFeedbackMcf = {
      ...preset,
      feedbackDueDateMcf: preset.feedbackOpenDate,
    };
    expect(parseAndValidateDeadlineState(invalidFeedbackMcf)).toEqual({
      ok: false,
      error: "MCF feedback due must be on or after standard feedback due.",
    });
  });
});
