import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  getAdminSummary,
  listAuditLogs,
  listFeatureFlags,
  listUsers,
  updateFeatureFlag,
  updateUser,
  updateUserRole,
} from "./client";

describe("admin api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ ok: true });
  });

  it("lists feature flags", async () => {
    await listFeatureFlags();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/feature-flags");
  });

  it("lists users", async () => {
    await listUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/users");
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

  it("encodes feature-flag key during update", async () => {
    await updateFeatureFlag("peer feedback/new", true);
    expect(apiFetchMock).toHaveBeenCalledWith("/admin/feature-flags/peer%20feedback%2Fnew", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
    });
  });
});
