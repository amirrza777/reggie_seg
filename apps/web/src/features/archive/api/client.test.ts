import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  archiveItem,
  getArchiveModules,
  getArchiveProjects,
  unarchiveItem,
} from "./client";

describe("archive api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches archive modules", async () => {
    const payload = [{ id: 1, name: "M", archivedAt: null, _count: { projects: 0 } }];
    apiFetchMock.mockResolvedValue(payload);
    const result = await getArchiveModules();
    expect(apiFetchMock).toHaveBeenCalledWith("/archive/modules");
    expect(result).toEqual(payload);
  });

  it("fetches archive projects", async () => {
    apiFetchMock.mockResolvedValue([]);
    await getArchiveProjects();
    expect(apiFetchMock).toHaveBeenCalledWith("/archive/projects");
  });

  it("archives an entity", async () => {
    await archiveItem("modules", 3);
    expect(apiFetchMock).toHaveBeenCalledWith("/archive/modules/3/archive", { method: "PATCH" });
  });

  it("unarchives an entity", async () => {
    await unarchiveItem("projects", 9);
    expect(apiFetchMock).toHaveBeenCalledWith("/archive/projects/9/unarchive", { method: "PATCH" });
  });
});
