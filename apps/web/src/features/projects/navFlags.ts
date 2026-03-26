import { getProject, getProjectDeadline } from "./api/client";
import type { ProjectNavFlagsConfig, ProjectNavFlagsState, ProjectNavPeerModes } from "./types";

function isOpenDate(value: string | null | undefined) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return timestamp <= Date.now();
}

const DEFAULT_PROJECT_NAV_FLAGS: ProjectNavFlagsState = {
  team: true,
  meetings: true,
  peer_assessment: true,
  peer_feedback: true,
  repos: true,
  trello: true,
  discussion: true,
  team_health: true,
};

const DEFAULT_PROJECT_NAV_PEER_MODES: ProjectNavPeerModes = {
  peer_assessment: "NATURAL",
  peer_feedback: "NATURAL",
};

function cloneDefaultProjectNavFlags() {
  return { ...DEFAULT_PROJECT_NAV_FLAGS };
}

function cloneDefaultProjectNavPeerModes() {
  return { ...DEFAULT_PROJECT_NAV_PEER_MODES };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProjectNavState(raw: unknown): ProjectNavFlagsState | null {
  if (!isRecord(raw)) return null;
  const state = cloneDefaultProjectNavFlags();
  for (const key of Object.keys(DEFAULT_PROJECT_NAV_FLAGS) as Array<keyof ProjectNavFlagsState>) {
    if (typeof raw[key] !== "boolean") return null;
    state[key] = raw[key] as boolean;
  }
  return state;
}

function parseProjectNavFlagsConfig(raw: unknown): ProjectNavFlagsConfig | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;

  const active = parseProjectNavState(raw.active);
  const completed = parseProjectNavState(raw.completed);
  const peerModes = isRecord(raw.peerModes)
    ? raw.peerModes
    : null;
  if (!active || !completed) return null;

  let normalizedPeerModes = cloneDefaultProjectNavPeerModes();
  if (peerModes) {
    const assessmentMode = peerModes.peer_assessment;
    const feedbackMode = peerModes.peer_feedback;
    if (
      (assessmentMode !== "NATURAL" && assessmentMode !== "MANUAL") ||
      (feedbackMode !== "NATURAL" && feedbackMode !== "MANUAL")
    ) {
      return null;
    }
    normalizedPeerModes = {
      peer_assessment: assessmentMode,
      peer_feedback: feedbackMode,
    };
  }

  return {
    version: 1,
    active,
    completed,
    peerModes: normalizedPeerModes,
  };
}

export async function getProjectNavFlags(userId: number | null | undefined, projectId: number) {
  let flags = cloneDefaultProjectNavFlags();
  let peerModes = cloneDefaultProjectNavPeerModes();

  if (!Number.isNaN(projectId)) {
    try {
      const project = await getProject(String(projectId));
      const config = parseProjectNavFlagsConfig(project?.projectNavFlags);
      if (config) {
        flags = project.archivedAt ? config.completed : config.active;
        peerModes = config.peerModes;
      }
    } catch {
      flags = cloneDefaultProjectNavFlags();
      peerModes = cloneDefaultProjectNavPeerModes();
    }
  }

  if (!userId || Number.isNaN(projectId)) {
    return {
      ...flags,
      peer_assessment: false,
      peer_feedback: false,
    };
  }

  let assessmentOpenDate: string | null = null;
  let feedbackOpenDate: string | null = null;

  if (
    peerModes.peer_assessment === "NATURAL" ||
    peerModes.peer_feedback === "NATURAL"
  ) {
    try {
      const deadline = await getProjectDeadline(userId, projectId);
      assessmentOpenDate = deadline.assessmentOpenDate;
      feedbackOpenDate = deadline.feedbackOpenDate;
    } catch {
      assessmentOpenDate = null;
      feedbackOpenDate = null;
    }
  }

  return {
    ...flags,
    peer_assessment:
      peerModes.peer_assessment === "MANUAL"
        ? flags.peer_assessment
        : isOpenDate(assessmentOpenDate),
    peer_feedback:
      peerModes.peer_feedback === "MANUAL"
        ? flags.peer_feedback
        : isOpenDate(feedbackOpenDate),
  };
}
