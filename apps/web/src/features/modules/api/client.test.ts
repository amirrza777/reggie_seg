import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { getModuleStudentProjectMatrix, listModules } from "./client";

describe("modules api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches module list", async () => {
    const payload = [{ id: "mod-1", title: "Foundations" }];
    apiFetchMock.mockResolvedValue(payload);

    const result = await listModules(42);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42", { cache: "no-store" });
    expect(result).toEqual(payload);
  });

  it("fetches staff-scoped module list", async () => {
    await listModules(42, { scope: "staff" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&scope=staff", {
      cache: "no-store",
    });
  });

  it("fetches compact module list", async () => {
    await listModules(42, { compact: true });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&compact=1", {
      cache: "no-store",
    });
  });

  it("fetches student project matrix", async () => {
    apiFetchMock.mockResolvedValue({ projects: [], students: [] });
    await getModuleStudentProjectMatrix(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/12/student-project-matrix", {
      cache: "no-store",
    });
  });
});
