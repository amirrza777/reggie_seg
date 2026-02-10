import { apiFetch } from "@/shared/api/http";
import { PeerAssessmentData, TeamAllocation } from "../types";
import { mapApiQuestionsToQuestions , mapApiAssessmentToPeerAssessment } from "./mapper";

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
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  const params = new URLSearchParams({
    projectId: String(projectId),
    teamId: String(teamId),
    reviewerId: String(reviewerId),
    revieweeId: String(revieweeId),
  });

  return apiFetch(`/peer-assessments?${params.toString()}`);
}

export async function updatePeerAssessment(assessmentId: number, answersJson: Record<string, any>) {
  return apiFetch(`/peer-assessments/${assessmentId}`, {
    method: "PUT",
    body: JSON.stringify({ answersJson }),
  });
}

export async function getPeerAssessmentData(
  projectId: number,
  teamId: number,
  reviewerId: number,
  revieweeId: number
) {
  const raw = await getPeerAssessment(projectId, teamId, reviewerId, revieweeId);
  return mapApiAssessmentToPeerAssessment(raw);
}

export async function getQuestionsForProject(projectId: string) {
  const raw = await apiFetch(`/peer-assessments/projects/${projectId}/questions`);
  const questions = mapApiQuestionsToQuestions(raw);
  if(questions.length > 0) {
    return mapApiQuestionsToQuestions(raw);
  }
  else {    
    return [];
  }
}

export async function getPeerAssessmentById(assessmentId: number) {
  const raw = await apiFetch(`/peer-assessments/${assessmentId}`);
  return mapApiAssessmentToPeerAssessment(raw);
}