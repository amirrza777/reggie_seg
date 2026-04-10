import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStaffStudentDeadlineOverride,
  fetchProjectDeadline,
  fetchStaffStudentDeadlineOverrides,
  updateTeamDeadlineProfileForStaff,
  upsertStaffStudentDeadlineOverride,
} from "./service.js";
import * as repo from "../repo.js";
import * as notificationsService from "../../notifications/service.js";

vi.mock("../repo.js", () => ({
  getUserProjectDeadline: vi.fn(),
  updateStaffTeamDeadlineProfile: vi.fn(),
  getStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));

vi.mock("../../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

describe("projects deadlines service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchProjectDeadline delegates to repo", async () => {
    (repo.getUserProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01" });

    await expect(fetchProjectDeadline(1, 2)).resolves.toEqual({ taskDueDate: "2026-03-01" });
    expect(repo.getUserProjectDeadline).toHaveBeenCalledWith(1, 2);
  });

  it("updateTeamDeadlineProfileForStaff delegates to repo", async () => {
    (repo.updateStaffTeamDeadlineProfile as any).mockResolvedValue({ id: 8, deadlineProfile: "MCF" });

    await expect(updateTeamDeadlineProfileForStaff(1, 8, "MCF")).resolves.toEqual({
      id: 8,
      deadlineProfile: "MCF",
    });
    expect(repo.updateStaffTeamDeadlineProfile).toHaveBeenCalledWith(1, 8, "MCF");
  });

  it("fetchStaffStudentDeadlineOverrides delegates to repo", async () => {
    (repo.getStaffStudentDeadlineOverrides as any).mockResolvedValue([{ id: 1 }]);

    await expect(fetchStaffStudentDeadlineOverrides(1, 2)).resolves.toEqual([{ id: 1 }]);
    expect(repo.getStaffStudentDeadlineOverrides).toHaveBeenCalledWith(1, 2);
  });

  it("upsertStaffStudentDeadlineOverride delegates and notifies student", async () => {
    (repo.upsertStaffStudentDeadlineOverride as any).mockResolvedValue({ id: 55 });

    await expect(
      upsertStaffStudentDeadlineOverride(1, 3, 9, { taskDueDate: new Date("2026-04-10T10:00:00.000Z") }),
    ).resolves.toEqual({ id: 55 });

    expect(repo.upsertStaffStudentDeadlineOverride).toHaveBeenCalledWith(1, 3, 9, {
      taskDueDate: new Date("2026-04-10T10:00:00.000Z"),
    });
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        type: "DEADLINE_OVERRIDE_GRANTED",
        link: "/projects/3/deadlines",
      }),
    );
  });

  it("clearStaffStudentDeadlineOverride delegates to repo", async () => {
    (repo.clearStaffStudentDeadlineOverride as any).mockResolvedValue({ cleared: true });

    await expect(clearStaffStudentDeadlineOverride(1, 3, 9)).resolves.toEqual({ cleared: true });
    expect(repo.clearStaffStudentDeadlineOverride).toHaveBeenCalledWith(1, 3, 9);
  });
});
