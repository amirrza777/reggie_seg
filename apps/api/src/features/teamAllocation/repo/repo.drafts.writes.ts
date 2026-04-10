import { prisma } from "../../shared/db.js";
import type {
  AppliedManualTeam,
  ApprovedDraftTeam,
} from "./repo.types.js";

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

export async function deleteDraftTeam(
  teamId: number,
  options: { expectedUpdatedAt?: Date } = {},
): Promise<{ id: number; teamName: string } | null> {
  return prisma.$transaction(async (tx) => {
    const draftTeam = await tx.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
      },
      select: {
        id: true,
        teamName: true,
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

    const archivedAt = new Date();
    const deleteResult = await tx.team.updateMany({
      where: {
        id: teamId,
        archivedAt: null,
        allocationLifecycle: "DRAFT",
        ...(options.expectedUpdatedAt !== undefined ? { updatedAt: draftTeam.updatedAt } : {}),
      },
      data: {
        archivedAt,
        updatedAt: archivedAt,
      },
    });
    if (deleteResult.count === 0) {
      throw { code: "DRAFT_OUTDATED" };
    }

    return {
      id: draftTeam.id,
      teamName: draftTeam.teamName,
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