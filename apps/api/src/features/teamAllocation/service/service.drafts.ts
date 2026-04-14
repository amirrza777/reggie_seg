import { assertProjectMutableForWrites } from "../../../shared/projectWriteGuard.js";
import { addNotification } from "../../notifications/service.js";
import {
  approveDraftTeam,
  deleteDraftTeam,
  findDraftTeamById,
  findDraftTeamInProject,
  findModuleStudentsByIdsInModule,
  findProjectDraftTeams,
  findStaffScopedProjectAccess,
  findStudentAllocationConflictsInProject,
  findTeamNameConflictInProject,
  updateDraftTeam,
} from "../repo/repo.js";
import type {
  AllocationDraftApproved,
  AllocationDraftDeleted,
  AllocationDraftsWorkspace,
  AllocationDraftUpdated,
} from "./service.types.js";
import {
  mapAllocationDraftTeamForResponse,
  notifyStudentsAboutApprovedDraftTeam,
  parseExpectedUpdatedAt,
} from "./service.drafts.helpers.js";

export async function listAllocationDraftsForProject(
  staffId: number,
  projectId: number,
): Promise<AllocationDraftsWorkspace> {
  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  const drafts = await findProjectDraftTeams(project.id);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    access: {
      actorRole: project.actorRole,
      isModuleLead: project.isModuleLead,
      isModuleTeachingAssistant: project.isModuleTeachingAssistant,
      canApproveAllocationDrafts: project.canApproveAllocationDrafts,
    },
    drafts: drafts.map(mapAllocationDraftTeamForResponse),
  };
}

export async function updateAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { teamName?: string; studentIds?: number[]; expectedUpdatedAt?: string },
): Promise<AllocationDraftUpdated> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  const hasTeamName = Object.prototype.hasOwnProperty.call(input, "teamName");
  const hasStudentIds = Object.prototype.hasOwnProperty.call(input, "studentIds");
  if (!hasTeamName && !hasStudentIds) {
    throw { code: "INVALID_DRAFT_UPDATE" };
  }

  let normalizedTeamName: string | undefined;
  if (hasTeamName) {
    if (typeof input.teamName !== "string") {
      throw { code: "INVALID_TEAM_NAME" };
    }
    normalizedTeamName = input.teamName.trim();
    if (normalizedTeamName.length === 0) {
      throw { code: "INVALID_TEAM_NAME" };
    }
  }

  let normalizedStudentIds: number[] | undefined;
  if (hasStudentIds) {
    if (
      !Array.isArray(input.studentIds) ||
      input.studentIds.some((studentId) => !Number.isInteger(studentId) || studentId < 1)
    ) {
      throw { code: "INVALID_STUDENT_IDS" };
    }
    const uniqueStudentIds = Array.from(new Set(input.studentIds));
    if (uniqueStudentIds.length !== input.studentIds.length) {
      throw { code: "INVALID_STUDENT_IDS" };
    }
    normalizedStudentIds = uniqueStudentIds;
  }

  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const currentDraft = await findDraftTeamById(teamId);
  if (!currentDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && currentDraft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }

  if (normalizedTeamName !== undefined) {
    const teamNameAlreadyExists = await findTeamNameConflictInProject(project.id, normalizedTeamName, {
      excludeTeamId: teamId,
    });
    if (teamNameAlreadyExists) {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }
  }

  if (normalizedStudentIds !== undefined) {
    const moduleStudents = await findModuleStudentsByIdsInModule(
      project.enterpriseId,
      project.moduleId,
      normalizedStudentIds,
      project.id,
    );
    if (moduleStudents.length !== normalizedStudentIds.length) {
      throw { code: "STUDENT_NOT_IN_MODULE" };
    }

    const activeConflicts = await findStudentAllocationConflictsInProject(
      project.id,
      normalizedStudentIds,
      "ACTIVE",
      { excludeTeamId: teamId },
    );
    if (activeConflicts.length > 0) {
      throw { code: "STUDENT_ALREADY_ASSIGNED", conflicts: activeConflicts };
    }

    const draftConflicts = await findStudentAllocationConflictsInProject(
      project.id,
      normalizedStudentIds,
      "DRAFT",
      { excludeTeamId: teamId },
    );
    if (draftConflicts.length > 0) {
      throw { code: "STUDENT_IN_OTHER_DRAFT", conflicts: draftConflicts };
    }
  }

  await updateDraftTeam(teamId, {
    ...(normalizedTeamName !== undefined ? { teamName: normalizedTeamName } : {}),
    ...(normalizedStudentIds !== undefined ? { studentIds: normalizedStudentIds } : {}),
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });

  const updatedDraft = await findDraftTeamById(teamId);
  if (!updatedDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    access: {
      actorRole: project.actorRole,
      isModuleLead: project.isModuleLead,
      isModuleTeachingAssistant: project.isModuleTeachingAssistant,
      canApproveAllocationDrafts: project.canApproveAllocationDrafts,
    },
    draft: mapAllocationDraftTeamForResponse(updatedDraft),
  };
}

export async function approveAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { expectedUpdatedAt?: string } = {},
): Promise<AllocationDraftApproved> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);
  if (!project.canApproveAllocationDrafts) {
    throw { code: "APPROVAL_FORBIDDEN" };
  }

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const draft = await findDraftTeamById(teamId);
  if (!draft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }
  if (draft.memberCount === 0) {
    throw { code: "DRAFT_TEAM_HAS_NO_MEMBERS" };
  }

  const studentIds = draft.members.map((member) => member.id);
  const activeConflicts = await findStudentAllocationConflictsInProject(
    project.id,
    studentIds,
    "ACTIVE",
    { excludeTeamId: teamId },
  );
  if (activeConflicts.length > 0) {
    throw { code: "STUDENTS_NO_LONGER_AVAILABLE", conflicts: activeConflicts };
  }

  const approvedTeam = await approveDraftTeam(teamId, staffId, {
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });
  if (!approvedTeam) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  await notifyStudentsAboutApprovedDraftTeam(
    project.id,
    project.name,
    approvedTeam.teamName,
    approvedTeam.members.map((member) => ({
      firstName: member.firstName,
      email: member.email,
    })),
  );

  await Promise.allSettled(
    approvedTeam.members.map((member) =>
      addNotification({
        userId: member.id,
        type: "TEAM_ALLOCATED",
        message: `You have been allocated to "${approvedTeam.teamName}"`,
        link: `/projects/${project.id}/team`,
      })
    )
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    approvedTeam: {
      id: approvedTeam.id,
      teamName: approvedTeam.teamName,
      memberCount: approvedTeam.memberCount,
    },
  };
}

export async function deleteAllocationDraftForProject(
  staffId: number,
  projectId: number,
  teamId: number,
  input: { expectedUpdatedAt?: string } = {},
): Promise<AllocationDraftDeleted> {
  if (!Number.isInteger(teamId) || teamId < 1) {
    throw { code: "INVALID_DRAFT_TEAM_ID" };
  }

  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);

  const project = await findStaffScopedProjectAccess(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  if (!(await findDraftTeamInProject(project.id, teamId))) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  const draft = await findDraftTeamById(teamId);
  if (!draft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }
  if (expectedUpdatedAt && draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw { code: "DRAFT_OUTDATED" };
  }

  const isModuleOwner = project.canApproveAllocationDrafts;
  const isDraftCreator = draft.draftCreatedBy?.id === staffId;
  if (!isModuleOwner && !isDraftCreator) {
    throw { code: "DELETE_DRAFT_FORBIDDEN" };
  }

  const deletedDraft = await deleteDraftTeam(teamId, {
    ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}),
  });
  if (!deletedDraft) {
    throw { code: "DRAFT_TEAM_NOT_FOUND" };
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    deletedDraft,
  };
}
