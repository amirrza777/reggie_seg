import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { getModuleStaffList, getModuleStudentProjectMatrix, joinModuleByCode, listModules } from "./client";

describe("modules api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches module list", async () => {
    const payload = [{ id: "mod-1", title: "Foundations" }];
    apiFetchMock.mockResolvedValue(payload);

    const result = await listModules(42);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42");
    expect(result).toEqual(payload);
  });

  it("fetches staff-scoped module list", async () => {
    await listModules(42, { scope: "staff" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&scope=staff");
  });

  it("fetches compact module list", async () => {
    await listModules(42, { compact: true });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&compact=1");
  });

  it("trims and forwards query for module list", async () => {
    await listModules(42, { query: "  segp  " });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&q=segp");
  });

  it("joins a module by code", async () => {
    await joinModuleByCode({ code: "ABCD2345" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABCD2345" }),
    });
  });

  it("fetches module staff list", async () => {
    const payload = { members: [] };
    apiFetchMock.mockResolvedValue(payload);
    const result = await getModuleStaffList(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/12/staff");
    expect(result).toEqual(payload);
  });

  it("encodes module id in staff list path", async () => {
    apiFetchMock.mockResolvedValue({ members: [] });
    await getModuleStaffList("99");
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/99/staff");
  });

  it("fetches student project matrix", async () => {
    const payload = { projects: [], students: [] };
    apiFetchMock.mockResolvedValue(payload);
    const result = await getModuleStudentProjectMatrix(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/5/student-project-matrix");
    expect(result).toEqual(payload);
  });
});
