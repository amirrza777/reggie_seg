import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/middleware.js", () => ({ requireAuth: vi.fn((_req: any, _res: any, next: any) => next()) }));
vi.mock("./controller.js", () => ({
  applyCustomAllocationHandler: vi.fn(),
  getCustomAllocationCoverageHandler: vi.fn(),
  listCustomAllocationQuestionnairesHandler: vi.fn(),
  previewCustomAllocationHandler: vi.fn(),
  createTeamInviteHandler: vi.fn(),
  acceptTeamInviteHandler: vi.fn(),
  declineTeamInviteHandler: vi.fn(),
  rejectTeamInviteHandler: vi.fn(),
  cancelTeamInviteHandler: vi.fn(),
  expireTeamInviteHandler: vi.fn(),
  listTeamInvitesHandler: vi.fn(),
  listReceivedInvitesHandler: vi.fn(),
  createTeamHandler: vi.fn(),
  createTeamForProjectHandler: vi.fn(),
  applyManualAllocationHandler: vi.fn(),
  applyRandomAllocationHandler: vi.fn(),
  approveAllocationDraftHandler: vi.fn(),
  deleteAllocationDraftHandler: vi.fn(),
  getManualAllocationWorkspaceHandler: vi.fn(),
  listAllocationDraftsHandler: vi.fn(),
  previewRandomAllocationHandler: vi.fn(),
  updateAllocationDraftHandler: vi.fn(),
  getTeamByIdHandler: vi.fn(),
  addUserToTeamHandler: vi.fn(),
  getTeamMembersHandler: vi.fn(),
}));

import { requireAuth } from "../../auth/middleware.js";
import router from "./router.js";

const CUSTOM_PATHS = [
  "/projects/:projectId/custom-questionnaires",
  "/projects/:projectId/custom-coverage",
  "/projects/:projectId/custom-preview",
  "/projects/:projectId/custom-allocate",
];

describe("router custom-allocation integration", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(CUSTOM_PATHS)("protects %s with requireAuth", (path) => {
    const layer: any = router.stack.find((entry: any) => entry.route?.path === path);
    expect(layer).toBeTruthy();
    expect(layer.route.stack[0].handle).toBe(requireAuth);
  });
});