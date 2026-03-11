import crypto from "crypto";
import type { TeamInviteStatus } from "@prisma/client";
import { sendEmail } from "../../shared/email.js";
import { prisma } from "../../shared/db.js";
import { planRandomTeams } from "./randomizer.js";
import {
  applyRandomAllocationPlan,
  createTeamInviteRecord,
  findActiveInvite,
  findInviteContext,
  findVacantModuleStudentsForProject,
  findProjectTeamSummaries,
  findStaffScopedProject,
  getInvitesForTeam,
  TeamService,
  updateInviteStatusFromPending,
} from "./repo.js";

type CreateTeamInviteParams = {
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  inviteeId?: number;
  message?: string;
  baseUrl: string;
  expiresInMs?: number;
};

export type RandomAllocationPreview = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  previewTeams: Array<{
    index: number;
    suggestedName: string;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>;
};

export type RandomAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
};

async function notifyStudentsAboutRandomAllocation(
  projectName: string,
  plannedTeams: Array<{
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>,
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>,
) {
  const assignments = plannedTeams.flatMap((team, index) => {
    const teamName = appliedTeams[index]?.teamName ?? `Team ${index + 1}`;
    return team.members.map((member) => ({ member, teamName }));
  });

  const results = await Promise.allSettled(
    assignments.map(({ member, teamName }) => {
      const firstName = member.firstName?.trim() || "there";
      const subject = `Team allocation updated - ${projectName}`;
      const text = [
        `Hi ${firstName},`,
        "",
        `Your team allocation for ${projectName} has been updated.`,
        `You are now assigned to: ${teamName}.`,
        "",
        "Log in to view your updated team workspace.",
      ].join("\n");

      return sendEmail({
        to: member.email,
        subject,
        text,
      });
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`Random allocation email notifications failed for ${failures.length} student(s).`);
  }
}

export async function createTeamInvite(params: CreateTeamInviteParams) {
  const normalizedEmail = params.inviteeEmail.trim().toLowerCase();

  const teamRecord = await prisma.team.findUnique({ where: { id: params.teamId }, select: { archivedAt: true } });
  if (teamRecord?.archivedAt) throw { code: "TEAM_ARCHIVED" };

  const existing = await findActiveInvite(params.teamId, normalizedEmail);
  if (existing) {
    throw { code: "INVITE_ALREADY_PENDING" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + (params.expiresInMs ?? 7 * 24 * 60 * 60 * 1000));

  const invite = await createTeamInviteRecord({
    teamId: params.teamId,
    inviterId: params.inviterId,
    inviteeId: params.inviteeId ?? null,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt,
    message: params.message ?? null,
  });

  const { team, inviter } = await findInviteContext(params.teamId, params.inviterId);

  const textLines = [
    `You have been invited by ${inviter?.firstName ?? "a teammate"} ${
      inviter?.lastName ?? ""
    } (${inviter?.email ?? "unknown"}) to join the team "${
      team?.teamName ?? "Unknown Team"
    }".`,
    "Please log in to your account and RSVP to this invite.",
  ].filter(Boolean);

  await sendEmail({
    to: normalizedEmail,
    subject: "Team invitation",
    text: textLines.join("\n"),
  });

  return { invite, rawToken };
}

export async function listTeamInvites(teamId: number) {
  return getInvitesForTeam(teamId);
}

export async function createTeam(userId: number, teamData: Parameters<typeof TeamService.createTeam>[1]) {
  return TeamService.createTeam(userId, teamData);
}

export async function createTeamForProject(userId: number, projectId: number, teamName: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { enterpriseId: true } });
  if (!user) throw { code: "USER_NOT_FOUND" };
  return TeamService.createTeam(userId, { enterpriseId: user.enterpriseId, projectId, teamName });
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

export async function previewRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { seed?: number } = {},
): Promise<RandomAllocationPreview> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const students = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    projectId,
  );
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }

  const [plannedTeams, existingTeams] = await Promise.all([
    Promise.resolve(planRandomTeams(students, teamCount, { seed: options.seed })),
    findProjectTeamSummaries(projectId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    studentCount: students.length,
    teamCount,
    existingTeams,
    previewTeams: plannedTeams.map((team, index) => ({
      index: team.index,
      suggestedName: `Random Team ${index + 1}`,
      members: team.members,
    })),
  };
}

export async function applyRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { seed?: number } = {},
): Promise<RandomAllocationApplied> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const students = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    projectId,
  );
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }

  const plannedTeams = planRandomTeams(students, teamCount, { seed: options.seed });
  const appliedTeams = await applyRandomAllocationPlan(projectId, project.enterpriseId, plannedTeams);
  await notifyStudentsAboutRandomAllocation(project.name, plannedTeams, appliedTeams);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    studentCount: students.length,
    teamCount,
    appliedTeams,
  };
}

async function transitionInviteFromPending(inviteId: string, status: TeamInviteStatus) {
  const invite = await updateInviteStatusFromPending(inviteId, status, new Date());

  if (!invite) {
    throw { code: "INVITE_NOT_PENDING" };
  }

  return invite;
}

export async function acceptTeamInvite(inviteId: string, userId: number) {
  const invite = await transitionInviteFromPending(inviteId, "ACCEPTED");
  // Add the accepting user to the team; ignore if already a member.
  await TeamService.addUserToTeam(invite.teamId, userId).catch((err: any) => {
    if (err?.code !== "MEMBER_ALREADY_EXISTS") throw err;
  });
  return invite;
}

export async function declineTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

// "REJECTED" is treated as an alias of DECLINED in current schema.
export async function rejectTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "DECLINED");
}

export async function cancelTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "CANCELLED");
}

export async function expireTeamInvite(inviteId: string) {
  return transitionInviteFromPending(inviteId, "EXPIRED");
}