import { describe, expect, it, vi, beforeEach } from "vitest";
import { approveAllocationDraftForProject } from "./service.drafts.js";

vi.mock("../repo/repo.js", () => ({
  findStaffScopedProjectAccess: vi.fn(),
  findDraftTeamInProject: vi.fn(),
  findDraftTeamById: vi.fn(),
  findStudentAllocationConflictsInProject: vi.fn(),
  approveDraftTeam: vi.fn(),
}));

vi.mock("../../notifications/service.js", () => ({
  addNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock("./service.drafts.helpers.js", () => ({
  notifyStudentsAboutApprovedDraftTeam: vi.fn().mockResolvedValue(undefined),
  parseExpectedUpdatedAt: vi.fn().mockReturnValue(undefined),
  mapAllocationDraftTeamForResponse: vi.fn(),
}));

import * as repo from "../repo/repo.js";
import * as notificationService from "../../notifications/service.js";

const mockProject = {
  id: 2,
  name: "Test Project",
  moduleId: 1,
  moduleName: "Test Module",
  enterpriseId: "ent-1",
  archivedAt: null,
  moduleArchivedAt: null,
  actorRole: "MODULE_LEAD",
  isModuleLead: true,
  isModuleTeachingAssistant: false,
  canApproveAllocationDrafts: true,
};

const mockApprovedTeam = {
  id: 99,
  teamName: "Draft Team A",
  memberCount: 2,
  members: [
    { id: 10, firstName: "Alice", lastName: "Smith", email: "alice@test.com" },
    { id: 11, firstName: "Bob", lastName: "Jones", email: "bob@test.com" },
  ],
};

describe("service.drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repo.findStaffScopedProjectAccess as any).mockResolvedValue(mockProject);
    (repo.findDraftTeamInProject as any).mockResolvedValue({ id: 99 });
    (repo.findDraftTeamById as any).mockResolvedValue({
      ...mockApprovedTeam,
      updatedAt: new Date(),
    });
    (repo.findStudentAllocationConflictsInProject as any).mockResolvedValue([]);
    (repo.approveDraftTeam as any).mockResolvedValue(mockApprovedTeam);
  });

  it("dispatches TEAM_ALLOCATED notification to each member on approval", async () => {
    await approveAllocationDraftForProject(1, 2, 99);

    expect(notificationService.addNotification).toHaveBeenCalledTimes(2);
    expect(notificationService.addNotification).toHaveBeenCalledWith({
      userId: 10,
      type: "TEAM_ALLOCATED",
      message: `You have been allocated to "Draft Team A"`,
      link: "/projects/2/team",
    });
  });

  it("does not throw if notification fails on approval", async () => {
    (notificationService.addNotification as any).mockRejectedValue(new Error("notification failed"));

    await expect(approveAllocationDraftForProject(1, 2, 99)).resolves.toBeDefined();
  });
});
