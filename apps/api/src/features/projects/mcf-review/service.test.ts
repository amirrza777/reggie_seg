import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTeamDeadlineForStaff,
  resolveTeamMcfRequestWithDeadlineOverrideForStaff,
  reviewTeamMcfRequestForStaff,
} from "./service.js";
import * as repo from "../repo.js";

vi.mock("../repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
  getTeamCurrentDeadlineInProject: vi.fn(),
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
    expect(repo.getTeamCurrentDeadlineInProject).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamCurrentDeadlineInProject as any).mockResolvedValueOnce({ taskDueDate: new Date() });
    await expect(fetchTeamDeadlineForStaff(7, 3, 2)).resolves.toEqual({ taskDueDate: expect.any(Date) });
    expect(repo.getTeamCurrentDeadlineInProject).toHaveBeenCalledWith(3, 2);
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
    (repo.resolveMcfRequestWithDeadlineOverride as any).mockResolvedValueOnce({
      request: { id: 11, status: "RESOLVED" },
      deadline: current,
    });

    await resolveTeamMcfRequestWithDeadlineOverrideForStaff(9, 3, 2, 11, {
      taskDueDate: new Date("2026-03-09T10:00:00.000Z"),
    });

    expect(repo.resolveMcfRequestWithDeadlineOverride).toHaveBeenCalledWith(3, 2, 11, 9, {
      taskOpenDate: current.taskOpenDate,
      taskDueDate: new Date("2026-03-09T10:00:00.000Z"),
      assessmentOpenDate: current.assessmentOpenDate,
      assessmentDueDate: current.assessmentDueDate,
      feedbackOpenDate: current.feedbackOpenDate,
      feedbackDueDate: current.feedbackDueDate,
    });
  });
});
