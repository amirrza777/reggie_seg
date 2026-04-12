import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArchivableModule, ArchivableProject } from "../types";
import { useArchiveManager } from "./useArchiveManager";

const getArchiveModules = vi.fn();
const getArchiveProjects = vi.fn();
const archiveItem = vi.fn();
const unarchiveItem = vi.fn();

vi.mock("../api/client", () => ({
  getArchiveModules: (...a: unknown[]) => getArchiveModules(...a),
  getArchiveProjects: (...a: unknown[]) => getArchiveProjects(...a),
  archiveItem: (...a: unknown[]) => archiveItem(...a),
  unarchiveItem: (...a: unknown[]) => unarchiveItem(...a),
}));

const sampleModule: ArchivableModule = {
  id: 1,
  name: "M",
  archivedAt: null,
  _count: { projects: 0 },
};

const sampleProject: ArchivableProject = {
  id: 2,
  name: "P",
  archivedAt: null,
  module: { name: "M", archivedAt: null },
  _count: { teams: 0 },
};

describe("useArchiveManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getArchiveModules.mockResolvedValue([sampleModule]);
    getArchiveProjects.mockResolvedValue([sampleProject]);
    archiveItem.mockResolvedValue(undefined);
    unarchiveItem.mockResolvedValue(undefined);
  });

  it("loads modules and projects then clears fetching", async () => {
    const { result } = renderHook(() => useArchiveManager());
    expect(result.current.fetching).toBe(true);

    await waitFor(() => expect(result.current.fetching).toBe(false));
    expect(result.current.modules).toEqual([sampleModule]);
    expect(result.current.projects).toEqual([sampleProject]);
    expect(getArchiveModules).toHaveBeenCalled();
    expect(getArchiveProjects).toHaveBeenCalled();
  });

  it("archives when toggle is called with isArchived false", async () => {
    const { result } = renderHook(() => useArchiveManager());
    await waitFor(() => expect(result.current.fetching).toBe(false));

    await act(async () => {
      await result.current.toggle("modules", 1, false);
    });

    expect(archiveItem).toHaveBeenCalledWith("modules", 1);
    expect(unarchiveItem).not.toHaveBeenCalled();
    expect(getArchiveModules.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("unarchives when toggle is called with isArchived true", async () => {
    const { result } = renderHook(() => useArchiveManager());
    await waitFor(() => expect(result.current.fetching).toBe(false));

    await act(async () => {
      await result.current.toggle("projects", 2, true);
    });

    expect(unarchiveItem).toHaveBeenCalledWith("projects", 2);
    expect(archiveItem).not.toHaveBeenCalled();
  });

  it("clears loading when archive fails", async () => {
    archiveItem.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useArchiveManager());
    await waitFor(() => expect(result.current.fetching).toBe(false));

    await act(async () => {
      await result.current.toggle("modules", 1, false);
    });

    expect(result.current.loading).toBe(null);
  });
});
