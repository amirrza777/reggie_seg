import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createEnterprise,
  deleteEnterprise,
  getAdminSummary,
  inviteGlobalAdmin,
  inviteCurrentEnterpriseAdmin,
  inviteEnterpriseAdmin,
  listEnterpriseUsers,
  listEnterprises,
  listAuditLogs,
  listUsers,
  searchEnterprises,
  searchEnterpriseUsers,
  searchUsers,
  updateEnterpriseUser,
  updateUser,
  updateUserRole,
} from "./client";

describe("admin api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ ok: true });
  });

  it("lists users", async () => {
    await listUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users");
  });

  it("searches users with filters and pagination", async () => {
    await searchUsers({ q: "staff", role: "STAFF", active: true, page: 2, pageSize: 10 });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users/search?q=staff&role=STAFF&active=true&page=2&pageSize=10");
  });

  it("searches users with sort params", async () => {
    await searchUsers({ sortBy: "joinDate", sortDirection: "desc" });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users/search?sortBy=joinDate&sortDirection=desc");
  });

  it("searches users with bare path when filters are empty", async () => {
    await searchUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users/search");
  });

  it("updates a user role", async () => {
    await updateUserRole(12, "STAFF");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users/12/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "STAFF" }),
    });
  });

  it("updates a user payload", async () => {
    await updateUser(12, { active: false });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users/12", {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });
  });

  it("builds audit logs query params", async () => {
    await listAuditLogs({ from: "2026-01-01", to: "2026-01-31", limit: 50 });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/audit-logs?from=2026-01-01&to=2026-01-31&limit=50");
  });

  it("uses bare audit logs path when no params are provided", async () => {
    await listAuditLogs();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/audit-logs");
  });

  it("gets summary", async () => {
    await getAdminSummary();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/summary");
  });

  it("lists enterprises", async () => {
    await listEnterprises();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises");
  });

  it("searches enterprises with query and pagination", async () => {
    await searchEnterprises({ q: "kcl", page: 2, pageSize: 8 });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/search?q=kcl&page=2&pageSize=8");
  });

  it("searches enterprises with bare path when filters are empty", async () => {
    await searchEnterprises();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/search");
  });

  it("creates an enterprise", async () => {
    await createEnterprise({ name: "King's College London", code: "KCL" });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises", {
      method: "POST",
      body: JSON.stringify({ name: "King's College London", code: "KCL" }),
    });
  });

  it("deletes an enterprise", async () => {
    await deleteEnterprise("ent_123");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123", {
      method: "DELETE",
    });
  });

  it("lists users for an enterprise", async () => {
    await listEnterpriseUsers("ent_123");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/users");
  });

  it("searches enterprise users with filters and pagination", async () => {
    await searchEnterpriseUsers("ent_123", { q: "student", page: 3, pageSize: 25 });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/users/search?q=student&page=3&pageSize=25");
  });

  it("searches enterprise users with role and active filters", async () => {
    await searchEnterpriseUsers("ent_123", { role: "STAFF", active: false });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/users/search?role=STAFF&active=false");
  });

  it("searches enterprise users with sort params", async () => {
    await searchEnterpriseUsers("ent_123", { sortBy: "name", sortDirection: "asc" });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/admin/enterprises/ent_123/users/search?sortBy=name&sortDirection=asc",
    );
  });

  it("searches enterprise users with bare path when filters are empty", async () => {
    await searchEnterpriseUsers("ent_123");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/users/search");
  });

  it("updates an enterprise user", async () => {
    await updateEnterpriseUser("ent_123", 42, { active: false });
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/users/42", {
      method: "PATCH",
      body: JSON.stringify({ active: false }),
    });
  });

  it("sends enterprise admin invites", async () => {
    await inviteEnterpriseAdmin("ent_123", "invite@example.com");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/enterprises/ent_123/invites/enterprise-admin", {
      method: "POST",
      body: JSON.stringify({ email: "invite@example.com" }),
    });
  });

  it("sends current-enterprise admin invites", async () => {
    await inviteCurrentEnterpriseAdmin("invite@example.com");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/invites/enterprise-admin", {
      method: "POST",
      body: JSON.stringify({ email: "invite@example.com" }),
    });
  });

  it("sends global admin invites", async () => {
    await inviteGlobalAdmin("invite@example.com");
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/invites/global-admin", {
      method: "POST",
      body: JSON.stringify({ email: "invite@example.com" }),
    });
  });
});
