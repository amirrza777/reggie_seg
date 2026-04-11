"use client";

import { apiFetch } from "@/shared/api/http";
import type {
  AllocationDraftApproved,
  AllocationDraftDeleted,
  AllocationDraftUpdated,
  AllocationDraftsWorkspace,
  CustomAllocationApplied,
  CustomAllocationCoverage,
  CustomAllocationCriteriaStrategy,
  CustomAllocationNonRespondentStrategy,
  CustomAllocationPreview,
  CustomAllocationQuestionnaireListing,
  ManualAllocationApplied,
  ManualAllocationWorkspace,
  RandomAllocationApplied,
  RandomAllocationPreview,
  TeamInvite,
  TeamInviteEligibleStudent,
} from "./teamAllocation.types";

export async function sendTeamInvite(
  teamId: number,
  inviteeEmail: string,
  message?: string,
): Promise<{ ok: boolean; inviteId: string }>;
export async function sendTeamInvite(
  teamId: number,
  _inviterId: number,
  inviteeEmail: string,
  message?: string,
): Promise<{ ok: boolean; inviteId: string }>;
export async function sendTeamInvite(
  teamId: number,
  inviteeEmailOrInviterId: string | number,
  inviteeEmailOrMessage?: string,
  maybeMessage?: string,
) {
  const inviteeEmail =
    typeof inviteeEmailOrInviterId === "number" ? inviteeEmailOrMessage ?? "" : inviteeEmailOrInviterId;
  const message = typeof inviteeEmailOrInviterId === "number" ? maybeMessage : inviteeEmailOrMessage;

  return apiFetch<{ ok: boolean; inviteId: string }>("/team-allocation/invites", {
    method: "POST",
    body: JSON.stringify({ teamId, inviteeEmail, message }),
  });
}

export async function cancelTeamInvite(inviteId: string) {
  return apiFetch<{ ok: boolean }>(`/team-allocation/invites/${inviteId}/cancel`, {
    method: "PATCH",
  });
}

export async function getTeamInvites(teamId: number) {
  return apiFetch<TeamInvite[]>(`/team-allocation/teams/${teamId}/invites`);
}

export async function getTeamInviteEligibleStudents(teamId: number) {
  return apiFetch<TeamInviteEligibleStudent[]>(`/team-allocation/teams/${teamId}/invite-eligible-students`);
}

export async function getReceivedInvites() {
  return apiFetch<TeamInvite[]>("/team-allocation/invites/received");
}

export async function acceptInvite(inviteId: string) {
  return apiFetch<{ ok: boolean }>(`/team-allocation/invites/${inviteId}/accept`, {
    method: "PATCH",
  });
}

export async function declineInvite(inviteId: string) {
  return apiFetch<{ ok: boolean }>(`/team-allocation/invites/${inviteId}/decline`, {
    method: "PATCH",
  });
}

export async function createTeamForProject(projectId: number, teamName: string) {
  return apiFetch<{ id: number; teamName: string; projectId: number }>("/team-allocation/teams/for-project", {
    method: "POST",
    body: JSON.stringify({ projectId, teamName }),
  });
}

export async function getRandomAllocationPreview(
  projectId: number,
  teamCount: number,
  options: { minTeamSize?: number; maxTeamSize?: number } = {},
) {
  const params = new URLSearchParams({ teamCount: String(teamCount) });
  if (options.minTeamSize !== undefined) {
    params.set("minTeamSize", String(options.minTeamSize));
  }
  if (options.maxTeamSize !== undefined) {
    params.set("maxTeamSize", String(options.maxTeamSize));
  }

  return apiFetch<RandomAllocationPreview>(`/team-allocation/projects/${projectId}/random-preview?${params.toString()}`, {
    cache: "no-store",
  });
}

export async function applyRandomAllocation(
  projectId: number,
  teamCount: number,
  teamNames?: string[],
  options: { minTeamSize?: number; maxTeamSize?: number } = {},
) {
  return apiFetch<RandomAllocationApplied>(`/team-allocation/projects/${projectId}/random-allocate`, {
    method: "POST",
    body: JSON.stringify({
      teamCount,
      ...(teamNames !== undefined ? { teamNames } : {}),
      ...(options.minTeamSize !== undefined ? { minTeamSize: options.minTeamSize } : {}),
      ...(options.maxTeamSize !== undefined ? { maxTeamSize: options.maxTeamSize } : {}),
    }),
  });
}

export async function getManualAllocationWorkspace(projectId: number, query?: string) {
  const params = new URLSearchParams();
  const trimmedQuery = typeof query === "string" ? query.trim() : "";
  if (trimmedQuery.length > 0) {
    params.set("q", trimmedQuery);
  }
  const querySuffix = params.toString().length > 0 ? `?${params.toString()}` : "";

  return apiFetch<ManualAllocationWorkspace>(`/team-allocation/projects/${projectId}/manual-workspace${querySuffix}`, {
    cache: "no-store",
  });
}

export async function applyManualAllocation(projectId: number, teamName: string, studentIds: number[]) {
  return apiFetch<ManualAllocationApplied>(`/team-allocation/projects/${projectId}/manual-allocate`, {
    method: "POST",
    body: JSON.stringify({ teamName, studentIds }),
  });
}

export async function getAllocationDrafts(projectId: number) {
  return apiFetch<AllocationDraftsWorkspace>(`/team-allocation/projects/${projectId}/allocation-drafts`, {
    cache: "no-store",
  });
}

export async function updateAllocationDraft(
  projectId: number,
  teamId: number,
  payload: { teamName?: string; studentIds?: number[]; expectedUpdatedAt?: string },
) {
  return apiFetch<AllocationDraftUpdated>(`/team-allocation/projects/${projectId}/allocation-drafts/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function approveAllocationDraft(
  projectId: number,
  teamId: number,
  payload?: { expectedUpdatedAt?: string },
) {
  return apiFetch<AllocationDraftApproved>(`/team-allocation/projects/${projectId}/allocation-drafts/${teamId}/approve`, {
    method: "PATCH",
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
}

export async function deleteAllocationDraft(
  projectId: number,
  teamId: number,
  payload?: { expectedUpdatedAt?: string },
) {
  return apiFetch<AllocationDraftDeleted>(`/team-allocation/projects/${projectId}/allocation-drafts/${teamId}`, {
    method: "DELETE",
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
}

export async function getCustomAllocationQuestionnaires(projectId: number) {
  return apiFetch<CustomAllocationQuestionnaireListing>(`/team-allocation/projects/${projectId}/custom-questionnaires`, {
    cache: "no-store",
  });
}

export async function getCustomAllocationCoverage(projectId: number, questionnaireTemplateId: number) {
  const params = new URLSearchParams({ questionnaireTemplateId: String(questionnaireTemplateId) });
  return apiFetch<CustomAllocationCoverage>(`/team-allocation/projects/${projectId}/custom-coverage?${params.toString()}`, {
    cache: "no-store",
  });
}

export async function previewCustomAllocation(
  projectId: number,
  payload: {
    questionnaireTemplateId: number;
    teamCount: number;
    minTeamSize?: number;
    maxTeamSize?: number;
    nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
    criteria: Array<{
      questionId: number;
      strategy: CustomAllocationCriteriaStrategy;
      weight: number;
    }>;
  },
) {
  return apiFetch<CustomAllocationPreview>(`/team-allocation/projects/${projectId}/custom-preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function applyCustomAllocation(
  projectId: number,
  payload: { previewId: string; teamNames?: string[] },
) {
  return apiFetch<CustomAllocationApplied>(`/team-allocation/projects/${projectId}/custom-allocate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
