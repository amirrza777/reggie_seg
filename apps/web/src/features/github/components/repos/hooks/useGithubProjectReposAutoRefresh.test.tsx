import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseProjectGithubRepo } from "../../../api/client";
import { useGithubProjectReposAutoRefresh } from "./useGithubProjectReposAutoRefresh";

vi.mock("../../../api/client", () => ({
  analyseProjectGithubRepo: vi.fn(),
}));

const analyseProjectGithubRepoMock = vi.mocked(analyseProjectGithubRepo);

function makeLink(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    projectId: 1,
    githubRepositoryId: 10,
    linkedByUserId: 2,
    isActive: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: null,
    nextSyncAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repository: {
      id: 10,
      githubRepoId: 999,
      ownerLogin: "team",
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      defaultBranch: "main",
      pushedAt: null,
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    ...overrides,
  } as any;
}

describe("useGithubProjectReposAutoRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-04-14T12:00:00.000Z").getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-refreshes stale snapshots and emits a success notice once per day", async () => {
    analyseProjectGithubRepoMock.mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue(undefined);
    const setBusy = vi.fn();
    const setError = vi.fn();
    const setInfo = vi.fn();

    renderHook(() =>
      useGithubProjectReposAutoRefresh({
        enabled: true,
        links: [makeLink()],
        latestSnapshotByLinkId: {
          101: { analysedAt: "2026-04-12T10:00:00.000Z" } as any,
        },
        busy: false,
        linking: false,
        removingLinkId: null,
        load,
        setBusy,
        setError,
        setInfo,
      }),
    );

    await waitFor(() => {
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(101);
    });
    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });

    expect(setBusy).toHaveBeenCalledWith(true);
    expect(setBusy).toHaveBeenCalledWith(false);
    expect(setError).toHaveBeenCalledWith(null);
    expect(setInfo).toHaveBeenCalledWith("Repository snapshot auto-refreshed (24h schedule).");
  });

  it("skips refresh when disabled, busy, linking, removing, or link is inactive", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const setBusy = vi.fn();
    const setError = vi.fn();
    const setInfo = vi.fn();

    renderHook(() =>
      useGithubProjectReposAutoRefresh({
        enabled: false,
        links: [makeLink({ isActive: false }), makeLink({ id: 202, autoSyncEnabled: false })],
        latestSnapshotByLinkId: {
          101: { analysedAt: null } as any,
          202: { analysedAt: null } as any,
        },
        busy: true,
        linking: true,
        removingLinkId: 5,
        load,
        setBusy,
        setError,
        setInfo,
      }),
    );

    await Promise.resolve();
    expect(analyseProjectGithubRepoMock).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("surfaces refresh errors with fallback messaging", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const setBusy = vi.fn();
    const setError = vi.fn();
    const setInfo = vi.fn();
    analyseProjectGithubRepoMock.mockRejectedValueOnce("failed");

    renderHook(() =>
      useGithubProjectReposAutoRefresh({
        enabled: true,
        links: [makeLink()],
        latestSnapshotByLinkId: {
          101: { analysedAt: null } as any,
        },
        busy: false,
        linking: false,
        removingLinkId: null,
        load,
        setBusy,
        setError,
        setInfo,
      }),
    );

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith("Failed to auto-refresh repository snapshot.");
    });
    expect(setBusy).toHaveBeenCalledWith(false);
    expect(load).not.toHaveBeenCalled();
    expect(setInfo).not.toHaveBeenCalled();
  });
});
