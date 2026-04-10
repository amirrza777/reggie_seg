import { assertProjectMutableForWrites } from "../../shared/projectWriteGuard.js";
import {
  applyRandomAllocationPlan,
  findProjectTeamSummaries,
  findStaffScopedProject,
  findVacantModuleStudentsForProject,
} from "../repo/repo.js";
import {
  buildConstrainedRandomPlan,
  normalizeTeamSizeConstraints,
} from "./service.shared.js";
import type {
  RandomAllocationApplied,
  RandomAllocationPreview,
} from "./service.types.js";

function resolveRandomAllocationTeamNames(teamCount: number, teamNames?: string[]) {
  if (teamNames === undefined) {
    return Array.from({ length: teamCount }, (_, index) => `Random Team ${index + 1}`);
  }

  if (!Array.isArray(teamNames) || teamNames.length !== teamCount) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const normalizedNames = teamNames.map((teamName) => teamName.trim());
  if (normalizedNames.some((teamName) => teamName.length === 0)) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const uniqueNames = new Set(normalizedNames.map((teamName) => teamName.toLowerCase()));
  if (uniqueNames.size !== normalizedNames.length) {
    throw { code: "DUPLICATE_TEAM_NAMES" };
  }

  return normalizedNames;
}

export async function previewRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { minTeamSize?: number; maxTeamSize?: number } = {},
): Promise<RandomAllocationPreview> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }
  const teamSizeConstraints = normalizeTeamSizeConstraints(options);

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

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

  const [plannedAllocation, existingTeams] = await Promise.all([
    Promise.resolve(buildConstrainedRandomPlan(students, teamCount, teamSizeConstraints)),
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
    previewTeams: plannedAllocation.teams.map((team, index) => ({
      index: team.index,
      suggestedName: `Random Team ${index + 1}`,
      members: team.members,
    })),
    unassignedStudents: plannedAllocation.unassignedStudents,
  };
}

export async function applyRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { teamNames?: string[]; minTeamSize?: number; maxTeamSize?: number } = {},
): Promise<RandomAllocationApplied> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }

  const teamNames = resolveRandomAllocationTeamNames(teamCount, options.teamNames);
  const teamSizeConstraints = normalizeTeamSizeConstraints({
    ...(options.minTeamSize !== undefined ? { minTeamSize: options.minTeamSize } : {}),
    ...(options.maxTeamSize !== undefined ? { maxTeamSize: options.maxTeamSize } : {}),
  });

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

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
  const plannedAllocation = buildConstrainedRandomPlan(students, teamCount, teamSizeConstraints);
  const plannedTeams = plannedAllocation.teams;
  const appliedTeams = await applyRandomAllocationPlan(
    projectId,
    project.enterpriseId,
    plannedTeams,
    {
      teamNames,
      draftCreatedById: staffId,
    },
  );
  const assignedStudentCount = plannedTeams.reduce((sum, team) => sum + team.members.length, 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    studentCount: assignedStudentCount,
    teamCount,
    appliedTeams,
  };
}