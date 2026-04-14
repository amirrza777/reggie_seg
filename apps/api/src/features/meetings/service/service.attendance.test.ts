import { describe, it, expect, vi, beforeEach } from "vitest";
import { markAttendance } from "../service.js";

import * as repo from "../repo.js";
import * as notificationsService from "../../notifications/service.js";

vi.mock("../repo.js", () => ({
  getMeetingById: vi.fn(),
  bulkUpsertAttendance: vi.fn(),
  getRecentAttendanceForUser: vi.fn(),
  getModuleLeadsForTeam: vi.fn(),
  getModuleMeetingSettingsForTeam: vi.fn(),
}));

vi.mock("../../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
}));

describe("meetings attendance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND when meeting is missing", async () => {
    const records = [{ userId: 1, status: "Present" }];
    (repo.getMeetingById as any).mockResolvedValue(null);

    await expect(markAttendance(3, records)).rejects.toEqual({ code: "NOT_FOUND" });
    expect(repo.bulkUpsertAttendance).not.toHaveBeenCalled();
  });

  it("forwards markAttendance to repo", async () => {
    const records = [{ userId: 1, status: "Present" }];
    (repo.getMeetingById as any).mockResolvedValue({
      id: 3,
      teamId: 1,
      team: { projectId: 10, teamName: "Team A", allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({
      absenceThreshold: 2,
      minutesEditWindowDays: 7,
    });
    (repo.getModuleLeadsForTeam as any).mockResolvedValue([]);

    await markAttendance(3, records);

    expect(repo.bulkUpsertAttendance).toHaveBeenCalledWith(3, records);
  });

  it("does not notify when no records have absent status", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 3,
      teamId: 1,
      team: { projectId: 10, teamName: "Team A", allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 2, minutesEditWindowDays: 7 });
    (repo.getModuleLeadsForTeam as any).mockResolvedValue([]);

    await markAttendance(3, [{ userId: 1, status: "Present" }]);

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("notifies user and module leads when consecutive absence threshold is reached", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 3,
      teamId: 1,
      team: {
        projectId: 10,
        teamName: "Team A",
        allocations: [{ user: { id: 1, firstName: "Alice", lastName: "Smith" } }],
      },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 2, minutesEditWindowDays: 7 });
    (repo.getModuleLeadsForTeam as any).mockResolvedValue([{ userId: 99 }]);
    (repo.getRecentAttendanceForUser as any).mockResolvedValue([{ status: "absent" }, { status: "absent" }]);

    await markAttendance(3, [{ userId: 1, status: "absent" }]);

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: "LOW_ATTENDANCE" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 99, type: "LOW_ATTENDANCE" })
    );
  });
});
