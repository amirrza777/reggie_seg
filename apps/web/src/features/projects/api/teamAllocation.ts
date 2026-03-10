"use client";

import { apiFetch } from "@/shared/api/http";

export type TeamInvite = {
  id: string;
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  active: boolean;
  createdAt: string;
  expiresAt: string;
  message: string | null;
  team?: { id: number; teamName: string; projectId: number };
  inviter?: { id: number; firstName: string; lastName: string; email: string };
};

export async function sendTeamInvite(teamId: number, inviterId: number, inviteeEmail: string, message?: string) {
  return apiFetch<{ ok: boolean; inviteId: string }>("/team-allocation/invites", {
    method: "POST",
    body: JSON.stringify({ teamId, inviterId, inviteeEmail, message }),
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
