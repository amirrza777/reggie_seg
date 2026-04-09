import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscribeToAuditStream: vi.fn(),
  unsubscribeFromAuditStream: vi.fn(),
  parseAdminEnterpriseSearchFilters: vi.fn(),
  parseAdminUserSearchFilters: vi.fn(),
  parseAdminEnterpriseIdParam: vi.fn(),
  parseAdminUserIdParam: vi.fn(),
  parseAuditLogsQuery: vi.fn(),
  parseCreateEnterpriseBody: vi.fn(),
  parseInviteEnterpriseAdminBody: vi.fn(),
  parseUpdateUserBody: vi.fn(),
  parseUpdateUserRoleBody: vi.fn(),
  createEnterprise: vi.fn(),
  deleteEnterprise: vi.fn(),
  getAuditLogs: vi.fn(),
  getSummary: vi.fn(),
  inviteEnterpriseAdmin: vi.fn(),
  listEnterpriseUsers: vi.fn(),
  listEnterprises: vi.fn(),
  listUsers: vi.fn(),
  searchEnterpriseUsers: vi.fn(),
  searchEnterprises: vi.fn(),
  searchUsers: vi.fn(),
  updateEnterpriseUser: vi.fn(),
  updateOwnEnterpriseUser: vi.fn(),
  updateOwnEnterpriseUserRole: vi.fn(),
}));

vi.mock("../audit/sse.js", () => ({
  subscribeToAuditStream: mocks.subscribeToAuditStream,
  unsubscribeFromAuditStream: mocks.unsubscribeFromAuditStream,
}));
vi.mock("./enterpriseSearch.js", () => ({
  parseAdminEnterpriseSearchFilters: mocks.parseAdminEnterpriseSearchFilters,
}));
vi.mock("./userSearch.js", () => ({
  parseAdminUserSearchFilters: mocks.parseAdminUserSearchFilters,
}));
vi.mock("./controller.parsers.js", () => ({
  parseAdminEnterpriseIdParam: mocks.parseAdminEnterpriseIdParam,
  parseAdminUserIdParam: mocks.parseAdminUserIdParam,
  parseAuditLogsQuery: mocks.parseAuditLogsQuery,
  parseCreateEnterpriseBody: mocks.parseCreateEnterpriseBody,
  parseInviteEnterpriseAdminBody: mocks.parseInviteEnterpriseAdminBody,
  parseUpdateUserBody: mocks.parseUpdateUserBody,
  parseUpdateUserRoleBody: mocks.parseUpdateUserRoleBody,
}));
vi.mock("./service.js", () => ({
  createEnterprise: mocks.createEnterprise,
  deleteEnterprise: mocks.deleteEnterprise,
  getAuditLogs: mocks.getAuditLogs,
  getSummary: mocks.getSummary,
  inviteEnterpriseAdmin: mocks.inviteEnterpriseAdmin,
  listEnterpriseUsers: mocks.listEnterpriseUsers,
  listEnterprises: mocks.listEnterprises,
  listUsers: mocks.listUsers,
  searchEnterpriseUsers: mocks.searchEnterpriseUsers,
  searchEnterprises: mocks.searchEnterprises,
  searchUsers: mocks.searchUsers,
  updateEnterpriseUser: mocks.updateEnterpriseUser,
  updateOwnEnterpriseUser: mocks.updateOwnEnterpriseUser,
  updateOwnEnterpriseUserRole: mocks.updateOwnEnterpriseUserRole,
}));

import {
  auditLogsStreamHandler,
  createEnterpriseHandler,
  deleteEnterpriseHandler,
  getSummaryHandler,
  inviteEnterpriseAdminHandler,
  listAuditLogsHandler,
  listEnterpriseUsersHandler,
  listEnterprisesHandler,
  listUsersHandler,
  searchEnterpriseUsersHandler,
  searchEnterprisesHandler,
  searchUsersHandler,
  updateEnterpriseUserHandler,
  updateUserHandler,
  updateUserRoleHandler,
} from "./controller.js";

function createRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("admin controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseAdminUserSearchFilters.mockReturnValue({ ok: true, value: { q: "a" } });
    mocks.parseAdminEnterpriseSearchFilters.mockReturnValue({ ok: true, value: { q: "a" } });
    mocks.parseAdminUserIdParam.mockReturnValue({ ok: true, value: 2 });
    mocks.parseAdminEnterpriseIdParam.mockReturnValue({ ok: true, value: "ent-2" });
    mocks.parseUpdateUserRoleBody.mockReturnValue({ ok: true, value: "STAFF" });
    mocks.parseUpdateUserBody.mockReturnValue({ ok: true, value: { active: true } });
    mocks.parseCreateEnterpriseBody.mockReturnValue({ ok: true, value: { name: "E", code: "e" } });
    mocks.parseAuditLogsQuery.mockReturnValue({ ok: true, value: { limit: 10 } });
    mocks.getSummary.mockResolvedValue({ users: 1 });
    mocks.parseInviteEnterpriseAdminBody.mockReturnValue({ ok: true, value: { email: "invite@example.com" } });
    mocks.inviteEnterpriseAdmin.mockResolvedValue({
      ok: true,
      value: { email: "invite@example.com", expiresAt: new Date("2026-04-15T00:00:00.000Z") },
    });
    mocks.listUsers.mockResolvedValue([{ id: 1 }]);
    mocks.searchUsers.mockResolvedValue([{ id: 2 }]);
    mocks.updateOwnEnterpriseUserRole.mockResolvedValue({ ok: true, value: { id: 2, role: "STAFF" } });
    mocks.updateOwnEnterpriseUser.mockResolvedValue({ ok: true, value: { id: 2 } });
    mocks.listEnterprises.mockResolvedValue([{ id: "ent-1" }]);
    mocks.searchEnterprises.mockResolvedValue([{ id: "ent-2" }]);
    mocks.createEnterprise.mockResolvedValue({ ok: true, value: { id: "ent-3" } });
    mocks.listEnterpriseUsers.mockResolvedValue({ ok: true, value: [{ id: 2 }] });
    mocks.searchEnterpriseUsers.mockResolvedValue({ ok: true, value: [{ id: 2 }] });
    mocks.updateEnterpriseUser.mockResolvedValue({ ok: true, value: { id: 2 } });
    mocks.deleteEnterprise.mockResolvedValue({ ok: true, value: { success: true } });
    mocks.getAuditLogs.mockResolvedValue({ items: [] });
  });

  it("handles summary/list/search endpoints", async () => {
    const adminReq = { adminUser: { enterpriseId: "ent-1", id: 1 }, query: {} } as any;
    const summaryRes = createRes();
    await getSummaryHandler(adminReq, summaryRes);
    expect(summaryRes.json).toHaveBeenCalledWith({ users: 1 });

    const listRes = createRes();
    await listUsersHandler(adminReq, listRes);
    expect(listRes.json).toHaveBeenCalledWith([{ id: 1 }]);

    const searchRes = createRes();
    await searchUsersHandler(adminReq, searchRes);
    expect(searchRes.json).toHaveBeenCalledWith([{ id: 2 }]);

    mocks.parseAdminUserSearchFilters.mockReturnValueOnce({ ok: false, error: "bad query" });
    const badSearchRes = createRes();
    await searchUsersHandler(adminReq, badSearchRes);
    expect(badSearchRes.status).toHaveBeenCalledWith(400);
  });

  it("handles update own enterprise user role/body parse and service failures", async () => {
    const req = { adminUser: { enterpriseId: "ent-1", id: 1 }, params: { id: "2" }, body: { role: "staff" } } as any;
    const res = createRes();
    await updateUserRoleHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 2, role: "STAFF" });

    mocks.parseAdminUserIdParam.mockReturnValueOnce({ ok: false, error: "Invalid user ID" });
    const badIdRes = createRes();
    await updateUserRoleHandler(req, badIdRes);
    expect(badIdRes.status).toHaveBeenCalledWith(400);

    mocks.parseUpdateUserRoleBody.mockReturnValueOnce({ ok: false, error: "Invalid role" });
    const badRoleRes = createRes();
    await updateUserRoleHandler(req, badRoleRes);
    expect(badRoleRes.status).toHaveBeenCalledWith(400);

    mocks.updateOwnEnterpriseUserRole.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const failRes = createRes();
    await updateUserRoleHandler(req, failRes);
    expect(failRes.status).toHaveBeenCalledWith(403);
  });

  it("handles update own enterprise user parse and service failures", async () => {
    const req = { adminUser: { enterpriseId: "ent-1", id: 1 }, params: { id: "2" }, body: { active: true } } as any;
    const res = createRes();
    await updateUserHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 2 });

    mocks.parseAdminUserIdParam.mockReturnValueOnce({ ok: false, error: "Invalid user ID" });
    const badIdRes = createRes();
    await updateUserHandler(req, badIdRes);
    expect(badIdRes.status).toHaveBeenCalledWith(400);

    mocks.parseUpdateUserBody.mockReturnValueOnce({ ok: false, error: "Invalid update body" });
    const badBodyRes = createRes();
    await updateUserHandler(req, badBodyRes);
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    mocks.updateOwnEnterpriseUser.mockResolvedValueOnce({ ok: false, status: 404, error: "Not found" });
    const failRes = createRes();
    await updateUserHandler(req, failRes);
    expect(failRes.status).toHaveBeenCalledWith(404);
  });

  it("handles enterprise listing/searching and create enterprise branches", async () => {
    const req = { adminUser: { enterpriseId: "ent-1", id: 1 }, query: {}, body: {} } as any;
    const listRes = createRes();
    await listEnterprisesHandler(req, listRes);
    expect(listRes.json).toHaveBeenCalledWith([{ id: "ent-1" }]);

    const searchRes = createRes();
    await searchEnterprisesHandler(req, searchRes);
    expect(searchRes.json).toHaveBeenCalledWith([{ id: "ent-2" }]);

    mocks.parseAdminEnterpriseSearchFilters.mockReturnValueOnce({ ok: false, error: "bad query" });
    const badSearchRes = createRes();
    await searchEnterprisesHandler(req, badSearchRes);
    expect(badSearchRes.status).toHaveBeenCalledWith(400);

    const createResOk = createRes();
    await createEnterpriseHandler(req, createResOk);
    expect(createResOk.status).toHaveBeenCalledWith(201);

    mocks.parseCreateEnterpriseBody.mockReturnValueOnce({ ok: false, error: "invalid body" });
    const createBadBody = createRes();
    await createEnterpriseHandler(req, createBadBody);
    expect(createBadBody.status).toHaveBeenCalledWith(400);

    mocks.createEnterprise.mockResolvedValueOnce({ ok: false, status: 409, error: "Duplicate code" });
    const createConflict = createRes();
    await createEnterpriseHandler(req, createConflict);
    expect(createConflict.status).toHaveBeenCalledWith(409);

    mocks.createEnterprise.mockRejectedValueOnce(new Error("db"));
    const createThrow = createRes();
    await createEnterpriseHandler(req, createThrow);
    expect(createThrow.status).toHaveBeenCalledWith(500);
  });

  it("handles enterprise-admin invite validation and service outcomes", async () => {
    const req = {
      adminUser: { enterpriseId: "ent-1", id: 1 },
      params: { enterpriseId: "ent-2" },
      body: { email: "invite@example.com" },
    } as any;

    const okRes = createRes();
    await inviteEnterpriseAdminHandler(req, okRes);
    expect(mocks.inviteEnterpriseAdmin).toHaveBeenCalledWith({ enterpriseId: "ent-2", email: "invite@example.com" }, 1);
    expect(okRes.status).toHaveBeenCalledWith(201);

    mocks.parseAdminEnterpriseIdParam.mockReturnValueOnce({ ok: false, error: "Enterprise id is required" });
    const badEnterpriseRes = createRes();
    await inviteEnterpriseAdminHandler(req, badEnterpriseRes);
    expect(badEnterpriseRes.status).toHaveBeenCalledWith(400);

    mocks.parseInviteEnterpriseAdminBody.mockReturnValueOnce({ ok: false, error: "email must be a string" });
    const badBodyRes = createRes();
    await inviteEnterpriseAdminHandler(req, badBodyRes);
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    mocks.inviteEnterpriseAdmin.mockResolvedValueOnce({ ok: false, status: 409, error: "User already has enterprise admin access" });
    const conflictRes = createRes();
    await inviteEnterpriseAdminHandler(req, conflictRes);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    mocks.inviteEnterpriseAdmin.mockRejectedValueOnce(new Error("smtp down"));
    const failRes = createRes();
    await inviteEnterpriseAdminHandler(req, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);
  });

  it("handles enterprise user list/search/update/delete branches", async () => {
    const req = {
      adminUser: { enterpriseId: "ent-1", id: 1 },
      params: { enterpriseId: "ent-2", id: "2" },
      query: {},
      body: { active: true },
    } as any;

    const listRes = createRes();
    await listEnterpriseUsersHandler(req, listRes);
    expect(listRes.json).toHaveBeenCalledWith([{ id: 2 }]);

    const searchRes = createRes();
    await searchEnterpriseUsersHandler(req, searchRes);
    expect(searchRes.json).toHaveBeenCalledWith([{ id: 2 }]);

    const updateRes = createRes();
    await updateEnterpriseUserHandler(req, updateRes);
    expect(updateRes.json).toHaveBeenCalledWith({ id: 2 });

    const deleteRes = createRes();
    await deleteEnterpriseHandler(req, deleteRes);
    expect(deleteRes.json).toHaveBeenCalledWith({ success: true });

    mocks.parseAdminEnterpriseIdParam.mockReturnValueOnce({ ok: false, error: "Invalid enterprise ID" });
    const badEntList = createRes();
    await listEnterpriseUsersHandler(req, badEntList);
    expect(badEntList.status).toHaveBeenCalledWith(400);

    mocks.listEnterpriseUsers.mockResolvedValueOnce({ ok: false, status: 404, error: "Enterprise not found" });
    const failEntList = createRes();
    await listEnterpriseUsersHandler(req, failEntList);
    expect(failEntList.status).toHaveBeenCalledWith(404);

    mocks.parseAdminEnterpriseIdParam.mockReturnValueOnce({ ok: false, error: "Invalid enterprise ID" });
    const badEntSearch = createRes();
    await searchEnterpriseUsersHandler(req, badEntSearch);
    expect(badEntSearch.status).toHaveBeenCalledWith(400);

    mocks.parseAdminUserSearchFilters.mockReturnValueOnce({ ok: false, error: "bad query" });
    const badSearchQuery = createRes();
    await searchEnterpriseUsersHandler(req, badSearchQuery);
    expect(badSearchQuery.status).toHaveBeenCalledWith(400);

    mocks.searchEnterpriseUsers.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const failEntSearch = createRes();
    await searchEnterpriseUsersHandler(req, failEntSearch);
    expect(failEntSearch.status).toHaveBeenCalledWith(403);

    mocks.parseAdminEnterpriseIdParam.mockReturnValueOnce({ ok: false, error: "Invalid enterprise ID" });
    const badEntUpdate = createRes();
    await updateEnterpriseUserHandler(req, badEntUpdate);
    expect(badEntUpdate.status).toHaveBeenCalledWith(400);

    mocks.parseAdminUserIdParam.mockReturnValueOnce({ ok: false, error: "Invalid user ID" });
    const badUserUpdate = createRes();
    await updateEnterpriseUserHandler(req, badUserUpdate);
    expect(badUserUpdate.status).toHaveBeenCalledWith(400);

    mocks.parseUpdateUserBody.mockReturnValueOnce({ ok: false, error: "Invalid update body" });
    const badBodyUpdate = createRes();
    await updateEnterpriseUserHandler(req, badBodyUpdate);
    expect(badBodyUpdate.status).toHaveBeenCalledWith(400);

    mocks.updateEnterpriseUser.mockResolvedValueOnce({ ok: false, status: 404, error: "User not found" });
    const failUpdate = createRes();
    await updateEnterpriseUserHandler(req, failUpdate);
    expect(failUpdate.status).toHaveBeenCalledWith(404);

    mocks.parseAdminEnterpriseIdParam.mockReturnValueOnce({ ok: false, error: "Invalid enterprise ID" });
    const badEntDelete = createRes();
    await deleteEnterpriseHandler(req, badEntDelete);
    expect(badEntDelete.status).toHaveBeenCalledWith(400);

    mocks.deleteEnterprise.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const failDelete = createRes();
    await deleteEnterpriseHandler(req, failDelete);
    expect(failDelete.status).toHaveBeenCalledWith(403);
  });

  it("handles audit logs query parsing and enterprise-id guards", async () => {
    const req = { adminUser: { enterpriseId: "ent-1", id: 1 }, query: {} } as any;
    const okRes = createRes();
    await listAuditLogsHandler(req, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ items: [] });

    const noEntRes = createRes();
    await listAuditLogsHandler({ adminUser: {}, query: {} } as any, noEntRes);
    expect(noEntRes.status).toHaveBeenCalledWith(500);

    mocks.parseAuditLogsQuery.mockReturnValueOnce({ ok: false, error: "invalid query" });
    const badQueryRes = createRes();
    await listAuditLogsHandler(req, badQueryRes);
    expect(badQueryRes.status).toHaveBeenCalledWith(400);
  });

  it("sets up audit stream headers and unsubscribes on close", () => {
    vi.useFakeTimers();
    const listeners = new Map<string, Function>();
    const req = {
      adminUser: { enterpriseId: "ent-1" },
      on: vi.fn((event: string, cb: Function) => {
        listeners.set(event, cb);
      }),
    } as any;
    const res = createRes();
    auditLogsStreamHandler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(mocks.subscribeToAuditStream).toHaveBeenCalledWith("ent-1", res);

    vi.advanceTimersByTime(30_000);
    expect(res.write).toHaveBeenCalledWith(": heartbeat\n\n");

    listeners.get("close")?.();
    expect(mocks.unsubscribeFromAuditStream).toHaveBeenCalledWith("ent-1", res);
    vi.useRealTimers();
  });

  it("returns 500 when audit stream has no enterprise id", () => {
    const req = { adminUser: {}, on: vi.fn() } as any;
    const res = createRes();
    auditLogsStreamHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalled();
  });
});
