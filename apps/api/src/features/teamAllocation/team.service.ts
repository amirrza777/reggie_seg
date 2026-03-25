import type { Prisma } from "@prisma/client";
import {
  createTeamAllocation,
  createTeamWithOwner,
  findTeamAllocation,
  findTeamById,
  findUserEnterpriseById,
  listTeamMemberUsers,
} from "./repo.js";

/** Creates a team. */
export async function createTeam(userId: number, teamData: Prisma.TeamUncheckedCreateInput) {
  return createTeamWithOwner(userId, teamData);
}

/** Creates a team for project. */
export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const user = await findUserEnterpriseById(userId);
  if (!user) throw { code: "USER_NOT_FOUND" };
  return createTeamWithOwner(userId, {
    enterpriseId: user.enterpriseId,
    projectId,
    teamName,
  });
}

/** Returns the team by ID. */
export async function getTeamById(teamId: number) {
  const team = await findTeamById(teamId);
  if (!team) throw { code: "TEAM_NOT_FOUND" };
  return team;
}

/** Adds a user to team. */
export async function addUserToTeam(teamId: number, userId: number, _role: "OWNER" | "MEMBER" = "MEMBER") {
  const team = await findTeamById(teamId);
  if (!team) throw { code: "TEAM_NOT_FOUND" };

  const existing = await findTeamAllocation(teamId, userId);
  if (existing) throw { code: "MEMBER_ALREADY_EXISTS" };

  return createTeamAllocation(teamId, userId);
}

/** Returns the team members. */
export async function getTeamMembers(teamId: number) {
  const team = await findTeamById(teamId);
  if (!team) throw { code: "TEAM_NOT_FOUND" };

  return listTeamMemberUsers(teamId);
}
