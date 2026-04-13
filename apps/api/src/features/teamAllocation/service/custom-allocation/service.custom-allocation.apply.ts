import { assertProjectMutableForWrites } from "../../../../shared/projectWriteGuard.js";
import { applyRandomAllocationPlan, findStaffScopedProject, findVacantModuleStudentsForProject } from "../../repo/repo.js";
import {
  deleteCustomAllocationPreview,
  findStaleStudentsFromPreview,
  getStoredCustomAllocationPreview,
  resolveCustomAllocationTeamNames,
} from "./service.custom-allocation.shared.js";
import type {
  CustomAllocationApplied,
  CustomAllocationApplyInput,
} from "../service.types.js";

export async function applyCustomAllocationForProject(
  staffId: number,
  projectId: number,
  input: CustomAllocationApplyInput,
): Promise<CustomAllocationApplied> {
  const previewId = input.previewId.trim();
  if (!previewId) {
    throw { code: "INVALID_PREVIEW_ID" };
  }

  if (
    input.teamNames !== undefined &&
    (!Array.isArray(input.teamNames) || input.teamNames.some((teamName) => typeof teamName !== "string"))
  ) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  const preview = getStoredCustomAllocationPreview(previewId, staffId, projectId);
  if (!preview) {
    throw { code: "PREVIEW_NOT_FOUND_OR_EXPIRED" };
  }

  const requestedTeamNames = resolveCustomAllocationTeamNames(preview.previewTeams, input.teamNames);
  const plannedTeams = preview.previewTeams.map((team) => ({
    members: team.members.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
    })),
  }));

  const currentlyVacantStudents = await findVacantModuleStudentsForProject(
    project.enterpriseId,
    project.moduleId,
    project.id,
  );
  const currentlyVacantStudentIds = new Set(currentlyVacantStudents.map((student) => student.id));
  const staleStudents = findStaleStudentsFromPreview(preview.previewTeams, currentlyVacantStudentIds);
  if (staleStudents.length > 0) {
    deleteCustomAllocationPreview(previewId);
    throw {
      code: "STUDENTS_NO_LONGER_VACANT",
      staleStudents,
    };
  }

  let appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  try {
    appliedTeams = await applyRandomAllocationPlan(
      project.id,
      project.enterpriseId,
      plannedTeams,
      {
        teamNames: requestedTeamNames,
        draftCreatedById: staffId,
      },
    );
  } catch (error: any) {
    if (error?.code === "STUDENTS_NO_LONGER_VACANT") {
      deleteCustomAllocationPreview(previewId);
      const refreshedVacantStudents = await findVacantModuleStudentsForProject(
        project.enterpriseId,
        project.moduleId,
        project.id,
      );
      const refreshedVacantStudentIds = new Set(refreshedVacantStudents.map((student) => student.id));
      throw {
        code: "STUDENTS_NO_LONGER_VACANT",
        staleStudents: findStaleStudentsFromPreview(preview.previewTeams, refreshedVacantStudentIds),
      };
    }
    throw error;
  }
  deleteCustomAllocationPreview(previewId);

  const studentCount = plannedTeams.reduce((sum, team) => sum + team.members.length, 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    previewId,
    studentCount,
    teamCount: preview.teamCount,
    appliedTeams,
  };
}