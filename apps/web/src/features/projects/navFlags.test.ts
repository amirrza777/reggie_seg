import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject, getProjectDeadline } from "./api/client";
import { getProjectNavFlags } from "./navFlags";
import type { ProjectNavFlagsConfig } from "./types";

vi.mock("./api/client", () => ({
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
}));

const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

function navState(enabled = true) {
  return {
    team: enabled,
    meetings: enabled,
    peer_assessment: enabled,
    peer_feedback: enabled,
    repos: enabled,
    trello: enabled,
    discussion: enabled,
    team_health: enabled,
  };
}

function navConfig(overrides: Partial<ProjectNavFlagsConfig> = {}): ProjectNavFlagsConfig {
  return {
    version: 1,
    active: navState(true),
    completed: navState(false),
    peerModes: {
      peer_assessment: "NATURAL",
      peer_feedback: "NATURAL",
    },
    ...overrides,
  };
}

describe("getProjectNavFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
  });

  it("forces peer tabs off for unauthenticated users", async () => {
    getProjectMock.mockResolvedValue({
      archivedAt: null,
      projectNavFlags: navConfig(),
    } as Awaited<ReturnType<typeof getProject>>);

    const result = await getProjectNavFlags(null, 22);

    expect(result.peer_assessment).toBe(false);
    expect(result.peer_feedback).toBe(false);
    expect(result.team).toBe(true);
  });

  it("uses completed flags for archived projects and skips deadline lookups in manual mode", async () => {
    getProjectMock.mockResolvedValue({
      archivedAt: "2026-03-01T00:00:00.000Z",
      projectNavFlags: navConfig({
        completed: {
          ...navState(false),
          team: true,
          peer_assessment: false,
          peer_feedback: true,
        },
        peerModes: {
          peer_assessment: "MANUAL",
          peer_feedback: "MANUAL",
        },
      }),
    } as Awaited<ReturnType<typeof getProject>>);

    const result = await getProjectNavFlags(9, 22);

    expect(result.team).toBe(true);
    expect(result.meetings).toBe(false);
    expect(result.peer_assessment).toBe(false);
    expect(result.peer_feedback).toBe(true);
    expect(getProjectDeadlineMock).not.toHaveBeenCalled();
  });

  it("applies natural peer mode dates from deadlines", async () => {
    getProjectMock.mockResolvedValue({
      archivedAt: null,
      projectNavFlags: navConfig({
        active: {
          ...navState(true),
          peer_assessment: false,
          peer_feedback: false,
        },
      }),
    } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentOpenDate: "2026-04-10T00:00:00.000Z",
      feedbackOpenDate: "2026-04-12T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const result = await getProjectNavFlags(7, 22);

    expect(result.peer_assessment).toBe(true);
    expect(result.peer_feedback).toBe(false);
    expect(getProjectDeadlineMock).toHaveBeenCalledWith(7, 22);
  });

  it("falls back to defaults when config is invalid and deadlines fail", async () => {
    getProjectMock.mockResolvedValue({
      archivedAt: null,
      projectNavFlags: { version: 2 },
    } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline lookup failed"));

    const result = await getProjectNavFlags(7, 22);

    expect(result.team).toBe(true);
    expect(result.trello).toBe(true);
    expect(result.peer_assessment).toBe(false);
    expect(result.peer_feedback).toBe(false);
  });

  it("returns defaults with peer tabs disabled for NaN project ids", async () => {
    const result = await getProjectNavFlags(7, Number.NaN);

    expect(getProjectMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      team: true,
      meetings: true,
      peer_assessment: false,
      peer_feedback: false,
      repos: true,
      trello: true,
      discussion: true,
      team_health: true,
    });
  });

  it("keeps manual assessment and natural feedback behavior when mixed", async () => {
    getProjectMock.mockResolvedValue({
      archivedAt: null,
      projectNavFlags: navConfig({
        active: {
          ...navState(false),
          peer_assessment: true,
          peer_feedback: true,
        },
        peerModes: {
          peer_assessment: "MANUAL",
          peer_feedback: "NATURAL",
        },
      }),
    } as Awaited<ReturnType<typeof getProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentOpenDate: null,
      feedbackOpenDate: "2026-04-10T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const result = await getProjectNavFlags(11, 22);

    expect(result.peer_assessment).toBe(true);
    expect(result.peer_feedback).toBe(true);
  });
});
