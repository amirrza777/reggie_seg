import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTeamDeadlineForStaff,
  InvalidDeadlineOverrideError,
  ResolvedMcfAlreadyExistsError,
  resolveTeamMcfRequestWithDeadlineOverrideForStaff,
  reviewTeamMcfRequestForStaff,
} from "./service.js";
import * as repo from "../repo.js";

vi.mock("../repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
  getTeamDeadlineDetailsInProject: vi.fn(),
  getTeamCurrentDeadlineInProject: vi.fn(),
  hasAnotherResolvedMcfRequest: vi.fn(),
  reviewMcfRequest: vi.fn(),
  resolveMcfRequestWithDeadlineOverride: vi.fn(),
}));

describe("mcf-review service", () => {
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

  it("reviewTeamMcfRequestForStaff enforces staff scope and delegates review", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(reviewTeamMcfRequestForStaff(9, 3, 2, 11, "IN_REVIEW")).resolves.toBeNull();
    expect(repo.reviewMcfRequest).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.reviewMcfRequest as any).mockResolvedValueOnce({ id: 11, status: "IN_REVIEW" });
    await expect(reviewTeamMcfRequestForStaff(9, 3, 2, 11, "IN_REVIEW")).resolves.toEqual({
      id: 11,
      status: "IN_REVIEW",
    });
    expect(repo.reviewMcfRequest).toHaveBeenCalledWith(3, 2, 11, 9, "IN_REVIEW");
  });

  it("resolveTeamMcfRequestWithDeadlineOverrideForStaff fills omitted fields from current deadline", async () => {
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
    (repo.hasAnotherResolvedMcfRequest as any).mockResolvedValueOnce(false);
    (repo.resolveMcfRequestWithDeadlineOverride as any).mockResolvedValueOnce({
      request: { id: 11, status: "RESOLVED" },
      deadline: current,
    });

    await resolveTeamMcfRequestWithDeadlineOverrideForStaff(9, 3, 2, 11, {
      taskDueDate: new Date("2026-03-09T10:00:00.000Z"),
    }, {
      inputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 7 },
    });

    expect(repo.resolveMcfRequestWithDeadlineOverride).toHaveBeenCalledWith(3, 2, 11, 9, {
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

  it("resolveTeamMcfRequestWithDeadlineOverrideForStaff rejects earlier deadlines", async () => {
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
    (repo.hasAnotherResolvedMcfRequest as any).mockResolvedValueOnce(false);

    await expect(
      resolveTeamMcfRequestWithDeadlineOverrideForStaff(9, 3, 2, 11, {
        taskDueDate: new Date("2026-03-11T10:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(InvalidDeadlineOverrideError);
    expect(repo.resolveMcfRequestWithDeadlineOverride).not.toHaveBeenCalled();
  });

  it("resolveTeamMcfRequestWithDeadlineOverrideForStaff rejects approving another request when one is already resolved", async () => {
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
    (repo.hasAnotherResolvedMcfRequest as any).mockResolvedValueOnce(true);

    await expect(
      resolveTeamMcfRequestWithDeadlineOverrideForStaff(9, 3, 2, 11, {
        taskDueDate: new Date("2026-03-20T10:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(ResolvedMcfAlreadyExistsError);
    expect(repo.resolveMcfRequestWithDeadlineOverride).not.toHaveBeenCalled();
  });
});
