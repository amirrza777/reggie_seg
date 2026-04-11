import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTeamDeadlineForStaff,
  InvalidDeadlineOverrideError,
  ResolvedTeamHealthMessageAlreadyExistsError,
  resolveTeamHealthMessageWithDeadlineOverrideForStaff,
  reviewTeamHealthMessageForStaff,
} from "./service.js";
import * as repo from "./repo.js";
import * as projectRepo from "../projects/repo.js";
import * as notificationsService from "../notifications/service.js";

vi.mock("./repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
  getTeamDeadlineDetailsInProject: vi.fn(),
  getTeamCurrentDeadlineInProject: vi.fn(),
  hasAnotherResolvedTeamHealthMessage: vi.fn(),
  reviewTeamHealthMessage: vi.fn(),
  resolveTeamHealthMessageWithDeadlineOverride: vi.fn(),
}));

vi.mock("../projects/repo.js", () => ({
  getTeamById: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
  getModuleLeadsForProject: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

describe("team-health-review service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchTeamDeadlineForStaff enforces staff scope", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(fetchTeamDeadlineForStaff(7, 3, 2)).resolves.toBeNull();
    expect(repo.getTeamDeadlineDetailsInProject).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamDeadlineDetailsInProject as any).mockResolvedValueOnce({
      baseDeadline: { taskDueDate: new Date("2026-03-01T10:00:00.000Z") },
      effectiveDeadline: { taskDueDate: new Date("2026-03-04T10:00:00.000Z") },
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 3 },
    });
    await expect(fetchTeamDeadlineForStaff(7, 3, 2)).resolves.toEqual({
      baseDeadline: { taskDueDate: expect.any(Date) },
      effectiveDeadline: { taskDueDate: expect.any(Date) },
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 3 },
    });
    expect(repo.getTeamDeadlineDetailsInProject).toHaveBeenCalledWith(3, 2);
  });

  it("reviewTeamHealthMessageForStaff enforces staff scope and delegates review", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(reviewTeamHealthMessageForStaff(9, 3, 2, 11, false)).resolves.toBeNull();
    expect(repo.reviewTeamHealthMessage).not.toHaveBeenCalled();
    expect(notificationsService.addNotification).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.reviewTeamHealthMessage as any).mockResolvedValueOnce({ id: 11, resolved: false });
    await expect(reviewTeamHealthMessageForStaff(9, 3, 2, 11, false)).resolves.toEqual({
      id: 11,
      resolved: false,
    });
    expect(repo.reviewTeamHealthMessage).toHaveBeenCalledWith(3, 2, 11, 9, false, undefined);
    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("reviewTeamHealthMessageForStaff notifies students when staff response text is saved", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.reviewTeamHealthMessage as any).mockResolvedValueOnce({
      id: 11,
      resolved: true,
      responseText: "Thanks for raising this. We will follow up.",
    });
    (projectRepo.getTeamById as any).mockResolvedValueOnce({
      id: 2,
      projectId: 3,
      allocations: [
        { userId: 101, user: { role: "STUDENT" } },
        { userId: 102, user: { role: "STUDENT" } },
        { userId: 9, user: { role: "STAFF" } },
      ],
    });

    await reviewTeamHealthMessageForStaff(9, 3, 2, 11, true, "Thanks for raising this. We will follow up.");

    expect(notificationsService.addNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.addNotification).toHaveBeenCalledWith({
      userId: 101,
      type: "TEAM_HEALTH_SUBMITTED",
      message: "Staff has responded to a team health message",
      link: "/projects/3/team-health",
    });
    expect(notificationsService.addNotification).toHaveBeenCalledWith({
      userId: 102,
      type: "TEAM_HEALTH_SUBMITTED",
      message: "Staff has responded to a team health message",
      link: "/projects/3/team-health",
    });
  });

  it("resolveTeamHealthMessageWithDeadlineOverrideForStaff fills omitted fields from current deadline", async () => {
    const current = {
      taskOpenDate: new Date("2026-03-01T10:00:00.000Z"),
      taskDueDate: new Date("2026-03-02T10:00:00.000Z"),
      assessmentOpenDate: new Date("2026-03-03T10:00:00.000Z"),
      assessmentDueDate: new Date("2026-03-04T10:00:00.000Z"),
      feedbackOpenDate: new Date("2026-03-05T10:00:00.000Z"),
      feedbackDueDate: new Date("2026-03-06T10:00:00.000Z"),
      isOverridden: false,
    };

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamCurrentDeadlineInProject as any).mockResolvedValueOnce(current);
    (repo.hasAnotherResolvedTeamHealthMessage as any).mockResolvedValueOnce(false);
    (repo.resolveTeamHealthMessageWithDeadlineOverride as any).mockResolvedValueOnce({
      request: { id: 11, resolved: true },
      deadline: current,
    });

    await resolveTeamHealthMessageWithDeadlineOverrideForStaff(9, 3, 2, 11, {
      taskDueDate: new Date("2026-03-09T10:00:00.000Z"),
    }, {
      inputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 7 },
    });

    expect(repo.resolveTeamHealthMessageWithDeadlineOverride).toHaveBeenCalledWith(3, 2, 11, 9, {
      taskOpenDate: current.taskOpenDate,
      taskDueDate: new Date("2026-03-09T10:00:00.000Z"),
      assessmentOpenDate: current.assessmentOpenDate,
      assessmentDueDate: current.assessmentDueDate,
      feedbackOpenDate: current.feedbackOpenDate,
      feedbackDueDate: current.feedbackDueDate,
    }, {
      inputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 7 },
    });
  });

  it("resolveTeamHealthMessageWithDeadlineOverrideForStaff rejects earlier deadlines", async () => {
    const current = {
      taskOpenDate: new Date("2026-03-10T10:00:00.000Z"),
      taskDueDate: new Date("2026-03-12T10:00:00.000Z"),
      assessmentOpenDate: new Date("2026-03-13T10:00:00.000Z"),
      assessmentDueDate: new Date("2026-03-14T10:00:00.000Z"),
      feedbackOpenDate: new Date("2026-03-15T10:00:00.000Z"),
      feedbackDueDate: new Date("2026-03-16T10:00:00.000Z"),
      isOverridden: false,
    };

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamCurrentDeadlineInProject as any).mockResolvedValueOnce(current);
    (repo.hasAnotherResolvedTeamHealthMessage as any).mockResolvedValueOnce(false);

    await expect(
      resolveTeamHealthMessageWithDeadlineOverrideForStaff(9, 3, 2, 11, {
        taskDueDate: new Date("2026-03-11T10:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(InvalidDeadlineOverrideError);
    expect(repo.resolveTeamHealthMessageWithDeadlineOverride).not.toHaveBeenCalled();
  });

  it("resolveTeamHealthMessageWithDeadlineOverrideForStaff rejects approving another request when one is already resolved", async () => {
    const current = {
      taskOpenDate: new Date("2026-03-10T10:00:00.000Z"),
      taskDueDate: new Date("2026-03-12T10:00:00.000Z"),
      assessmentOpenDate: new Date("2026-03-13T10:00:00.000Z"),
      assessmentDueDate: new Date("2026-03-14T10:00:00.000Z"),
      feedbackOpenDate: new Date("2026-03-15T10:00:00.000Z"),
      feedbackDueDate: new Date("2026-03-16T10:00:00.000Z"),
      isOverridden: false,
    };

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamCurrentDeadlineInProject as any).mockResolvedValueOnce(current);
    (repo.hasAnotherResolvedTeamHealthMessage as any).mockResolvedValueOnce(true);

    await expect(
      resolveTeamHealthMessageWithDeadlineOverrideForStaff(9, 3, 2, 11, {
        taskDueDate: new Date("2026-03-20T10:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(ResolvedTeamHealthMessageAlreadyExistsError);
    expect(repo.resolveTeamHealthMessageWithDeadlineOverride).not.toHaveBeenCalled();
  });
});
