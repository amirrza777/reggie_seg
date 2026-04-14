import { afterEach, describe, expect, it, vi } from "vitest";
import { buildModuleProjectDeadlineTimelineRows } from "./moduleProjectDeadlineTimeline";

describe("moduleProjectDeadlineTimeline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds timeline rows from project deadlines and sorts chronologically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const rows = buildModuleProjectDeadlineTimelineRows([
      {
        projectName: "Project Zebra",
        deadline: {
          taskOpenDate: "2026-01-05T09:00:00.000Z",
          taskDueDate: "2026-01-10T09:00:00.000Z",
          assessmentOpenDate: "2026-01-11T09:00:00.000Z",
          assessmentDueDate: "2026-01-12T09:00:00.000Z",
          feedbackOpenDate: "2026-01-13T09:00:00.000Z",
          feedbackDueDate: "2026-01-14T09:00:00.000Z",
          teamAllocationQuestionnaireOpenDate: "2025-12-30T09:00:00.000Z",
          teamAllocationQuestionnaireDueDate: "2025-12-31T09:00:00.000Z",
          isOverridden: false,
        },
      },
      {
        projectName: "Project Alpha",
        deadline: {
          taskOpenDate: null,
          taskDueDate: "bad-date",
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          isOverridden: false,
        },
      },
      {
        projectName: "Project Empty",
        deadline: null,
      },
    ]);

    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatchObject({
      projectName: "Project Zebra",
      activity: "Team allocation questionnaire opens",
      whenTone: "past",
    });
    expect(rows[1]).toMatchObject({
      projectName: "Project Zebra",
      activity: "Team allocation questionnaire due",
      whenTone: "past",
    });
    expect(rows[2]).toMatchObject({
      projectName: "Project Zebra",
      activity: "Task opens",
      whenTone: "soon",
    });
    expect(rows[7]).toMatchObject({
      projectName: "Project Zebra",
      activity: "Peer feedback due",
      whenTone: "soon",
    });
  });
});
