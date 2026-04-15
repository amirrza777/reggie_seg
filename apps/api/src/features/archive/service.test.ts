import { describe, it, expect, vi, beforeEach } from "vitest";
import * as repo from "./repo.js";
import {
  getModules,
  getProjects,
  isStaffOrAdmin,
  archiveModule,
  unarchiveModule,
  archiveProject,
  unarchiveProject,
} from "./service.js";

vi.mock("./repo.js", () => ({
  findUserRoleById: vi.fn(),
  findArchiveActor: vi.fn(),
  listModulesForArchiveActor: vi.fn(),
  listProjectsForArchiveActor: vi.fn(),
  findModuleIdForArchiveActorIfScoped: vi.fn(),
  findProjectIdForArchiveActorIfScoped: vi.fn(),
  setModuleArchived: vi.fn(),
  setProjectArchived: vi.fn(),
}));

describe("archive service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getModules returns [] when actor is missing or inactive", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(getModules(1)).resolves.toEqual([]);
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: false,
    });
    await expect(getModules(1)).resolves.toEqual([]);
    expect(repo.listModulesForArchiveActor).not.toHaveBeenCalled();
  });

  it("getModules lists modules for active actor", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.listModulesForArchiveActor as any).mockResolvedValue([{ id: 1 }]);
    const result = await getModules(1);
    expect(repo.listModulesForArchiveActor).toHaveBeenCalledWith(actor);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("getProjects returns [] when actor is missing or inactive", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(getProjects(1)).resolves.toEqual([]);
  });

  it("getProjects lists projects for active actor", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.listProjectsForArchiveActor as any).mockResolvedValue([{ id: 2 }]);
    const result = await getProjects(1);
    expect(repo.listProjectsForArchiveActor).toHaveBeenCalledWith(actor);
    expect(result).toEqual([{ id: 2 }]);
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

  it("archiveModule returns null when actor inactive or module not in scope", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(archiveModule(1, 1)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: false,
    });
    await expect(archiveModule(1, 1)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: true,
    });
    (repo.findModuleIdForArchiveActorIfScoped as any).mockResolvedValue(null);
    await expect(archiveModule(1, 1)).resolves.toBeNull();
    expect(repo.setModuleArchived).not.toHaveBeenCalled();
  });

  it("archiveModule calls setModuleArchived when scoped", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.findModuleIdForArchiveActorIfScoped as any).mockResolvedValue({ id: 1 });
    (repo.setModuleArchived as any).mockResolvedValue({ id: 1 });
    await archiveModule(1, 1);
    expect(repo.findModuleIdForArchiveActorIfScoped).toHaveBeenCalledWith(actor, 1);
    expect(repo.setModuleArchived).toHaveBeenCalledWith(1, expect.any(Date));
  });

  it("unarchiveModule calls setModuleArchived with null when scoped", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.findModuleIdForArchiveActorIfScoped as any).mockResolvedValue({ id: 1 });
    (repo.setModuleArchived as any).mockResolvedValue({ id: 1 });
    await unarchiveModule(1, 1);
    expect(repo.setModuleArchived).toHaveBeenCalledWith(1, null);
  });

  it("unarchiveModule returns null when actor is inactive or module is out of scope", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(unarchiveModule(1, 1)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: false,
    });
    await expect(unarchiveModule(1, 1)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: true,
    });
    (repo.findModuleIdForArchiveActorIfScoped as any).mockResolvedValue(null);
    await expect(unarchiveModule(1, 1)).resolves.toBeNull();
    expect(repo.setModuleArchived).not.toHaveBeenCalled();
  });

  it("archiveProject calls setProjectArchived when scoped", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.findProjectIdForArchiveActorIfScoped as any).mockResolvedValue({ id: 2 });
    (repo.setProjectArchived as any).mockResolvedValue({ id: 2 });
    await archiveProject(1, 2);
    expect(repo.findProjectIdForArchiveActorIfScoped).toHaveBeenCalledWith(actor, 2);
    expect(repo.setProjectArchived).toHaveBeenCalledWith(2, expect.any(Date));
  });

  it("archiveProject returns null when actor is inactive or project is out of scope", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(archiveProject(1, 2)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: false,
    });
    await expect(archiveProject(1, 2)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: true,
    });
    (repo.findProjectIdForArchiveActorIfScoped as any).mockResolvedValue(null);
    await expect(archiveProject(1, 2)).resolves.toBeNull();
    expect(repo.setProjectArchived).not.toHaveBeenCalled();
  });

  it("unarchiveProject calls setProjectArchived with null when scoped", async () => {
    const actor = { id: 1, role: "STAFF", enterpriseId: "e", active: true };
    (repo.findArchiveActor as any).mockResolvedValue(actor);
    (repo.findProjectIdForArchiveActorIfScoped as any).mockResolvedValue({ id: 2 });
    (repo.setProjectArchived as any).mockResolvedValue({ id: 2 });
    await unarchiveProject(1, 2);
    expect(repo.setProjectArchived).toHaveBeenCalledWith(2, null);
  });

  it("unarchiveProject returns null when actor is inactive or project is out of scope", async () => {
    (repo.findArchiveActor as any).mockResolvedValue(null);
    await expect(unarchiveProject(1, 2)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: false,
    });
    await expect(unarchiveProject(1, 2)).resolves.toBeNull();
    (repo.findArchiveActor as any).mockResolvedValue({
      id: 1,
      role: "STAFF",
      enterpriseId: "e",
      active: true,
    });
    (repo.findProjectIdForArchiveActorIfScoped as any).mockResolvedValue(null);
    await expect(unarchiveProject(1, 2)).resolves.toBeNull();
    expect(repo.setProjectArchived).not.toHaveBeenCalled();
  });
});
