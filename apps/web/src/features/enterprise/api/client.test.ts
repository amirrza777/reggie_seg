import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createEnterpriseModule,
  getEnterpriseOverview,
  listEnterpriseModules,
  listEnterpriseModuleStudents,
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

  it("fetches enterprise overview", async () => {
    await getEnterpriseOverview();
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/overview");
  });

  it("creates an enterprise module", async () => {
    await createEnterpriseModule({ name: "Software Engineering" });
    expect(apiFetchMock).toHaveBeenCalledWith("/enterprise-admin/modules", {
      method: "POST",
      body: JSON.stringify({ name: "Software Engineering" }),
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
});
