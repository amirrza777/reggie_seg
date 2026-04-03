import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    teamAllocation: {
      findMany: vi.fn(),
    },
    projectStudent: {
      findMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
  },
}));

import { getCalendarEventsForUser } from "./service.js";

describe("calendar service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds project deadline events, includes team-allocation questionnaire dates, dedupes, and sorts", async () => {
    (prisma.teamAllocation.findMany as any).mockResolvedValue([
      {
        team: {
          id: 1,
          project: {
            id: 10,
            name: "Capstone",
            deadline: {
              taskOpenDate: new Date("2026-03-01T09:00:00.000Z"),
              taskDueDate: new Date("2026-03-10T17:00:00.000Z"),
              assessmentOpenDate: new Date("2026-03-11T09:00:00.000Z"),
              assessmentDueDate: new Date("2026-03-15T17:00:00.000Z"),
              feedbackOpenDate: new Date("2026-03-16T09:00:00.000Z"),
              feedbackDueDate: new Date("2026-03-20T17:00:00.000Z"),
            },
          },
          deadlineOverride: {
            taskOpenDate: new Date("2026-03-02T09:00:00.000Z"),
            taskDueDate: new Date("2026-03-12T17:00:00.000Z"),
            assessmentOpenDate: new Date("2026-03-13T09:00:00.000Z"),
            assessmentDueDate: new Date("2026-03-17T17:00:00.000Z"),
            feedbackOpenDate: new Date("2026-03-18T09:00:00.000Z"),
            feedbackDueDate: new Date("2026-03-22T17:00:00.000Z"),
          },
        },
      },
      {
        team: {
          id: 2,
          project: {
            id: 10,
            name: "Capstone",
            deadline: {
              taskOpenDate: new Date("2026-03-01T09:00:00.000Z"),
              taskDueDate: new Date("2026-03-10T17:00:00.000Z"),
              assessmentOpenDate: new Date("2026-03-11T09:00:00.000Z"),
              assessmentDueDate: new Date("2026-03-15T17:00:00.000Z"),
              feedbackOpenDate: new Date("2026-03-16T09:00:00.000Z"),
              feedbackDueDate: new Date("2026-03-20T17:00:00.000Z"),
            },
          },
          deadlineOverride: null,
        },
      },
    ]);

    (prisma.projectStudent.findMany as any).mockResolvedValue([
      {
        project: {
          id: 10,
          name: "Capstone",
          teamAllocationQuestionnaireTemplateId: 8,
          deadline: {
            teamAllocationQuestionnaireOpenDate: new Date("2026-02-22T09:00:00.000Z"),
            teamAllocationQuestionnaireDueDate: new Date("2026-02-28T09:00:00.000Z"),
          },
        },
      },
    ]);

    (prisma.meeting.findMany as any).mockResolvedValue([
      {
        id: 5,
        title: "Sprint Review",
        date: new Date("2026-03-05T11:00:00.000Z"),
        team: { project: { name: "Capstone" } },
      },
    ]);

    const events = await getCalendarEventsForUser(42);

    expect(prisma.teamAllocation.findMany).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: expect.any(Object),
    });
    expect(prisma.projectStudent.findMany).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: expect.any(Object),
    });
    expect(prisma.meeting.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ organiserId: 42 }, { attendances: { some: { userId: 42 } } }],
      },
      select: expect.any(Object),
    });

    expect(events).toEqual([
      {
        id: "10-team_allocation_questionnaire_open",
        title: "Team Allocation Questionnaire Opens - Capstone",
        date: "2026-02-22T09:00:00.000Z",
        type: "team_allocation_questionnaire_open",
        projectName: "Capstone",
      },
      {
        id: "10-team_allocation_questionnaire_due",
        title: "Team Allocation Questionnaire Due - Capstone",
        date: "2026-02-28T09:00:00.000Z",
        type: "team_allocation_questionnaire_due",
        projectName: "Capstone",
      },
      {
        id: "10-task_open",
        title: "Task Opens â€“ Capstone",
        date: "2026-03-02T09:00:00.000Z",
        type: "task_open",
        projectName: "Capstone",
      },
      {
        id: "meeting-5",
        title: "Sprint Review",
        date: "2026-03-05T11:00:00.000Z",
        type: "meeting",
        projectName: "Capstone",
      },
      {
        id: "10-task_due",
        title: "Task Due â€“ Capstone",
        date: "2026-03-12T17:00:00.000Z",
        type: "task_due",
        projectName: "Capstone",
      },
      {
        id: "10-assessment_open",
        title: "Assessment Opens â€“ Capstone",
        date: "2026-03-13T09:00:00.000Z",
        type: "assessment_open",
        projectName: "Capstone",
      },
      {
        id: "10-assessment_due",
        title: "Assessment Due â€“ Capstone",
        date: "2026-03-17T17:00:00.000Z",
        type: "assessment_due",
        projectName: "Capstone",
      },
      {
        id: "10-feedback_open",
        title: "Feedback Opens â€“ Capstone",
        date: "2026-03-18T09:00:00.000Z",
        type: "feedback_open",
        projectName: "Capstone",
      },
      {
        id: "10-feedback_due",
        title: "Feedback Due â€“ Capstone",
        date: "2026-03-22T17:00:00.000Z",
        type: "feedback_due",
        projectName: "Capstone",
      },
    ]);
  });

  it("skips allocations with no base deadline", async () => {
    (prisma.teamAllocation.findMany as any).mockResolvedValue([
      {
        team: {
          id: 1,
          project: {
            id: 10,
            name: "Capstone",
            deadline: null,
          },
          deadlineOverride: null,
        },
      },
    ]);
    (prisma.projectStudent.findMany as any).mockResolvedValue([]);
    (prisma.meeting.findMany as any).mockResolvedValue([]);

    await expect(getCalendarEventsForUser(99)).resolves.toEqual([]);
  });
});
