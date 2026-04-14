import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const projectDeadlineFindManyMock = vi.fn();
const teamFindManyMock = vi.fn();
const teamUpdateManyMock = vi.fn();
const userFindManyMock = vi.fn();
const sendEmailMock = vi.fn();
const cronScheduleMock = vi.fn();
const evaluateProjectWarningsForAllProjectsMock = vi.fn();

vi.mock("./db.js", () => ({
  prisma: {
    projectDeadline: {
      findMany: projectDeadlineFindManyMock,
    },
    team: {
      findMany: teamFindManyMock,
      updateMany: teamUpdateManyMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
}));

vi.mock("./email.js", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("../features/warnings/service.js", () => ({
  evaluateProjectWarningsForAllProjects: evaluateProjectWarningsForAllProjectsMock,
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: cronScheduleMock,
  },
}));

describe("notificationJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
    teamUpdateManyMock.mockResolvedValue({ count: 0 });
    sendEmailMock.mockResolvedValue(undefined);
    userFindManyMock.mockResolvedValue([]);
    evaluateProjectWarningsForAllProjectsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sendDeadlineReminders skips when no deadlines match", async () => {
    projectDeadlineFindManyMock.mockResolvedValue([]);
    const { sendDeadlineReminders } = await import("./notificationJob.ts");

    await sendDeadlineReminders();

    expect(projectDeadlineFindManyMock).toHaveBeenCalledTimes(3);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendDeadlineReminders groups user events and sends singular/plural reminders across windows", async () => {
    const todayDate = new Date("2026-01-10T10:00:00.000Z");
    const tomorrowDate = new Date("2026-01-11T08:00:00.000Z");
    const in7Date = new Date("2026-01-17T09:00:00.000Z");
    projectDeadlineFindManyMock
      .mockResolvedValueOnce([
        {
          taskOpenDate: null,
          taskDueDate: todayDate,
          assessmentOpenDate: todayDate,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          project: {
            name: "Project Alpha",
            teams: [
              {
                allocations: [
                  { user: { id: 1, email: "s1@test.com", firstName: "Sam" } },
                  { user: { id: 2, email: "s2@test.com", firstName: "Lee" } },
                ],
                deadlineOverride: null,
              },
              {
                allocations: [{ user: { id: 3, email: "s3@test.com", firstName: "Nope" } }],
                deadlineOverride: {
                  taskDueDate: tomorrowDate,
                  assessmentOpenDate: tomorrowDate,
                  assessmentDueDate: null,
                  taskOpenDate: null,
                  feedbackOpenDate: null,
                  feedbackDueDate: null,
                },
              },
            ],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          taskOpenDate: null,
          taskDueDate: tomorrowDate,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          project: {
            name: "Project Beta",
            teams: [
              {
                allocations: [{ user: { id: 4, email: "s4@test.com", firstName: "Rin" } }],
                deadlineOverride: null,
              },
            ],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          taskOpenDate: null,
          taskDueDate: in7Date,
          assessmentOpenDate: null,
          assessmentDueDate: null,
          feedbackOpenDate: null,
          feedbackDueDate: null,
          project: {
            name: "Project Gamma",
            teams: [
              {
                allocations: [{ user: { id: 5, email: "s5@test.com", firstName: "Uma" } }],
                deadlineOverride: {
                  taskDueDate: null,
                  assessmentOpenDate: null,
                  assessmentDueDate: null,
                  taskOpenDate: null,
                  feedbackOpenDate: null,
                  feedbackDueDate: null,
                },
              },
            ],
          },
        },
      ]);

    const { sendDeadlineReminders } = await import("./notificationJob.ts");
    await sendDeadlineReminders();

    expect(sendEmailMock).toHaveBeenCalledTimes(4);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "s1@test.com",
        subject: expect.stringContaining("2 items due today"),
      })
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "s4@test.com",
        subject: expect.stringContaining("1 item due tomorrow"),
      })
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "s5@test.com",
        subject: expect.stringContaining("1 item due in 7 days"),
      })
    );
  });

  it("sendInactivityAlerts skips updates and emails when no new teams are flagged", async () => {
    teamFindManyMock.mockResolvedValue([
      {
        id: 1,
        teamName: "A",
        inactivityFlag: "NONE",
        createdAt: new Date("2026-01-09T00:00:00.000Z"),
        project: { name: "Proj A" },
        meetings: [{ date: new Date("2026-01-09T12:00:00.000Z") }],
      },
      {
        id: 2,
        teamName: "B",
        inactivityFlag: "RED",
        createdAt: new Date("2025-12-01T00:00:00.000Z"),
        project: { name: "Proj B" },
        meetings: [{ date: new Date("2025-12-01T00:00:00.000Z") }],
      },
    ]);

    const { sendInactivityAlerts } = await import("./notificationJob.ts");
    await sendInactivityAlerts();

    expect(teamUpdateManyMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendInactivityAlerts updates yellow/red teams and emails staff", async () => {
    teamFindManyMock.mockResolvedValue([
      {
        id: 11,
        teamName: "Yellow Team",
        inactivityFlag: "NONE",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        project: { name: "Proj Y" },
        meetings: [],
      },
      {
        id: 12,
        teamName: "Red Team",
        inactivityFlag: "YELLOW",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        project: { name: "Proj R" },
        meetings: [{ date: new Date("2025-12-20T00:00:00.000Z") }],
      },
    ]);
    userFindManyMock.mockResolvedValue([{ email: "staff@test.com", firstName: "Alex" }]);

    const { sendInactivityAlerts } = await import("./notificationJob.ts");
    await sendInactivityAlerts();

    expect(teamUpdateManyMock).toHaveBeenCalledTimes(2);
    expect(teamUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
      data: { inactivityFlag: "YELLOW" },
    });
    expect(teamUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: [12] } },
      data: { inactivityFlag: "RED" },
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff@test.com",
        subject: expect.stringContaining("2 teams require attention"),
      })
    );
  });

  it("sendInactivityAlerts formats singular subject when exactly one team is flagged", async () => {
    teamFindManyMock.mockResolvedValue([
      {
        id: 21,
        teamName: "Only Yellow",
        inactivityFlag: "NONE",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        project: { name: "Proj One" },
        meetings: [],
      },
    ]);
    userFindManyMock.mockResolvedValue([{ email: "staff@test.com", firstName: "Alex" }]);

    const { sendInactivityAlerts } = await import("./notificationJob.ts");
    await sendInactivityAlerts();

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("1 team require attention"),
      })
    );
  });

  it("sendMissingPeerAssessmentAlerts returns early when no teams are eligible", async () => {
    teamFindManyMock.mockResolvedValue([]);
    const { sendMissingPeerAssessmentAlerts } = await import("./notificationJob.ts");

    await sendMissingPeerAssessmentAlerts();

    expect(teamUpdateManyMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendMissingPeerAssessmentAlerts updates checked teams but skips emails when all submissions are complete", async () => {
    teamFindManyMock.mockResolvedValue([
      {
        id: 31,
        teamName: "Team Complete",
        project: { name: "Project C" },
        allocations: [
          { user: { id: 1, firstName: "A", lastName: "One" } },
          { user: { id: 2, firstName: "B", lastName: "Two" } },
        ],
        peerAssessments: [{ reviewerUserId: 1 }, { reviewerUserId: 2 }],
      },
      {
        id: 32,
        teamName: "Solo Team",
        project: { name: "Project S" },
        allocations: [{ user: { id: 3, firstName: "Solo", lastName: "Member" } }],
        peerAssessments: [],
      },
    ]);
    userFindManyMock.mockResolvedValue([{ email: "staff@test.com", firstName: "Staff" }]);
    const { sendMissingPeerAssessmentAlerts } = await import("./notificationJob.ts");

    await sendMissingPeerAssessmentAlerts();

    expect(teamUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: [31, 32] } },
      data: { peerAssessmentAlertSentAt: expect.any(Date) },
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sendMissingPeerAssessmentAlerts sends singular and plural non-submitter alerts", async () => {
    const { sendMissingPeerAssessmentAlerts } = await import("./notificationJob.ts");

    teamFindManyMock.mockResolvedValueOnce([
      {
        id: 41,
        teamName: "Team One",
        project: { name: "Project O" },
        allocations: [
          { user: { id: 1, firstName: "", lastName: "" } },
          { user: { id: 2, firstName: "Zed", lastName: "Two" } },
        ],
        peerAssessments: [{ reviewerUserId: 2 }],
      },
    ]);
    userFindManyMock.mockResolvedValue([{ email: "staff1@test.com", firstName: "Pat" }]);

    await sendMissingPeerAssessmentAlerts();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff1@test.com",
        subject: expect.stringContaining("1 student have not submitted"),
      })
    );

    vi.clearAllMocks();
    teamFindManyMock.mockResolvedValueOnce([
      {
        id: 42,
        teamName: "Team Two",
        project: { name: "Project T" },
        allocations: [
          { user: { id: 10, firstName: "A", lastName: "One" } },
          { user: { id: 11, firstName: "B", lastName: "Two" } },
          { user: { id: 12, firstName: "C", lastName: "Three" } },
        ],
        peerAssessments: [{ reviewerUserId: 10 }],
      },
    ]);
    userFindManyMock.mockResolvedValue([{ email: "staff2@test.com", firstName: "Kim" }]);

    await sendMissingPeerAssessmentAlerts();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff2@test.com",
        subject: expect.stringContaining("3 students have not submitted"),
      })
    );
  });

  it("runNotificationCycle executes all runners and logs each isolated failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { runNotificationCycle } = await import("./notificationJob.ts");

    const ok = vi.fn().mockResolvedValue(undefined);
    await runNotificationCycle({
      sendDeadlineReminders: ok,
      sendInactivityAlerts: ok,
      sendMissingPeerAssessmentAlerts: ok,
      sendNoRepoAlerts: ok,
      sendNoGithubAccountAlerts: ok,
      sendProjectWarningAlerts: ok,
    });
    expect(ok).toHaveBeenCalledTimes(6);

    const err = new Error("boom");
    await runNotificationCycle({
      sendDeadlineReminders: vi.fn().mockRejectedValue(err),
      sendInactivityAlerts: vi.fn().mockRejectedValue(err),
      sendMissingPeerAssessmentAlerts: vi.fn().mockRejectedValue(err),
      sendNoRepoAlerts: vi.fn().mockRejectedValue(err),
      sendNoGithubAccountAlerts: vi.fn().mockRejectedValue(err),
      sendProjectWarningAlerts: vi.fn().mockRejectedValue(err),
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Notification job error:", err);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Inactivity alert job error:", err);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Missing peer assessment alert job error:", err);
    expect(consoleErrorSpy).toHaveBeenCalledWith("No-repo alert job error:", err);
    expect(consoleErrorSpy).toHaveBeenCalledWith("No-GitHub-account alert job error:", err);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Project warning alert job error:", err);
    consoleErrorSpy.mockRestore();
  });

  it("startNotificationJob schedules the expected cron expression and executes callback", async () => {
    const runCycle = vi.fn().mockResolvedValue(undefined);
    const { startNotificationJob } = await import("./notificationJob.ts");

    startNotificationJob(runCycle);

    expect(cronScheduleMock).toHaveBeenCalledWith("0 8 * * *", expect.any(Function));
    const scheduledCallback = cronScheduleMock.mock.calls[0][1] as () => Promise<void>;
    await scheduledCallback();
    expect(runCycle).toHaveBeenCalledTimes(1);
  });

  it("no-op notification runners complete without side effects", async () => {
    const { sendNoRepoAlerts, sendNoGithubAccountAlerts } = await import("./notificationJob.ts");
    await expect(sendNoRepoAlerts()).resolves.toBeUndefined();
    await expect(sendNoGithubAccountAlerts()).resolves.toBeUndefined();
  });

  it("sendProjectWarningAlerts delegates to warning evaluation sweep", async () => {
    const { sendProjectWarningAlerts } = await import("./notificationJob.ts");
    await sendProjectWarningAlerts();
    expect(evaluateProjectWarningsForAllProjectsMock).toHaveBeenCalledTimes(1);
  });
});
