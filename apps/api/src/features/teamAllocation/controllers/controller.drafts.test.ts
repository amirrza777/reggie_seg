import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  service: {
    approveAllocationDraftForProject: vi.fn(),
    deleteAllocationDraftForProject: vi.fn(),
    listAllocationDraftsForProject: vi.fn(),
    updateAllocationDraftForProject: vi.fn(),
  },
  sendProjectOrModuleArchivedConflict: vi.fn(),
}));

vi.mock("../service/service.js", () => ({
  approveAllocationDraftForProject: mocks.service.approveAllocationDraftForProject,
  deleteAllocationDraftForProject: mocks.service.deleteAllocationDraftForProject,
  listAllocationDraftsForProject: mocks.service.listAllocationDraftsForProject,
  updateAllocationDraftForProject: mocks.service.updateAllocationDraftForProject,
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: mocks.sendProjectOrModuleArchivedConflict,
}));

import {
  approveAllocationDraftHandler,
  deleteAllocationDraftHandler,
  listAllocationDraftsHandler,
  updateAllocationDraftHandler,
} from "./controller.drafts.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("controller.drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValue(false);
    mocks.service.listAllocationDraftsForProject.mockResolvedValue({ drafts: [] });
    mocks.service.updateAllocationDraftForProject.mockResolvedValue({ draft: { id: 1 } });
    mocks.service.approveAllocationDraftForProject.mockResolvedValue({ approvedTeam: { id: 1 } });
    mocks.service.deleteAllocationDraftForProject.mockResolvedValue({ deletedDraft: { id: 1 } });
  });

  it("returns 401 when listing drafts without auth", async () => {
    const res = createResponse();
    await listAllocationDraftsHandler({ params: { projectId: "4" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when listing drafts with invalid project id", async () => {
    const res = createResponse();
    await listAllocationDraftsHandler({ user: { sub: 3 }, params: { projectId: "x" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("lists drafts on success", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4" } };
    const res = createResponse();
    await listAllocationDraftsHandler(req as any, res);
    expect(mocks.service.listAllocationDraftsForProject).toHaveBeenCalledWith(3, 4);
    expect(res.json).toHaveBeenCalledWith({ drafts: [] });
  });

  it("maps list errors", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4" } };
    const notFound = createResponse();
    mocks.service.listAllocationDraftsForProject.mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    await listAllocationDraftsHandler(req as any, notFound);
    expect(notFound.status).toHaveBeenCalledWith(404);

    const unavailable = createResponse();
    mocks.service.listAllocationDraftsForProject.mockRejectedValueOnce({ code: "P2021" });
    await listAllocationDraftsHandler(req as any, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(503);
  });

  it("maps archived and unexpected list errors", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4" } };
    const archived = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.listAllocationDraftsForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await listAllocationDraftsHandler(req as any, archived);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.listAllocationDraftsForProject.mockRejectedValueOnce(new Error("boom"));
    await listAllocationDraftsHandler(req as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("returns 400 for invalid draft team id during update", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "x" }, body: { teamName: "New" } };
    const res = createResponse();
    await updateAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 for update when auth is missing", async () => {
    const req = { params: { projectId: "4", teamId: "9" }, body: { teamName: "New" } };
    const res = createResponse();
    await updateAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for update when draft body is invalid", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { teamName: 12 } };
    const res = createResponse();
    await updateAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns updated draft payload on successful update", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { teamName: "New" } };
    const res = createResponse();
    await updateAllocationDraftHandler(req as any, res);
    expect(res.json).toHaveBeenCalledWith({ draft: { id: 1 } });
  });

  it.each([
    ["INVALID_DRAFT_TEAM_ID", 400],
    ["INVALID_DRAFT_UPDATE", 400],
    ["INVALID_TEAM_NAME", 400],
    ["INVALID_STUDENT_IDS", 400],
    ["INVALID_EXPECTED_UPDATED_AT", 400],
    ["STUDENT_NOT_IN_MODULE", 400],
    ["TEAM_NAME_ALREADY_EXISTS", 409],
    ["STUDENT_ALREADY_ASSIGNED", 409],
    ["STUDENT_IN_OTHER_DRAFT", 409],
    ["DRAFT_TEAM_NOT_FOUND", 404],
    ["DRAFT_OUTDATED", 409],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
  ])("maps update error code %s", async (code, status) => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { teamName: "New" } };
    const res = createResponse();
    mocks.service.updateAllocationDraftForProject.mockRejectedValueOnce({ code });
    await updateAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("maps unavailable and unexpected update errors", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { teamName: "New" } };
    const unavailable = createResponse();
    mocks.service.updateAllocationDraftForProject.mockRejectedValueOnce({ code: "P2022" });
    await updateAllocationDraftHandler(req as any, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(503);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.updateAllocationDraftForProject.mockRejectedValueOnce(new Error("boom"));
    await updateAllocationDraftHandler(req as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("maps archived update errors through project-write guard", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { teamName: "New" } };
    const res = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.updateAllocationDraftForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await updateAllocationDraftHandler(req as any, res);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
  });

  it("returns 400 when approve expectedUpdatedAt is not a string", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { expectedUpdatedAt: 12 } };
    const res = createResponse();
    await approveAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ["returns 401 for approve when auth is missing", { params: { projectId: "4", teamId: "9" }, body: {} }, 401],
    [
      "returns 400 for approve when project id is invalid",
      { user: { sub: 3 }, params: { projectId: "x", teamId: "9" }, body: {} },
      400,
    ],
    [
      "returns 400 for approve when team id is invalid",
      { user: { sub: 3 }, params: { projectId: "4", teamId: "x" }, body: {} },
      400,
    ],
  ])("%s", async (_label, req, expectedStatus) => {
    const res = createResponse();
    await approveAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(expectedStatus);
  });

  it("returns 201 and payload on successful approve", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    await approveAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ approvedTeam: { id: 1 } });
  });

  it.each([
    ["INVALID_DRAFT_TEAM_ID", 400],
    ["APPROVAL_FORBIDDEN", 403],
    ["DRAFT_TEAM_HAS_NO_MEMBERS", 409],
    ["INVALID_EXPECTED_UPDATED_AT", 400],
    ["STUDENTS_NO_LONGER_AVAILABLE", 409],
    ["DRAFT_OUTDATED", 409],
    ["DRAFT_TEAM_NOT_FOUND", 404],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
  ])("maps approve error code %s", async (code, status) => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    mocks.service.approveAllocationDraftForProject.mockRejectedValueOnce({ code });
    await approveAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("maps unavailable and unexpected approve errors", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const unavailable = createResponse();
    mocks.service.approveAllocationDraftForProject.mockRejectedValueOnce({ code: "P2021" });
    await approveAllocationDraftHandler(req as any, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(503);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.approveAllocationDraftForProject.mockRejectedValueOnce(new Error("boom"));
    await approveAllocationDraftHandler(req as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("maps archived approve errors through project-write guard", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.approveAllocationDraftForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await approveAllocationDraftHandler(req as any, res);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
  });

  it.each([
    ["INVALID_DRAFT_TEAM_ID", 400],
    ["INVALID_EXPECTED_UPDATED_AT", 400],
    ["DELETE_DRAFT_FORBIDDEN", 403],
    ["DRAFT_OUTDATED", 409],
    ["DRAFT_TEAM_NOT_FOUND", 404],
    ["PROJECT_NOT_FOUND_OR_FORBIDDEN", 404],
  ])("maps delete error code %s", async (code, status) => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    mocks.service.deleteAllocationDraftForProject.mockRejectedValueOnce({ code });
    await deleteAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("returns 400 when deleting draft with invalid project id", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "nope", teamId: "9" }, body: {} };
    const res = createResponse();
    await deleteAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ["returns 401 for delete when auth is missing", { params: { projectId: "4", teamId: "9" }, body: {} }, 401],
    [
      "returns 400 for delete when team id is invalid",
      { user: { sub: 3 }, params: { projectId: "4", teamId: "x" }, body: {} },
      400,
    ],
    [
      "returns 400 for delete when expectedUpdatedAt body is invalid",
      { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: { expectedUpdatedAt: 123 } },
      400,
    ],
  ])("%s", async (_label, req, expectedStatus) => {
    const res = createResponse();
    await deleteAllocationDraftHandler(req as any, res);
    expect(res.status).toHaveBeenCalledWith(expectedStatus);
  });

  it("returns deleted draft payload on successful delete", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    await deleteAllocationDraftHandler(req as any, res);
    expect(res.json).toHaveBeenCalledWith({ deletedDraft: { id: 1 } });
  });

  it("maps archived delete errors through project-write guard", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const res = createResponse();
    mocks.sendProjectOrModuleArchivedConflict.mockReturnValueOnce(true);
    mocks.service.deleteAllocationDraftForProject.mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    await deleteAllocationDraftHandler(req as any, res);
    expect(mocks.sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
  });

  it("maps unavailable and unexpected delete errors", async () => {
    const req = { user: { sub: 3 }, params: { projectId: "4", teamId: "9" }, body: {} };
    const unavailable = createResponse();
    mocks.service.deleteAllocationDraftForProject.mockRejectedValueOnce({ code: "P2021" });
    await deleteAllocationDraftHandler(req as any, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(503);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = createResponse();
    mocks.service.deleteAllocationDraftForProject.mockRejectedValueOnce(new Error("boom"));
    await deleteAllocationDraftHandler(req as any, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});
