import { getProjectDeadline } from "./api/client";
import { getFeatureFlagMap } from "@/shared/featureFlags";

function isOpenDate(value: string | null | undefined) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return timestamp <= Date.now();
}

function isFeatureEnabled(flags: Record<string, boolean>, key: string) {
  if (!Object.prototype.hasOwnProperty.call(flags, key)) return true;
  return flags[key] === true;
}

export async function getProjectNavFlags(userId: number | null | undefined, projectId: number) {
  const flags = await getFeatureFlagMap();
  if (!userId || Number.isNaN(projectId)) {
    return {
      ...flags,
      peer_assessment: false,
      peer_feedback: false,
    };
  }

  let assessmentOpenDate: string | null = null;
  let feedbackOpenDate: string | null = null;

  try {
    const deadline = await getProjectDeadline(userId, projectId);
    assessmentOpenDate = deadline.assessmentOpenDate;
    feedbackOpenDate = deadline.feedbackOpenDate;
  } catch {
    assessmentOpenDate = null;
    feedbackOpenDate = null;
  }

  return {
    ...flags,
    peer_assessment: isOpenDate(assessmentOpenDate),
    peer_feedback: isFeatureEnabled(flags, "peer_feedback") && isOpenDate(feedbackOpenDate),
  };
}
