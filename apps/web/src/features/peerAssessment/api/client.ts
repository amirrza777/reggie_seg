import { apiFetch } from "@/shared/api/http";
import { PeerAssessmentData, TeamAllocation } from "../types";

export async function getTeammates(userId: number, teamId: number): Promise<TeamAllocation[]> {
  return apiFetch(`/peer-assessments/teams/${teamId}/teammates?userId=${userId}`);
}

export async function createPeerAssessment(data: PeerAssessmentData) {
  return apiFetch("/peer-assessments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPeerAssessment(
  moduleId: number,
  projectId: number | undefined,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  const params = new URLSearchParams({
    moduleId: String(moduleId),
    teamId: String(teamId),
    reviewerId: String(reviewerId),
    revieweeId: String(revieweeId),
  });

  if (projectId !== undefined) {
    params.append("projectId", String(projectId));
  }

  return apiFetch(`/peer-assessments?${params.toString()}`);
}

export async function updatePeerAssessment(assessmentId: number, answersJson: Record<string, any>) {
  return apiFetch(`/peer-assessments/${assessmentId}`, {
    method: "PUT",
    body: JSON.stringify({ answersJson }),
  });
}
