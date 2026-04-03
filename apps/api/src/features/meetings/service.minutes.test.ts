import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveMinutes } from "./service.js";

import * as repo from "./repo.js";

vi.mock("./repo.js", () => ({
  getMeetingById: vi.fn(),
  upsertMinutes: vi.fn(),
  getModuleMeetingSettingsForTeam: vi.fn(),
}));

vi.mock("../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
}));

describe("meetings minutes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_FOUND from saveMinutes when meeting does not exist", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    await expect(saveMinutes(5, 1, "notes")).rejects.toEqual({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN from saveMinutes when writer is not the original writer and toggle is off", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [{ userId: 1 }] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: false });

    await expect(saveMinutes(5, 1, "overwrite")).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("allows team member to edit minutes when toggle is on", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [{ userId: 1 }] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: true });
    (repo.upsertMinutes as any).mockResolvedValue({ id: 1, content: "updated" });

    await saveMinutes(5, 1, "updated");

    expect(repo.upsertMinutes).toHaveBeenCalledWith(5, 1, "updated");
  });

  it("throws FORBIDDEN from saveMinutes when toggle is on but user is not a team member", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: true });

    await expect(saveMinutes(5, 1, "overwrite")).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("forwards saveMinutes to repo", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 5, teamId: 1, minutes: null, organiserId: 1 });
    (repo.upsertMinutes as any).mockResolvedValue({ id: 1, content: "notes" });

    await saveMinutes(5, 1, "notes");

    expect(repo.upsertMinutes).toHaveBeenCalledWith(5, 1, "notes");
  });
});
