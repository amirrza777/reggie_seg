import { describe, expect, it } from "vitest";
import type { StaffProjectManageDeadlineSnapshot } from "@/features/projects/types";
import {
  deadlineBuildPayload,
  deadlineFromDatetimeLocalValue,
  deadlineSnapshotToLocal,
  deadlineToDatetimeLocalValue,
  type LocalDeadlineFields,
} from "./StaffProjectManageProjectDeadlinesSection.lib";

const validSnapshot: StaffProjectManageDeadlineSnapshot = {
  taskOpenDate: "2026-01-01T00:00:00.000Z",
  taskDueDate: "2026-01-15T00:00:00.000Z",
  taskDueDateMcf: "2026-01-22T00:00:00.000Z",
  assessmentOpenDate: "2026-01-16T00:00:00.000Z",
  assessmentDueDate: "2026-01-30T00:00:00.000Z",
  assessmentDueDateMcf: "2026-02-06T00:00:00.000Z",
  feedbackOpenDate: "2026-01-31T00:00:00.000Z",
  feedbackDueDate: "2026-02-14T00:00:00.000Z",
  feedbackDueDateMcf: "2026-02-21T00:00:00.000Z",
  teamAllocationQuestionnaireOpenDate: null,
  teamAllocationQuestionnaireDueDate: null,
};

describe("StaffProjectManageProjectDeadlinesSection.lib", () => {
  it("maps ISO to datetime-local and back", () => {
    expect(deadlineToDatetimeLocalValue(null)).toBe("");
    expect(deadlineToDatetimeLocalValue("not-a-date")).toBe("");
    expect(deadlineFromDatetimeLocalValue("")).toBe("");
    const local = deadlineToDatetimeLocalValue("2026-03-01T12:30:00.000Z");
    expect(local).toMatch(/2026-03-01T/);
    expect(deadlineFromDatetimeLocalValue(local).length).toBeGreaterThan(10);
  });

  it("snapshotToLocal maps null snapshot fields to empty strings", () => {
    const local = deadlineSnapshotToLocal({
      ...validSnapshot,
      taskOpenDate: null,
      teamAllocationQuestionnaireOpenDate: "not-a-date",
    });
    expect(local.taskOpenDate).toBe("");
    expect(local.teamAllocationQuestionnaireOpenDate).toBe("");
  });

  it("buildPayload returns null when any core deadline is invalid", () => {
    const local = deadlineSnapshotToLocal(validSnapshot);
    const bad: LocalDeadlineFields = { ...local, taskOpenDate: "" };
    expect(deadlineBuildPayload(bad)).toBeNull();
  });

  it("buildPayload maps optional team allocation fields", () => {
    const local = deadlineSnapshotToLocal(validSnapshot);
    const withTa: LocalDeadlineFields = {
      ...local,
      teamAllocationQuestionnaireOpenDate: "2026-04-01T09:00",
      teamAllocationQuestionnaireDueDate: "  ",
    };
    const payload = deadlineBuildPayload(withTa);
    expect(payload).not.toBeNull();
    expect(payload!.teamAllocationQuestionnaireOpenDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload!.teamAllocationQuestionnaireDueDate).toBeNull();
  });
});
