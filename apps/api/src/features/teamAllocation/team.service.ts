import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { TeamService } from "./repo.js";

async function findUserEnterpriseById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseId: true },
  });
}

/** Creates a team. */
export async function createTeam(userId: number, teamData: Prisma.TeamUncheckedCreateInput) {
  return TeamService.createTeam(userId, teamData);
}

/** Creates a team for project. */
export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const user = await findUserEnterpriseById(userId);
  if (!user) throw { code: "USER_NOT_FOUND" };
  return TeamService.createTeam(userId, {
    enterpriseId: user.enterpriseId,
    projectId,
    teamName,
  });
}

/** Returns the team by ID. */
export async function getTeamById(teamId: number) {
  return TeamService.getTeamById(teamId);
}

/** Adds a user to team. */
export async function addUserToTeam(teamId: number, userId: number, _role: "OWNER" | "MEMBER" = "MEMBER") {
  return TeamService.addUserToTeam(teamId, userId, _role);
}

/** Returns the team members. */
export async function getTeamMembers(teamId: number) {
  return TeamService.getTeamMembers(teamId);
}