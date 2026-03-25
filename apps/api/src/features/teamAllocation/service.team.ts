import { prisma } from "../../shared/db.js";
import { TeamService } from "./repo.js";

type StudentTeamCreationScope = {
  enterpriseId: string;
  projectId: number;
};

export async function createTeam(userId: number, teamData: Parameters<typeof TeamService.createTeam>[1]) {
  const projectId = Number(teamData.projectId);
  if (!Number.isInteger(projectId) || projectId < 1) {
    throw { code: "INVALID_PROJECT_ID" };
  }

  const teamName = typeof teamData.teamName === "string" ? teamData.teamName.trim() : "";
  if (teamName.length === 0) {
    throw { code: "INVALID_TEAM_NAME" };
  }

  const scope = await resolveStudentTeamCreationScope(userId, projectId);
  return createStudentTeam(userId, scope, teamName);
}

export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const normalizedTeamName = teamName.trim();
  if (!normalizedTeamName) {
    throw { code: "INVALID_TEAM_NAME" };
  }
  const scope = await resolveStudentTeamCreationScope(userId, projectId);
  return createStudentTeam(userId, scope, normalizedTeamName);
}

export async function getTeamById(teamId: number) {
  return TeamService.getTeamById(teamId);
}

export async function addUserToTeam(teamId: number, userId: number, role: "OWNER" | "MEMBER" = "MEMBER") {
  return TeamService.addUserToTeam(teamId, userId, role);
}

export async function getTeamMembers(teamId: number) {
  return TeamService.getTeamMembers(teamId);
}

async function resolveStudentTeamCreationScope(
  userId: number,
  projectId: number,
): Promise<StudentTeamCreationScope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseId: true, role: true, active: true },
  });
  if (!user || !user.active) {
    throw { code: "USER_NOT_FOUND" };
  }
  if (user.role !== "STUDENT") {
    throw { code: "TEAM_CREATION_FORBIDDEN" };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      archivedAt: null,
      module: {
        enterpriseId: user.enterpriseId,
        userModules: {
          some: {
            userId,
            enterpriseId: user.enterpriseId,
          },
        },
      },
    },
    select: { id: true, module: { select: { enterpriseId: true } } },
  });
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }

  const existingAllocation = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    select: { teamId: true },
  });
  if (existingAllocation) {
    throw { code: "STUDENT_ALREADY_IN_TEAM" };
  }

  return {
    enterpriseId: project.module.enterpriseId,
    projectId: project.id,
  };
}

async function createStudentTeam(
  userId: number,
  scope: StudentTeamCreationScope,
  teamName: string,
) {
  try {
    return await TeamService.createTeam(userId, {
      enterpriseId: scope.enterpriseId,
      projectId: scope.projectId,
      teamName,
      allocationLifecycle: "ACTIVE",
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }
    throw error;
  }
}