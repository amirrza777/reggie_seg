import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchProjectNavFlagsConfigForStaff,
  getDefaultProjectNavFlagsConfig,
  parseProjectNavFlagsConfig,
  updateProjectNavFlagsConfigForStaff,
} from "./service.js";
import * as repo from "../repo.js";

vi.mock("../repo.js", () => ({
  getStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectNavFlagsConfig: vi.fn(),
}));

describe("projects/nav-flags service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parseProjectNavFlagsConfig validates shape and getDefaultProjectNavFlagsConfig returns defaults", async () => {
    const defaults = getDefaultProjectNavFlagsConfig();
    expect(defaults.version).toBe(1);
    expect(defaults.active.peer_assessment).toBe(true);
    expect(defaults.completed.team_health).toBe(true);
    expect(defaults.peerModes.peer_assessment).toBe("NATURAL");
    expect(defaults.peerModes.peer_feedback).toBe("NATURAL");

    expect(parseProjectNavFlagsConfig(null)).toBeNull();
    expect(parseProjectNavFlagsConfig({ version: 2, active: {}, completed: {} })).toBeNull();
    expect(
      parseProjectNavFlagsConfig({
        version: 1,
        active: { team: true },
        completed: {},
      }),
    ).toBeNull();

    expect(
      parseProjectNavFlagsConfig({
        version: 1,
        active: {
          team: true,
          meetings: true,
          peer_assessment: true,
          peer_feedback: true,
          repos: true,
          trello: true,
          discussion: true,
          team_health: true,
        },
        completed: {
          team: true,
          meetings: true,
          peer_assessment: false,
          peer_feedback: false,
          repos: true,
          trello: true,
          discussion: true,
          team_health: true,
        },
      }),
    ).toEqual({
      version: 1,
      active: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: true,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      completed: {
        team: true,
        meetings: true,
        peer_assessment: false,
        peer_feedback: false,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      peerModes: {
        peer_assessment: "NATURAL",
        peer_feedback: "NATURAL",
      },
    });
  });

  it("fetchProjectNavFlagsConfigForStaff returns default config when missing/invalid", async () => {
    (repo.getStaffProjectNavFlagsConfig as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      projectNavFlags: null,
      deadline: null,
    });

    const result = await fetchProjectNavFlagsConfigForStaff(9, 3);
    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        name: "Project A",
        hasPersistedProjectNavFlags: false,
        projectNavFlags: expect.objectContaining({ version: 1 }),
        deadlineWindow: {
          assessmentOpenDate: null,
          feedbackOpenDate: null,
        },
      }),
    );
  });

  it("updateProjectNavFlagsConfigForStaff validates config and delegates update", async () => {
    await expect(updateProjectNavFlagsConfigForStaff(9, 3, null)).rejects.toMatchObject({
      code: "INVALID_PROJECT_NAV_FLAGS_CONFIG",
    });

    const config = {
      version: 1,
      active: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: true,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      completed: {
        team: true,
        meetings: true,
        peer_assessment: false,
        peer_feedback: false,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      peerModes: {
        peer_assessment: "MANUAL" as const,
        peer_feedback: "NATURAL" as const,
      },
    };

    (repo.updateStaffProjectNavFlagsConfig as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      projectNavFlags: config,
      deadline: {
        assessmentOpenDate: new Date("2026-03-30T12:00:00.000Z"),
        feedbackOpenDate: new Date("2026-04-03T12:00:00.000Z"),
      },
    });

    await expect(updateProjectNavFlagsConfigForStaff(9, 3, config)).resolves.toEqual({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: config,
      deadlineWindow: {
        assessmentOpenDate: new Date("2026-03-30T12:00:00.000Z"),
        feedbackOpenDate: new Date("2026-04-03T12:00:00.000Z"),
      },
    });

    expect(repo.updateStaffProjectNavFlagsConfig).toHaveBeenCalledWith(9, 3, config);
  });
});
