import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccess,
  getEnterpriseModuleAccessSelection,
  getEnterpriseModuleJoinCode,
  getModuleMeetingSettings,
  listEnterpriseFeatureFlags,
  searchEnterpriseUsers,
  getEnterpriseOverview,
  listEnterpriseModules,
  listEnterpriseModuleAccessUsers,
  listEnterpriseModuleStudents,
  removeEnterpriseUser,
  searchEnterpriseModuleAccessUsers,
  searchEnterpriseModules,
  updateEnterpriseUser,
  updateModuleMeetingSettings,
  rotateEnterpriseModuleJoinCode,
  updateEnterpriseFeatureFlag,
  updateEnterpriseModule,
  updateEnterpriseModuleStudents,
} from "./client";

describe("enterprise module api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("lists enterprise modules", async () => {
    await listEnterpriseModules();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules");
  });

  it("searches enterprise modules with query and pagination", async () => {
    await searchEnterpriseModules({ q: "software", page: 2, pageSize: 10 });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/search?q=software&page=2&pageSize=10");
  });

  it("searches enterprise modules with bare path when filters are empty", async () => {
    await searchEnterpriseModules();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/search");
  });

  it("fetches enterprise overview", async () => {
    await getEnterpriseOverview();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/overview");
  });

  it("lists enterprise feature flags", async () => {
    await listEnterpriseFeatureFlags();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/feature-flags");
  });

  it("searches enterprise users with query and pagination", async () => {
    await searchEnterpriseUsers({ q: "alice", page: 2, pageSize: 20 });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/users/search?q=alice&page=2&pageSize=20");
  });

  it("searches enterprise users with sort params", async () => {
    await searchEnterpriseUsers({ sortBy: "joinDate", sortDirection: "desc" });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/users/search?sortBy=joinDate&sortDirection=desc");
  });

  it("searches enterprise users with bare path when filters are empty", async () => {
    await searchEnterpriseUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/users/search");
  });

  it("updates an enterprise user", async () => {
    await updateEnterpriseUser(9, { role: "STAFF", active: true });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/users/9", {
      method: "PATCH",
      body: JSON.stringify({ role: "STAFF", active: true }),
    });
  });

  it("removes an enterprise user", async () => {
    await removeEnterpriseUser(9);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/users/9", {
      method: "DELETE",
    });
  });

  it("updates enterprise feature flag", async () => {
    await updateEnterpriseFeatureFlag("peer feedback/new", true);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/feature-flags/peer%20feedback%2Fnew", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
    });
  });

  it("creates an enterprise module", async () => {
    await createEnterpriseModule({
      name: "Software Engineering",
      leaderIds: [12],
      taIds: [18],
      studentIds: [31, 32],
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules", {
      method: "POST",
      body: JSON.stringify({
        name: "Software Engineering",
        leaderIds: [12],
        taIds: [18],
        studentIds: [31, 32],
      }),
    });
  });

  it("loads assignable users for module access", async () => {
    await listEnterpriseModuleAccessUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/access-users");
  });

  it("searches assignable users for module access", async () => {
    await searchEnterpriseModuleAccessUsers({ scope: "staff", q: "alice", page: 2, pageSize: 20 });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/access-users/search?scope=staff&q=alice&page=2&pageSize=20");
  });

  it("searches assignable users for module access with bare path when filters are empty", async () => {
    await searchEnterpriseModuleAccessUsers();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/access-users/search");
  });

  it("searches assignable users excluding module enrollments", async () => {
    await searchEnterpriseModuleAccessUsers({ scope: "students", excludeEnrolledInModule: 5 });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/enterprise-admin/modules/access-users/search?scope=students&excludeEnrolledInModule=5",
    );
  });

  it("searches assignable users with excludeOnModule lead_ta", async () => {
    await searchEnterpriseModuleAccessUsers({
      scope: "staff_and_students",
      excludeEnrolledInModule: 3,
      excludeOnModule: "lead_ta",
    });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/enterprise-admin/modules/access-users/search?scope=staff_and_students&excludeEnrolledInModule=3&excludeOnModule=lead_ta",
    );
  });

  it("searches assignable users with prioritiseUserIds", async () => {
    await searchEnterpriseModuleAccessUsers({ scope: "staff", prioritiseUserIds: [9, 1, 9] });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/enterprise-admin/modules/access-users/search?scope=staff&prioritiseUserIds=9%2C1%2C9",
    );
  });

  it("loads module access details", async () => {
    await getEnterpriseModuleAccess(22);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/22/access");
  });

  it("loads module access selection details", async () => {
    await getEnterpriseModuleAccessSelection(22);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/22/access-selection");
  });

  it("loads module join code details", async () => {
    await getEnterpriseModuleJoinCode(22);
    expect(apiFetchMock).toHaveBeenCalledWith("/module-join/modules/22/code");
  });

  it("rotates module join code", async () => {
    await rotateEnterpriseModuleJoinCode(22);
    expect(apiFetchMock).toHaveBeenCalledWith("/module-join/modules/22/code/rotate", {
      method: "POST",
    });
  });

  it("updates an enterprise module", async () => {
    await updateEnterpriseModule(9, {
      name: "SEGP",
      leaderIds: [1],
      taIds: [2],
      studentIds: [3, 4],
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/9", {
      method: "PUT",
      body: JSON.stringify({
        name: "SEGP",
        leaderIds: [1],
        taIds: [2],
        studentIds: [3, 4],
      }),
    });
  });

  it("deletes an enterprise module", async () => {
    await deleteEnterpriseModule(9);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/9", {
      method: "DELETE",
    });
  });

  it("lists module students", async () => {
    await listEnterpriseModuleStudents(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/12/students");
  });

  it("updates module students", async () => {
    await updateEnterpriseModuleStudents(12, { studentIds: [3, 4] });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/12/students", {
      method: "PUT",
      body: JSON.stringify({ studentIds: [3, 4] }),
    });
  });

  it("loads module meeting settings", async () => {
    await getModuleMeetingSettings(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/12/meeting-settings");
  });

  it("updates module meeting settings", async () => {
    await updateModuleMeetingSettings(12, { absenceThreshold: 3, minutesEditWindowDays: 5 });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules/12/meeting-settings", {
      method: "PUT",
      body: JSON.stringify({ absenceThreshold: 3, minutesEditWindowDays: 5 }),
    });
  });
});
