import {
  getStaffProjectNavFlagsConfig as getStaffProjectNavFlagsConfigInDb,
  updateStaffProjectNavFlagsConfig as updateStaffProjectNavFlagsConfigInDb,
} from "../repo.js";

const PROJECT_NAV_FLAG_KEYS = [
  "team",
  "meetings",
  "peer_assessment",
  "peer_feedback",
  "repos",
  "trello",
  "discussion",
  "team_health",
] as const;

export type ProjectNavFlagKey = (typeof PROJECT_NAV_FLAG_KEYS)[number];

export type ProjectNavFlagsState = Record<ProjectNavFlagKey, boolean>;

export type ProjectNavPeerMode = "NATURAL" | "MANUAL";

export type ProjectNavPeerModes = {
  peer_assessment: ProjectNavPeerMode;
  peer_feedback: ProjectNavPeerMode;
};

export type ProjectNavFlagsConfig = {
  version: 1;
  active: ProjectNavFlagsState;
  completed: ProjectNavFlagsState;
  peerModes: ProjectNavPeerModes;
};

const DEFAULT_PROJECT_NAV_FLAGS_STATE: ProjectNavFlagsState = {
  team: true,
  meetings: true,
  peer_assessment: true,
  peer_feedback: true,
  repos: true,
  trello: true,
  discussion: true,
  team_health: true,
};

const DEFAULT_PROJECT_NAV_FLAGS_CONFIG: ProjectNavFlagsConfig = {
  version: 1,
  active: { ...DEFAULT_PROJECT_NAV_FLAGS_STATE },
  completed: { ...DEFAULT_PROJECT_NAV_FLAGS_STATE },
  peerModes: {
    peer_assessment: "NATURAL",
    peer_feedback: "NATURAL",
  },
};

function toProjectNavFlagsConfigClone(config: ProjectNavFlagsConfig): ProjectNavFlagsConfig {
  return {
    version: 1,
    active: { ...config.active },
    completed: { ...config.completed },
    peerModes: { ...config.peerModes },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getDefaultProjectNavFlagsConfig(): ProjectNavFlagsConfig {
  return toProjectNavFlagsConfigClone(DEFAULT_PROJECT_NAV_FLAGS_CONFIG);
}

function parseProjectNavFlagsState(raw: unknown): ProjectNavFlagsState | null {
  if (!isRecord(raw)) return null;

  const state = { ...DEFAULT_PROJECT_NAV_FLAGS_STATE };
  for (const key of PROJECT_NAV_FLAG_KEYS) {
    const value = raw[key];
    if (typeof value !== "boolean") {
      return null;
    }
    state[key] = value;
  }
  return state;
}

function parseProjectNavPeerModes(raw: unknown): ProjectNavPeerModes | null {
  if (!isRecord(raw)) return null;
  const assessmentMode = raw.peer_assessment;
  const feedbackMode = raw.peer_feedback;
  if (
    (assessmentMode !== "NATURAL" && assessmentMode !== "MANUAL") ||
    (feedbackMode !== "NATURAL" && feedbackMode !== "MANUAL")
  ) {
    return null;
  }
  return {
    peer_assessment: assessmentMode,
    peer_feedback: feedbackMode,
  };
}

export function parseProjectNavFlagsConfig(raw: unknown): ProjectNavFlagsConfig | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;

  const active = parseProjectNavFlagsState(raw.active);
  const completed = parseProjectNavFlagsState(raw.completed);
  const peerModes = raw.peerModes === undefined
    ? { ...DEFAULT_PROJECT_NAV_FLAGS_CONFIG.peerModes }
    : parseProjectNavPeerModes(raw.peerModes);
  if (!active || !completed) return null;
  if (!peerModes) return null;

  return {
    version: 1,
    active,
    completed,
    peerModes,
  };
}

export function normalizeProjectNavFlagsConfig(raw: unknown): ProjectNavFlagsConfig {
  const parsed = parseProjectNavFlagsConfig(raw);
  if (!parsed) return getDefaultProjectNavFlagsConfig();
  return parsed;
}

export async function fetchProjectNavFlagsConfigForStaff(actorUserId: number, projectId: number) {
  const result = await getStaffProjectNavFlagsConfigInDb(actorUserId, projectId);
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    hasPersistedProjectNavFlags: result.projectNavFlags !== null,
    projectNavFlags: normalizeProjectNavFlagsConfig(result.projectNavFlags),
    deadlineWindow: {
      assessmentOpenDate: result.deadline?.assessmentOpenDate ?? null,
      feedbackOpenDate: result.deadline?.feedbackOpenDate ?? null,
    },
  };
}

export async function updateProjectNavFlagsConfigForStaff(
  actorUserId: number,
  projectId: number,
  rawProjectNavFlags: unknown,
) {
  const parsedProjectNavFlags = parseProjectNavFlagsConfig(rawProjectNavFlags);
  if (!parsedProjectNavFlags) {
    throw {
      code: "INVALID_PROJECT_NAV_FLAGS_CONFIG",
      message: "projectNavFlags must be an object with version=1 and valid active/completed flag maps",
    };
  }

  const updated = await updateStaffProjectNavFlagsConfigInDb(actorUserId, projectId, parsedProjectNavFlags);
  return {
    id: updated.id,
    name: updated.name,
    hasPersistedProjectNavFlags: updated.projectNavFlags !== null,
    projectNavFlags: normalizeProjectNavFlagsConfig(updated.projectNavFlags),
    deadlineWindow: {
      assessmentOpenDate: updated.deadline?.assessmentOpenDate ?? null,
      feedbackOpenDate: updated.deadline?.feedbackOpenDate ?? null,
    },
  };
}
