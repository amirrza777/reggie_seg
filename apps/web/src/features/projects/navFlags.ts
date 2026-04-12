import { getProject, getProjectDeadline, getProjectMarking } from "./api/client";
import {
  resolveProjectMarkValue,
  resolveProjectWorkflowState,
} from "@/features/projects/lib/projectWorkflowState";
import type { ProjectDeadline, ProjectNavFlagsConfig, ProjectNavFlagsState, ProjectNavPeerModes } from "./types";

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
  let cachedDeadline: ProjectDeadline | null = null;
  let deadlineLoaded = false;

  const loadDeadline = async () => {
    if (!userId || Number.isNaN(projectId)) {
      return null;
    }
    if (deadlineLoaded) {
      return cachedDeadline;
    }
    deadlineLoaded = true;
    try {
      cachedDeadline = await getProjectDeadline(userId, projectId);
    } catch {
      cachedDeadline = null;
    }
    return cachedDeadline;
  };

  if (!Number.isNaN(projectId)) {
    try {
      const project = await getProject(String(projectId));
      const config = parseProjectNavFlagsConfig(project?.projectNavFlags);
      if (config) {
        const projectArchived = Boolean(project.archivedAt || project.moduleArchivedAt);
        const markValue =
          !projectArchived && userId
            ? await (async () => {
                try {
                  const marking = await getProjectMarking(userId, projectId);
                  return resolveProjectMarkValue(marking);
                } catch {
                  return null;
                }
              })()
            : null;
        const state = resolveProjectWorkflowState({
          project,
          deadline: projectArchived ? null : await loadDeadline(),
          markValue,
        });
        flags = state === "completed_unmarked" || state === "completed_marked" ? config.completed : config.active;
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
    const deadline = await loadDeadline();
    if (deadline) {
      assessmentOpenDate = deadline.assessmentOpenDate;
      feedbackOpenDate = deadline.feedbackOpenDate;
    } else {
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
