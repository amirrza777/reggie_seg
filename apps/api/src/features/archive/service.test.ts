import { describe, it, expect, vi, beforeEach } from "vitest";
import * as repo from "./repo.js";
import {
  getModules,
  getProjects,
  getTeams,
  isStaffOrAdmin,
  archiveModule,
  unarchiveModule,
  archiveProject,
  unarchiveProject,
  archiveTeam,
  unarchiveTeam,
} from "./service.js";

vi.mock("./repo.js", () => ({
  findUserRoleById: vi.fn(),
  listAllModules: vi.fn(),
  listAllProjects: vi.fn(),
  listAllTeams: vi.fn(),
  setModuleArchived: vi.fn(),
  setProjectArchived: vi.fn(),
  setTeamArchived: vi.fn(),
}));

describe("archive service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getModules delegates to listAllModules", async () => {
    (repo.listAllModules as any).mockResolvedValue([{ id: 1 }]);
    const result = await getModules();
    expect(repo.listAllModules).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1 }]);
  });

  it("getProjects delegates to listAllProjects", async () => {
    (repo.listAllProjects as any).mockResolvedValue([{ id: 2 }]);
    const result = await getProjects();
    expect(repo.listAllProjects).toHaveBeenCalled();
    expect(result).toEqual([{ id: 2 }]);
  });

  it("getTeams delegates to listAllTeams", async () => {
    (repo.listAllTeams as any).mockResolvedValue([{ id: 3 }]);
    const result = await getTeams();
    expect(repo.listAllTeams).toHaveBeenCalled();
    expect(result).toEqual([{ id: 3 }]);
  });

  describe("isStaffOrAdmin", () => {
    it("returns false when userId is undefined", async () => {
      expect(await isStaffOrAdmin(undefined)).toBe(false);
    });

    it("returns false when user is not found", async () => {
      (repo.findUserRoleById as any).mockResolvedValue(null);
      expect(await isStaffOrAdmin(1)).toBe(false);
    });

    it("returns true for STAFF role", async () => {
      (repo.findUserRoleById as any).mockResolvedValue({ role: "STAFF" });
      expect(await isStaffOrAdmin(1)).toBe(true);
    });

    it("returns true for ENTERPRISE_ADMIN role", async () => {
      (repo.findUserRoleById as any).mockResolvedValue({ role: "ENTERPRISE_ADMIN" });
      expect(await isStaffOrAdmin(1)).toBe(true);
    });

    it("returns true for ADMIN role", async () => {
      (repo.findUserRoleById as any).mockResolvedValue({ role: "ADMIN" });
      expect(await isStaffOrAdmin(1)).toBe(true);
    });

    it("returns false for STUDENT role", async () => {
      (repo.findUserRoleById as any).mockResolvedValue({ role: "STUDENT" });
      expect(await isStaffOrAdmin(1)).toBe(false);
    });
  });

  it("archiveModule calls setModuleArchived with a date", async () => {
    (repo.setModuleArchived as any).mockResolvedValue({ id: 1 });
    await archiveModule(1);
    expect(repo.setModuleArchived).toHaveBeenCalledWith(1, expect.any(Date));
  });

  it("unarchiveModule calls setModuleArchived with null", async () => {
    (repo.setModuleArchived as any).mockResolvedValue({ id: 1 });
    await unarchiveModule(1);
    expect(repo.setModuleArchived).toHaveBeenCalledWith(1, null);
  });

  it("archiveProject calls setProjectArchived with a date", async () => {
    (repo.setProjectArchived as any).mockResolvedValue({ id: 2 });
    await archiveProject(2);
    expect(repo.setProjectArchived).toHaveBeenCalledWith(2, expect.any(Date));
  });

  it("unarchiveProject calls setProjectArchived with null", async () => {
    (repo.setProjectArchived as any).mockResolvedValue({ id: 2 });
    await unarchiveProject(2);
    expect(repo.setProjectArchived).toHaveBeenCalledWith(2, null);
  });

  it("archiveTeam calls setTeamArchived with a date", async () => {
    (repo.setTeamArchived as any).mockResolvedValue({ id: 3 });
    await archiveTeam(3);
    expect(repo.setTeamArchived).toHaveBeenCalledWith(3, expect.any(Date));
  });

  it("unarchiveTeam calls setTeamArchived with null", async () => {
    (repo.setTeamArchived as any).mockResolvedValue({ id: 3 });
    await unarchiveTeam(3);
    expect(repo.setTeamArchived).toHaveBeenCalledWith(3, null);
  });
});
