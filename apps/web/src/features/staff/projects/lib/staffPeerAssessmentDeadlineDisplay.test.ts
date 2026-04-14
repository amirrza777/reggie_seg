import { describe, expect, it } from "vitest";
import { buildStaffPeerAssessmentDeadlineDisplay } from "./staffPeerAssessmentDeadlineDisplay";

describe("buildStaffPeerAssessmentDeadlineDisplay", () => {
  const base = {
    taskOpenDate: null,
    taskDueDate: null,
    assessmentOpenDate: null,
    feedbackOpenDate: null,
    feedbackDueDate: null,
    isOverridden: false,
  };

  it("returns null when no assessment due dates", () => {
    expect(
      buildStaffPeerAssessmentDeadlineDisplay({
        ...base,
        assessmentDueDate: null,
        assessmentDueDateMcf: null,
        deadlineProfile: "STANDARD",
      }),
    ).toBeNull();
  });

  it("uses assessment due and STANDARD profile", () => {
    expect(
      buildStaffPeerAssessmentDeadlineDisplay({
        ...base,
        assessmentDueDate: "2026-05-01T12:00:00.000Z",
        assessmentDueDateMcf: null,
        deadlineProfile: "STANDARD",
      }),
    ).toEqual({
      dateLabel: expect.any(String),
      profile: "STANDARD",
    });
  });

  it("marks MCF when profile is MCF", () => {
    expect(
      buildStaffPeerAssessmentDeadlineDisplay({
        ...base,
        assessmentDueDate: "2026-05-01T12:00:00.000Z",
        assessmentDueDateMcf: "2026-05-08T12:00:00.000Z",
        deadlineProfile: "MCF",
      }),
    ).toEqual({
      dateLabel: expect.any(String),
      profile: "MCF",
    });
  });

  it("prefers MCF assessment due when profile is MCF", () => {
    const result = buildStaffPeerAssessmentDeadlineDisplay({
      ...base,
      assessmentDueDate: "2026-05-01T12:00:00.000Z",
      assessmentDueDateMcf: "2026-05-08T12:00:00.000Z",
      deadlineProfile: "MCF",
    });
    expect(result?.profile).toBe("MCF");
    expect(result?.dateLabel).toBe("May 8, 2026");
  });

  it("prefers standard assessment due when profile is STANDARD", () => {
    const result = buildStaffPeerAssessmentDeadlineDisplay({
      ...base,
      assessmentDueDate: "2026-05-01T12:00:00.000Z",
      assessmentDueDateMcf: "2026-05-08T12:00:00.000Z",
      deadlineProfile: "STANDARD",
    });
    expect(result?.profile).toBe("STANDARD");
    expect(result?.dateLabel).toBe("May 1, 2026");
  });
});
