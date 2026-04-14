import { describe, expect, it } from "vitest";
import {
  buildDefaultCreateProjectDeadlineState,
  buildPresetCreateProjectDeadlineState,
  shiftCreateProjectDeadlineForCustomAllocation,
  toStudentName,
} from "./StaffProjectCreatePanel.create-deadlines";
import { parseLocalDateTime } from "./StaffProjectCreatePanel.deadlines";

const DAY_MS = 24 * 60 * 60 * 1000;

function mustParse(value: string): Date {
  const parsed = parseLocalDateTime(value);
  if (!parsed) throw new Error(`Expected valid date value: ${value}`);
  return parsed;
}

describe("StaffProjectCreatePanel.create-deadlines", () => {
  it("builds default create deadlines with questionnaire window before task open", () => {
    const deadline = buildDefaultCreateProjectDeadlineState();
    const taskOpen = mustParse(deadline.taskOpenDate);
    const questionnaireOpen = mustParse(deadline.teamAllocationQuestionnaireOpenDate);
    const questionnaireDue = mustParse(deadline.teamAllocationQuestionnaireDueDate);

    expect(questionnaireOpen.getTime()).toBeLessThan(questionnaireDue.getTime());
    expect(questionnaireDue.getTime()).toBeLessThan(taskOpen.getTime());
  });

  it("shifts timeline +7 days and moves questionnaire to taskOpen-6d..taskOpen-1d", () => {
    const deadline = buildDefaultCreateProjectDeadlineState();
    const shifted = shiftCreateProjectDeadlineForCustomAllocation(deadline, 7);

    const originalTaskOpen = mustParse(deadline.taskOpenDate);
    const shiftedTaskOpen = mustParse(shifted.taskOpenDate);
    const shiftedQuestionnaireOpen = mustParse(shifted.teamAllocationQuestionnaireOpenDate);
    const shiftedQuestionnaireDue = mustParse(shifted.teamAllocationQuestionnaireDueDate);

    expect(shiftedTaskOpen.getTime() - originalTaskOpen.getTime()).toBe(7 * DAY_MS);
    expect(shiftedQuestionnaireDue.getTime()).toBe(shiftedTaskOpen.getTime() - DAY_MS);
    expect(shiftedQuestionnaireOpen.getTime()).toBe(shiftedTaskOpen.getTime() - 6 * DAY_MS);
  });

  it("applies the same custom-allocation shift to preset schedules", () => {
    const preset = buildPresetCreateProjectDeadlineState(8);
    const shifted = shiftCreateProjectDeadlineForCustomAllocation(preset, 7);

    const presetTaskDue = mustParse(preset.taskDueDate);
    const shiftedTaskDue = mustParse(shifted.taskDueDate);
    expect(shiftedTaskDue.getTime() - presetTaskDue.getTime()).toBe(7 * DAY_MS);
  });

  it("leaves blank/invalid fields unchanged and skips questionnaire recompute when task open is invalid", () => {
    const shifted = shiftCreateProjectDeadlineForCustomAllocation({
      taskOpenDate: "not-a-date",
      taskDueDate: "",
      taskDueDateMcf: "2026-01-10T10:00",
      assessmentOpenDate: "2026-01-11T10:00",
      assessmentDueDate: "2026-01-12T10:00",
      assessmentDueDateMcf: "2026-01-13T10:00",
      feedbackOpenDate: "2026-01-14T10:00",
      feedbackDueDate: "2026-01-15T10:00",
      feedbackDueDateMcf: "2026-01-16T10:00",
      teamAllocationQuestionnaireOpenDate: "2026-01-01T09:00",
      teamAllocationQuestionnaireDueDate: "2026-01-02T09:00",
    }, 3);

    expect(shifted.taskOpenDate).toBe("not-a-date");
    expect(shifted.taskDueDate).toBe("");
    expect(shifted.teamAllocationQuestionnaireOpenDate).toBe("2026-01-01T09:00");
    expect(shifted.teamAllocationQuestionnaireDueDate).toBe("2026-01-02T09:00");
  });

  it("uses email when student first/last names are empty", () => {
    expect(toStudentName({
      id: 1,
      firstName: "",
      lastName: "  ",
      email: "anon@example.com",
    } as never)).toBe("anon@example.com");
  });
});
