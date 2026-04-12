import { describe, expect, it } from "vitest";
import {
  buildDefaultCreateProjectDeadlineState,
  buildPresetCreateProjectDeadlineState,
  shiftCreateProjectDeadlineForCustomAllocation,
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
});
