import type { Prisma, TeamAllocationLifecycle, TeamInviteStatus } from "@prisma/client";
import { prisma } from "../../shared/db.js";

type StaffUserRole = "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";

export type StaffScopedProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  archivedAt: Date | null;
  enterpriseId: string;
};

export type StaffScopedProjectAccess = StaffScopedProject & {
  actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  isModuleLead: boolean;
  isModuleTeachingAssistant: boolean;
  canApproveAllocationDrafts: boolean;
};

export type ModuleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProjectTeamSummary = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type ManualAllocationStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  currentTeamId: number | null;
  currentTeamName: string | null;
};

export type AppliedRandomTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type AppliedManualTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type ProjectDraftTeam = {
  id: number;
  teamName: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type ProjectDraftTeamConflict = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  teamId: number;
  teamName: string;
};

export type ApprovedDraftTeam = {
  id: number;
  teamName: string;
  memberCount: number;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type CustomAllocationTemplateQuestion = {
  id: number;
  label: string;
  type: string;
};

export type CustomAllocationTemplate = {
  id: number;
  templateName: string;
  ownerId: number;
  isPublic: boolean;
  questions: CustomAllocationTemplateQuestion[];
};

export type CustomAllocationLatestResponse = {
  reviewerUserId: number;
  answersJson: unknown;
};

export async function findActiveInvite(teamId: number, inviteeEmail: string) {
  return prisma.teamInvite.findFirst({
    where: {
      teamId,
      inviteeEmail,
      active: true,
      status: "PENDING",
      team: {
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
  });
}

export async function createTeamInviteRecord(data: {
  teamId: number;
  inviterId: number;
  inviteeId?: number | null;
  inviteeEmail: string;
  tokenHash: string;
  expiresAt: Date;
  message?: string | null;
}) {
  return prisma.teamInvite.create({
    data: {
      teamId: data.teamId,
      inviterId: data.inviterId,
      inviteeId: data.inviteeId ?? null,
      inviteeEmail: data.inviteeEmail,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      status: "PENDING",
      active: true,
      message: data.message ?? null,
    },
  });
}

export async function findInviteContext(teamId: number, inviterId: number) {
  const [team, inviter] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { teamName: true, projectId: true },
    }),
    prisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true, email: true },
    }),
  ]);

  return { team, inviter };
}

export async function getInvitesForTeam(teamId: number) {
  return prisma.teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function findPendingInvitesForEmail(email: string) {
  return prisma.teamInvite.findMany({
    where: {
      inviteeEmail: email,
      status: "PENDING",
      active: true,
      team: {
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    include: {
      team: { select: { id: true, teamName: true, projectId: true } },
      inviter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateInviteStatusFromPending(
  inviteId: string,
  status: TeamInviteStatus,
  now: Date,
) {
  const result = await prisma.teamInvite.updateMany({
    where: {
      id: inviteId,
      status: "PENDING",
      active: true,
      team: {
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    data: {
      status,
      active: false,
      respondedAt: now,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.teamInvite.findUnique({
    where: { id: inviteId },
  });
}

export async function findStaffScopedProject(
  staffId: number,
  projectId: number,
): Promise<StaffScopedProject | null> {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) {
    return null;
  }

  const role = user.role as StaffUserRole | "STUDENT";
  if (role === "STUDENT") {
    return null;
  }

  const hasEnterpriseWideAccess = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(hasEnterpriseWideAccess
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: staffId } } },
                { moduleTeachingAssistants: { some: { userId: staffId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: { name: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module.name,
    archivedAt: project.archivedAt,
    enterpriseId: user.enterpriseId,
  };
}

export async function findStaffScopedProjectAccess(
  staffId: number,
  projectId: number,
): Promise<StaffScopedProjectAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { enterpriseId: true, role: true, active: true },
  });

  if (!user || user.active === false) {
    return null;
  }

  const role = user.role as StaffUserRole | "STUDENT";
  if (role === "STUDENT") {
    return null;
  }

  const hasEnterpriseWideAccess = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(hasEnterpriseWideAccess
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId: staffId } } },
                { moduleTeachingAssistants: { some: { userId: staffId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: {
          name: true,
          moduleLeads: {
            where: { userId: staffId },
            select: { userId: true },
            take: 1,
          },
          moduleTeachingAssistants: {
            where: { userId: staffId },
            select: { userId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  const isModuleLead = project.module.moduleLeads.length > 0;
  const isModuleTeachingAssistant = project.module.moduleTeachingAssistants.length > 0;

  return {
    id: project.id,
    name: project.name,
    moduleId: project.moduleId,
    moduleName: project.module.name,
    archivedAt: project.archivedAt,
    enterpriseId: user.enterpriseId,
    actorRole: role,
    isModuleLead,
    isModuleTeachingAssistant,
    canApproveAllocationDrafts: isModuleLead,
  };
}

export async function findVacantModuleStudentsForProject(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
): Promise<ModuleStudent[]> {
  return prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
      teamAllocations: {
        none: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
}

export async function findModuleStudentsForManualAllocation(
  enterpriseId: string,
  moduleId: number,
  projectId: number,
): Promise<ManualAllocationStudent[]> {
  const students = await prisma.user.findMany({
    where: {
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      teamAllocations: {
        where: {
          team: {
            projectId,
            archivedAt: null,
          },
        },
        select: {
          team: {
            select: {
              id: true,
              teamName: true,
            },
          },
        },
        orderBy: {
          teamId: "asc",
        },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });

  return students.map((student) => {
    const currentTeam = student.teamAllocations[0]?.team ?? null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      currentTeamId: currentTeam?.id ?? null,
      currentTeamName: currentTeam?.teamName ?? null,
    };
  });
}

export async function findProjectTeamSummaries(projectId: number): Promise<ProjectTeamSummary[]> {
  const teams = await prisma.team.findMany({
    where: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: {
      id: true,
      teamName: true,
      _count: {
        select: { allocations: true },
      },
    },
    orderBy: [{ teamName: "asc" }, { id: "asc" }],
  });

  return teams.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    memberCount: team._count.allocations,
  }));
}

function mapProjectDraftTeam(team: {
  id: number;
  teamName: string;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  allocations: Array<{
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  _count: {
    allocations: number;
  };
}): ProjectDraftTeam {
  const members = team.allocations
    .map((allocation) => allocation.user)
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .sort((left, right) => {
      const leftLastName = typeof left.lastName === "string" ? left.lastName : "";
      const rightLastName = typeof right.lastName === "string" ? right.lastName : "";
      const leftFirstName = typeof left.firstName === "string" ? left.firstName : "";
      const rightFirstName = typeof right.firstName === "string" ? right.firstName : "";
      const lastNameComparison = leftLastName.localeCompare(rightLastName);
      if (lastNameComparison !== 0) return lastNameComparison;
      const firstNameComparison = leftFirstName.localeCompare(rightFirstName);
      if (firstNameComparison !== 0) return firstNameComparison;
      return left.id - right.id;
    });

  return {
    id: team.id,
    teamName: team.teamName,
    memberCount: team._count.allocations,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    draftCreatedBy: team.draftCreatedBy,
    members,
  };
}

export async function findProjectDraftTeams(projectId: number): Promise<ProjectDraftTeam[]> {
  const teams = await prisma.team.findMany({
    where: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "DRAFT",
    },
    select: {
      id: true,
      teamName: true,
      createdAt: true,
      updatedAt: true,
      draftCreatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      allocations: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ userId: "asc" }],
      },
      _count: {
        select: {
          allocations: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });

  return teams.map(mapProjectDraftTeam);
}

export async function findDraftTeamInProject(projectId: number, teamId: number) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      projectId,
      archivedAt: null,
      allocationLifecycle: "DRAFT",
    },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      enterpriseId: true,
    },
  });
}

export async function findDraftTeamById(teamId: number): Promise<ProjectDraftTeam | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      teamName: true,
      createdAt: true,
      updatedAt: true,
      allocationLifecycle: true,
      archivedAt: true,
      draftCreatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      allocations: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ userId: "asc" }],
      },
      _count: {
        select: {
          allocations: true,
        },
      },
    },
  });

  if (!team || team.archivedAt !== null || team.allocationLifecycle !== "DRAFT") {
    return null;
  }

  return mapProjectDraftTeam(team);
}

export async function findTeamNameConflictInEnterprise(
  enterpriseId: string,
  teamName: string,
  options: { excludeTeamId?: number } = {},
) {
  const existing = await prisma.team.findFirst({
    where: {
      enterpriseId,
      teamName,
      ...(options.excludeTeamId !== undefined ? { id: { not: options.excludeTeamId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function findModuleStudentsByIdsInModule(
  enterpriseId: string,
  moduleId: number,
  studentIds: number[],
) {
  if (studentIds.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      id: { in: studentIds },
      enterpriseId,
      active: true,
      role: "STUDENT",
      userModules: {
        some: {
          enterpriseId,
          moduleId,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function findStudentAllocationConflictsInProject(
  projectId: number,
  studentIds: number[],
  lifecycle: TeamAllocationLifecycle,
  options: { excludeTeamId?: number } = {},
): Promise<ProjectDraftTeamConflict[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const rows = await prisma.teamAllocation.findMany({
    where: {
      userId: { in: studentIds },
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: lifecycle,
        ...(options.excludeTeamId !== undefined ? { id: { not: options.excludeTeamId } } : {}),
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          teamName: true,
        },
      },
    },
    orderBy: [{ userId: "asc" }, { teamId: "asc" }],
  });

  return rows.map((row) => ({
    userId: row.userId,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    email: row.user.email,
    teamId: row.team.id,
    teamName: row.team.teamName,
  }));
}

export async function updateDraftTeam(
  teamId: number,
  input: {
    teamName?: string;
    studentIds?: number[];
    expectedUpdatedAt?: Date;
  },
): Promise<AppliedManualTeam> {
  return prisma.$transaction(async (tx) => {
    const draftTeam = await tx.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });
    if (!draftTeam) {
      throw { code: "DRAFT_TEAM_NOT_FOUND" };
    }
    if (
      input.expectedUpdatedAt &&
      draftTeam.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      throw { code: "DRAFT_OUTDATED" };
    }

    const baselineUpdatedAt = draftTeam.updatedAt;
    const writeResult = await tx.team.updateMany({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
        updatedAt: baselineUpdatedAt,
      },
      data: {
        ...(input.teamName !== undefined ? { teamName: input.teamName } : {}),
        updatedAt: new Date(),
      },
    });
    if (writeResult.count === 0) {
      throw { code: "DRAFT_OUTDATED" };
    }

    if (input.studentIds !== undefined) {
      await tx.teamAllocation.deleteMany({
        where: {
          teamId,
          team: {
            archivedAt: null,
            allocationLifecycle: "DRAFT",
          },
        },
      });

      if (input.studentIds.length > 0) {
        const latestDraftTeam = await tx.team.findFirst({
          where: {
            id: teamId,
            archivedAt: null,
            allocationLifecycle: "DRAFT",
          },
          select: { id: true },
        });
        if (!latestDraftTeam) {
          throw { code: "DRAFT_OUTDATED" };
        }

        await tx.teamAllocation.createMany({
          data: input.studentIds.map((studentId) => ({
            teamId,
            userId: studentId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await tx.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        teamName: true,
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });

    if (!updated) {
      throw { code: "TEAM_NOT_FOUND" };
    }

    return {
      id: updated.id,
      teamName: updated.teamName,
      memberCount: updated._count.allocations,
    };
  });
}

export async function approveDraftTeam(
  teamId: number,
  approverId: number,
  options: { expectedUpdatedAt?: Date } = {},
): Promise<ApprovedDraftTeam | null> {
  return prisma.$transaction(async (tx) => {
    const draftTeam = await tx.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
      },
      select: {
        id: true,
        projectId: true,
        updatedAt: true,
      },
    });
    if (!draftTeam) {
      return null;
    }
    if (
      options.expectedUpdatedAt &&
      draftTeam.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
    ) {
      throw { code: "DRAFT_OUTDATED" };
    }

    const draftMemberRows = await tx.teamAllocation.findMany({
      where: { teamId },
      select: { userId: true },
      orderBy: { userId: "asc" },
    });
    const draftMemberIds = draftMemberRows.map((row) => row.userId);
    if (draftMemberIds.length > 0) {
      const activeConflicts = await tx.teamAllocation.findMany({
        where: {
          userId: { in: draftMemberIds },
          team: {
            projectId: draftTeam.projectId,
            archivedAt: null,
            allocationLifecycle: "ACTIVE",
            id: { not: teamId },
          },
        },
        select: { userId: true },
        orderBy: [{ userId: "asc" }, { teamId: "asc" }],
      });
      if (activeConflicts.length > 0) {
        throw { code: "STUDENTS_NO_LONGER_AVAILABLE" };
      }
    }

    const approvedAt = new Date();
    const updateResult = await tx.team.updateMany({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
        updatedAt: draftTeam.updatedAt,
      },
      data: {
        allocationLifecycle: "ACTIVE",
        draftApprovedById: approverId,
        draftApprovedAt: approvedAt,
      },
    });

    if (updateResult.count === 0) {
      throw { code: "DRAFT_OUTDATED" };
    }

    const approvedTeam = await tx.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        teamName: true,
        allocations: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: [{ userId: "asc" }],
        },
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });

    if (!approvedTeam) {
      return null;
    }

    return {
      id: approvedTeam.id,
      teamName: approvedTeam.teamName,
      memberCount: approvedTeam._count.allocations,
      members: approvedTeam.allocations.map((allocation) => allocation.user),
    };
  });
}

const CUSTOM_ALLOCATION_ELIGIBLE_TYPES = [
  "multiple-choice",
  "multiple_choice",
  "rating",
  "slider",
];

export async function findCustomAllocationQuestionnairesForStaff(
  staffId: number,
): Promise<CustomAllocationTemplate[]> {
  return prisma.questionnaireTemplate.findMany({
    where: {
      OR: [{ ownerId: staffId }, { isPublic: true }],
    },
    select: {
      id: true,
      templateName: true,
      ownerId: true,
      isPublic: true,
      questions: {
        where: {
          type: {
            in: CUSTOM_ALLOCATION_ELIGIBLE_TYPES,
          },
        },
        select: {
          id: true,
          label: true,
          type: true,
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ templateName: "asc" }, { id: "asc" }],
  });
}

export async function findCustomAllocationTemplateForStaff(
  staffId: number,
  templateId: number,
): Promise<CustomAllocationTemplate | null> {
  return prisma.questionnaireTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ ownerId: staffId }, { isPublic: true }],
    },
    select: {
      id: true,
      templateName: true,
      ownerId: true,
      isPublic: true,
      questions: {
        select: {
          id: true,
          label: true,
          type: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function findRespondingStudentIdsForTemplateInProject(
  projectId: number,
  templateId: number,
  studentIds: number[],
): Promise<number[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const responses = await prisma.peerAssessment.findMany({
    where: {
      projectId,
      templateId,
      reviewerUserId: {
        in: studentIds,
      },
    },
    select: {
      reviewerUserId: true,
    },
    distinct: ["reviewerUserId"],
  });

  return responses.map((response) => response.reviewerUserId);
}

export async function findLatestCustomAllocationResponsesForStudents(
  projectId: number,
  templateId: number,
  studentIds: number[],
): Promise<CustomAllocationLatestResponse[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const records = await prisma.peerAssessment.findMany({
    where: {
      projectId,
      templateId,
      reviewerUserId: {
        in: studentIds,
      },
    },
    select: {
      id: true,
      reviewerUserId: true,
      answersJson: true,
      submittedAt: true,
      updatedAt: true,
    },
    orderBy: [
      { reviewerUserId: "asc" },
      { submittedAt: "desc" },
      { updatedAt: "desc" },
      { id: "desc" },
    ],
  });

  const latestByReviewer = new Set<number>();
  const latestResponses: CustomAllocationLatestResponse[] = [];

  for (const record of records) {
    if (latestByReviewer.has(record.reviewerUserId)) {
      continue;
    }
    latestByReviewer.add(record.reviewerUserId);
    latestResponses.push({
      reviewerUserId: record.reviewerUserId,
      answersJson: record.answersJson,
    });
  }

  return latestResponses;
}

export async function applyRandomAllocationPlan(
  projectId: number,
  enterpriseId: string,
  plannedTeams: Array<{ members: Array<{ id: number }> }>,
  options: { teamNames?: string[]; draftCreatedById?: number } = {},
): Promise<AppliedRandomTeam[]> {
  return prisma.$transaction(async (tx) => {
    const plannedStudentIds = plannedTeams.flatMap((team) => team.members.map((member) => member.id));
    if (plannedStudentIds.length > 0) {
      const alreadyAllocatedStudents = await tx.teamAllocation.findMany({
        where: {
          userId: { in: plannedStudentIds },
          team: {
            projectId,
            archivedAt: null,
          },
        },
        select: { userId: true },
      });

      if (alreadyAllocatedStudents.length > 0) {
        throw { code: "STUDENTS_NO_LONGER_VACANT" };
      }
    }

    const enterpriseNames = await tx.team.findMany({
      where: { enterpriseId },
      select: { teamName: true },
    });
    const usedNames = new Set(enterpriseNames.map((team) => team.teamName));
    const targetTeams: Array<{ id: number; teamName: string }> = [];

    const requestedTeamNames =
      options.teamNames ??
      plannedTeams.map((_, index) => `Random Team ${index + 1}`);
    if (requestedTeamNames.length !== plannedTeams.length) {
      throw { code: "INVALID_TEAM_NAMES" };
    }

    for (let index = 0; index < requestedTeamNames.length; index += 1) {
      const teamName = requestedTeamNames[index].trim();
      if (teamName.length === 0) {
        throw { code: "INVALID_TEAM_NAMES" };
      }
      if (usedNames.has(teamName)) {
        throw { code: "TEAM_NAME_ALREADY_EXISTS" };
      }

      const createdTeam = await tx.team.create({
        data: {
          enterpriseId,
          projectId,
          teamName,
          allocationLifecycle: "DRAFT",
          draftCreatedById: options.draftCreatedById ?? null,
          draftApprovedById: null,
          draftApprovedAt: null,
        },
        select: { id: true, teamName: true },
      });
      usedNames.add(teamName);
      targetTeams.push(createdTeam);
    }

    for (let index = 0; index < plannedTeams.length; index += 1) {
      const team = targetTeams[index];
      const allocations = plannedTeams[index].members.map((member) => ({
        teamId: team.id,
        userId: member.id,
      }));

      if (allocations.length > 0) {
        await tx.teamAllocation.createMany({
          data: allocations,
          skipDuplicates: true,
        });
      }
    }

    return plannedTeams.map((plan, index) => ({
      id: targetTeams[index].id,
      teamName: targetTeams[index].teamName,
      memberCount: plan.members.length,
    }));
  });
}

export async function applyManualAllocationTeam(
  projectId: number,
  enterpriseId: string,
  teamName: string,
  studentIds: number[],
  options: { draftCreatedById?: number } = {},
): Promise<AppliedManualTeam> {
  return prisma.$transaction(async (tx) => {
    const existingName = await tx.team.findFirst({
      where: {
        enterpriseId,
        teamName,
      },
      select: {
        id: true,
      },
    });

    if (existingName) {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }

    const conflictingAllocations = await tx.teamAllocation.findMany({
      where: {
        userId: { in: studentIds },
        team: {
          projectId,
          archivedAt: null,
        },
      },
      select: {
        userId: true,
      },
    });

    if (conflictingAllocations.length > 0) {
      throw { code: "STUDENTS_NO_LONGER_AVAILABLE" };
    }

    const team = await tx.team.create({
      data: {
        enterpriseId,
        projectId,
        teamName,
        allocationLifecycle: "DRAFT",
        draftCreatedById: options.draftCreatedById ?? null,
        draftApprovedById: null,
        draftApprovedAt: null,
      },
      select: {
        id: true,
        teamName: true,
      },
    });

    await tx.teamAllocation.createMany({
      data: studentIds.map((studentId) => ({
        teamId: team.id,
        userId: studentId,
      })),
      skipDuplicates: true,
    });

    return {
      id: team.id,
      teamName: team.teamName,
      memberCount: studentIds.length,
    };
  });
}

export const TeamService = {
  // Create a team and add the creator as an owner in TeamAllocation.
  async createTeam(userId: number, teamData: Prisma.TeamUncheckedCreateInput) {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: teamData });
      await tx.teamAllocation.create({
        data: {
          teamId: team.id,
          userId,
          // role "OWNER" is implied; TeamAllocation has no role column in schema.
        },
      });
      return team;
    });
  },

  // Fetch a team and include members via TeamAllocation.
  async getTeamById(teamId: number) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
      include: {
        allocations: {
          include: { user: true },
        },
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };
    return team;
  },

  // Add a user to a team (role defaults to MEMBER, not stored in schema).
  async addUserToTeam(teamId: number, userId: number, _role: "OWNER" | "MEMBER" = "MEMBER") {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };

    const existing = await prisma.teamAllocation.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw { code: "MEMBER_ALREADY_EXISTS" };

    return prisma.teamAllocation.create({
      data: { teamId, userId },
    });
  },

  // Return all users allocated to a team.
  async getTeamMembers(teamId: number) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    });
    if (!team) throw { code: "TEAM_NOT_FOUND" };

    const allocations = await prisma.teamAllocation.findMany({
      where: { teamId },
      include: { user: true },
    });

    return allocations.map((entry) => entry.user);
  },
};
