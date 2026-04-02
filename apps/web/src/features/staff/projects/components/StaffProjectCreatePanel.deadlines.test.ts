import { describe, expect, it } from "vitest";
import {
  applyMcfOffsetDaysToDeadlineState,
  buildDeadlinePreview,
  buildDefaultDeadlineState,
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
});
