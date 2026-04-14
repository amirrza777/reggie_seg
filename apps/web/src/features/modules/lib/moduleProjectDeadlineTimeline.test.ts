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

  it("formats month/year relative labels and applies tie-break sorting", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const rows = buildModuleProjectDeadlineTimelineRows([
      {
        projectName: "Project B",
        deadline: {
          taskOpenDate: "2026-03-02T00:00:00.000Z",
          taskDueDate: "2026-03-02T00:00:00.000Z",
          assessmentOpenDate: "2027-01-01T00:00:00.000Z",
          assessmentDueDate: "2028-01-01T00:00:00.000Z",
          feedbackOpenDate: null,
          feedbackDueDate: null,
          teamAllocationQuestionnaireOpenDate: "2025-11-02T00:00:00.000Z",
          teamAllocationQuestionnaireDueDate: "2024-01-01T00:00:00.000Z",
          isOverridden: false,
        },
      },
      {
        projectName: "Project A",
        deadline: {
          taskOpenDate: "2026-03-02T00:00:00.000Z",
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          teamAllocationQuestionnaireOpenDate: null,
          teamAllocationQuestionnaireDueDate: null,
          isOverridden: false,
        },
      },
    ]);

    const twoMonthsFuture = rows.find((row) => row.projectName === "Project A");
    expect(twoMonthsFuture).toMatchObject({
      activity: "Task opens",
      whenTone: "upcoming",
      whenLabel: "about 2 months from now",
    });

    const twoMonthsPast = rows.find((row) => row.activity === "Team allocation questionnaire opens");
    expect(twoMonthsPast?.whenLabel).toBe("about 2 months ago");

    const oneYearFuture = rows.find((row) => row.activity === "Peer assessment opens");
    expect(oneYearFuture?.whenLabel).toBe("about 1 year from now");

    const severalYearsFuture = rows.find((row) => row.activity === "Peer assessment due");
    expect(severalYearsFuture?.whenLabel).toContain("about 2 years from now");

    const oldestPast = rows.find((row) => row.activity === "Team allocation questionnaire due");
    expect(oldestPast?.whenLabel).toContain("years ago");

    const sameDateRows = rows.filter((row) => row.dateLabel === "02 Mar 2026, 00:00");
    expect(sameDateRows.map((row) => `${row.projectName}-${row.activity}`)).toEqual([
      "Project A-Task opens",
      "Project B-Task due",
      "Project B-Task opens",
    ]);
  });
});
