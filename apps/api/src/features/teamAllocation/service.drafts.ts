import { sendEmail } from "../../shared/email.js";
import { assertProjectMutableForWrites } from "../../shared/projectWriteGuard.js";
import {
  approveDraftTeam,
  deleteDraftTeam,
  findDraftTeamById,
  findDraftTeamInProject,
  findModuleStudentsByIdsInModule,
  findProjectDraftTeams,
  findStaffScopedProjectAccess,
  findStudentAllocationConflictsInProject,
  findTeamNameConflictInEnterprise,
  updateDraftTeam,
} from "./repo.js";
import type {
  AllocationDraftApproved,
  AllocationDraftDeleted,
  AllocationDraftsWorkspace,
  AllocationDraftUpdated,
} from "./service.types.js";

function mapAllocationDraftTeamForResponse(team: {
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
}) {
  return {
    id: team.id,
    teamName: team.teamName,
    memberCount: team.memberCount,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    draftCreatedBy: team.draftCreatedBy,
    members: team.members,
  };
}

async function notifyStudentsAboutManualAllocation(
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  const results = await Promise.allSettled(
    students.map((student) => {
      const firstName = student.firstName?.trim() || "there";
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
        to: student.email,
        subject,
        text,
      });
    }),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(`Manual allocation email notifications failed for ${failures.length} student(s).`);
  }
}

async function notifyStudentsAboutApprovedDraftTeam(
  projectName: string,
  teamName: string,
  students: Array<{ firstName: string; email: string }>,
) {
  await notifyStudentsAboutManualAllocation(projectName, teamName, students);
}

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

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

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
    const teamNameAlreadyExists = await findTeamNameConflictInEnterprise(
      project.enterpriseId,
      normalizedTeamName,
      { excludeTeamId: teamId },
    );
    if (teamNameAlreadyExists) {
      throw { code: "TEAM_NAME_ALREADY_EXISTS" };
    }
  }

  if (normalizedStudentIds !== undefined) {
    const moduleStudents = await findModuleStudentsByIdsInModule(
      project.enterpriseId,
      project.moduleId,
      normalizedStudentIds,
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

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

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
    project.name,
    approvedTeam.teamName,
    approvedTeam.members.map((member) => ({
      firstName: member.firstName,
      email: member.email,
    })),
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

  let expectedUpdatedAt: Date | undefined;
  if (Object.prototype.hasOwnProperty.call(input, "expectedUpdatedAt")) {
    if (typeof input.expectedUpdatedAt !== "string") {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const trimmedExpectedUpdatedAt = input.expectedUpdatedAt.trim();
    if (!trimmedExpectedUpdatedAt) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    const parsedExpectedUpdatedAt = new Date(trimmedExpectedUpdatedAt);
    if (Number.isNaN(parsedExpectedUpdatedAt.getTime())) {
      throw { code: "INVALID_EXPECTED_UPDATED_AT" };
    }
    expectedUpdatedAt = parsedExpectedUpdatedAt;
  }

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