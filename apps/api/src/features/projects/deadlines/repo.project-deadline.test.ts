import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import { getUserProjectDeadline } from "./repo.project-deadline.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    teamAllocation: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

function baseProjectDeadline(overrides?: Record<string, Date | null>) {
  return {
    taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
    taskDueDate: new Date("2026-01-02T09:00:00.000Z"),
    taskDueDateMcf: new Date("2026-01-03T09:00:00.000Z"),
    assessmentOpenDate: new Date("2026-01-04T09:00:00.000Z"),
    assessmentDueDate: new Date("2026-01-05T09:00:00.000Z"),
    assessmentDueDateMcf: new Date("2026-01-06T09:00:00.000Z"),
    feedbackOpenDate: new Date("2026-01-07T09:00:00.000Z"),
    feedbackDueDate: new Date("2026-01-08T09:00:00.000Z"),
    feedbackDueDateMcf: new Date("2026-01-09T09:00:00.000Z"),
    teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
    teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
    studentOverrides: [],
    ...overrides,
  };
}

function baseContext(overrides?: {
  deadlineProfile?: "STANDARD" | "MCF";
  deadlineOverride?: Record<string, Date | null> | null;
  deadline?: ReturnType<typeof baseProjectDeadline> | null;
}) {
  return {
    team: {
      id: 77,
      deadlineProfile: overrides?.deadlineProfile ?? "STANDARD",
      deadlineOverride: overrides?.deadlineOverride ?? null,
      project: {
        deadline: overrides && "deadline" in overrides ? overrides.deadline : baseProjectDeadline(),
      },
    },
  };
}

describe("projects user project deadline repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user has no active team allocation for project", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(null);
    (prisma.project.findUnique as any).mockResolvedValueOnce(null);
    await expect(getUserProjectDeadline(12, 34)).resolves.toBeNull();
  });

  it("queries team allocation with scoped filters and student-override user filter", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(baseContext());
    await getUserProjectDeadline(12, 34);

    expect(prisma.teamAllocation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 12,
          team: {
            projectId: 34,
            archivedAt: null,
            allocationLifecycle: "ACTIVE",
          },
        },
        select: expect.objectContaining({
          team: expect.objectContaining({
            select: expect.objectContaining({
              project: expect.objectContaining({
                select: expect.objectContaining({
                  deadline: expect.objectContaining({
                    select: expect.objectContaining({
                      studentOverrides: expect.objectContaining({
                        where: { userId: 12 },
                        take: 1,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("maps standard deadlines with no overrides", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(baseContext());
    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
      taskDueDate: new Date("2026-01-02T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-01-04T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-01-05T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-01-07T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-01-08T09:00:00.000Z"),
      teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
      teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
      isOverridden: false,
      overrideScope: "NONE",
      deadlineProfile: "STANDARD",
    });
  });

  it("maps MCF due dates and falls back to standard when MCF date is null", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(
      baseContext({
        deadlineProfile: "MCF",
        deadline: baseProjectDeadline({
          taskDueDateMcf: null,
          assessmentDueDateMcf: null,
          feedbackDueDateMcf: null,
        }),
      }),
    );

    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
      taskDueDate: new Date("2026-01-02T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-01-04T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-01-05T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-01-07T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-01-08T09:00:00.000Z"),
      teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
      teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
      isOverridden: false,
      overrideScope: "NONE",
      deadlineProfile: "MCF",
    });
  });

  it("uses team override when there is no student override", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(
      baseContext({
        deadlineOverride: {
          taskOpenDate: new Date("2026-01-11T09:00:00.000Z"),
          taskDueDate: new Date("2026-01-12T09:00:00.000Z"),
          assessmentOpenDate: null,
          assessmentDueDate: new Date("2026-01-15T09:00:00.000Z"),
          feedbackOpenDate: null,
          feedbackDueDate: null,
        },
      }),
    );

    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: new Date("2026-01-11T09:00:00.000Z"),
      taskDueDate: new Date("2026-01-12T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-01-04T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-01-15T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-01-07T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-01-08T09:00:00.000Z"),
      teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
      teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
      isOverridden: true,
      overrideScope: "TEAM",
      deadlineProfile: "STANDARD",
    });
  });

  it("uses student overrides first and marks override scope as STUDENT", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(
      baseContext({
        deadlineOverride: {
          taskOpenDate: new Date("2026-01-21T09:00:00.000Z"),
          taskDueDate: new Date("2026-01-22T09:00:00.000Z"),
          assessmentOpenDate: new Date("2026-01-23T09:00:00.000Z"),
          assessmentDueDate: new Date("2026-01-24T09:00:00.000Z"),
          feedbackOpenDate: new Date("2026-01-25T09:00:00.000Z"),
          feedbackDueDate: new Date("2026-01-26T09:00:00.000Z"),
        },
        deadline: baseProjectDeadline({
          studentOverrides: [
            {
              taskOpenDate: new Date("2026-01-31T09:00:00.000Z"),
              taskDueDate: new Date("2026-02-01T09:00:00.000Z"),
              assessmentOpenDate: new Date("2026-02-02T09:00:00.000Z"),
              assessmentDueDate: new Date("2026-02-03T09:00:00.000Z"),
              feedbackOpenDate: new Date("2026-02-04T09:00:00.000Z"),
              feedbackDueDate: new Date("2026-02-05T09:00:00.000Z"),
            },
          ],
        }),
      }),
    );

    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: new Date("2026-01-31T09:00:00.000Z"),
      taskDueDate: new Date("2026-02-01T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-02-02T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-02-03T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-02-04T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-02-05T09:00:00.000Z"),
      teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
      teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
      isOverridden: true,
      overrideScope: "STUDENT",
      deadlineProfile: "STANDARD",
    });
  });

  it("ignores all-null student override records and supports missing project deadline", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(
      baseContext({
        deadlineOverride: null,
        deadline: null,
      }),
    );
    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: undefined,
      taskDueDate: undefined,
      assessmentOpenDate: undefined,
      assessmentDueDate: undefined,
      feedbackOpenDate: undefined,
      feedbackDueDate: undefined,
      teamAllocationQuestionnaireOpenDate: null,
      teamAllocationQuestionnaireDueDate: null,
      isOverridden: false,
      overrideScope: "NONE",
      deadlineProfile: "STANDARD",
    });

    (prisma.teamAllocation.findFirst as any).mockResolvedValueOnce(
      baseContext({
        deadlineOverride: {
          taskOpenDate: null,
          taskDueDate: null,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
        },
        deadline: baseProjectDeadline({
          studentOverrides: [
            {
              taskOpenDate: null,
              taskDueDate: null,
              assessmentOpenDate: null,
              assessmentDueDate: null,
              feedbackOpenDate: null,
              feedbackDueDate: null,
            },
          ],
        }),
      }),
    );

    await expect(getUserProjectDeadline(12, 34)).resolves.toEqual({
      taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
      taskDueDate: new Date("2026-01-02T09:00:00.000Z"),
      assessmentOpenDate: new Date("2026-01-04T09:00:00.000Z"),
      assessmentDueDate: new Date("2026-01-05T09:00:00.000Z"),
      feedbackOpenDate: new Date("2026-01-07T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-01-08T09:00:00.000Z"),
      teamAllocationQuestionnaireOpenDate: new Date("2025-12-25T09:00:00.000Z"),
      teamAllocationQuestionnaireDueDate: new Date("2025-12-26T09:00:00.000Z"),
      isOverridden: true,
      overrideScope: "TEAM",
      deadlineProfile: "STANDARD",
    });
  });
});
