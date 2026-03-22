import {
  applyManualAllocationTeam,
  findModuleStudentsForManualAllocation,
  findProjectTeamSummaries,
  findStaffScopedProject,
} from "./repo.js";
import type {
  ManualAllocationApplied,
  ManualAllocationWorkspace,
} from "./service.types.js";

function normalizeManualAllocationSearchQuery(searchQuery: string | null | undefined) {
  if (typeof searchQuery !== "string") {
    return null;
  }

  const trimmed = searchQuery.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 120) {
    throw { code: "INVALID_SEARCH_QUERY" };
  }
  return trimmed;
}

export async function getManualAllocationWorkspaceForProject(
  staffId: number,
  projectId: number,
  searchQuery: string | null = null,
): Promise<ManualAllocationWorkspace> {
  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const normalizedSearchQuery = normalizeManualAllocationSearchQuery(searchQuery);
  const [students, existingTeams] = await Promise.all([
    normalizedSearchQuery
      ? findModuleStudentsForManualAllocation(
          project.enterpriseId,
          project.moduleId,
          project.id,
          normalizedSearchQuery,
        )
      : findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id),
    findProjectTeamSummaries(project.id),
  ]);

  const studentsWithStatus = students.map((student) => {
    const isAssigned = student.currentTeamId !== null;
    const currentTeam =
      isAssigned && student.currentTeamName
        ? {
            id: student.currentTeamId!,
            teamName: student.currentTeamName,
          }
        : null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      status: isAssigned ? ("ALREADY_IN_TEAM" as const) : ("AVAILABLE" as const),
      currentTeam,
    };
  });

  const alreadyInTeamStudents = studentsWithStatus.filter((student) => student.status === "ALREADY_IN_TEAM").length;
  const availableStudents = studentsWithStatus.length - alreadyInTeamStudents;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    existingTeams,
    students: studentsWithStatus,
    counts: {
      totalStudents: studentsWithStatus.length,
      availableStudents,
      alreadyInTeamStudents,
    },
  };
}

export async function applyManualAllocationForProject(
  staffId: number,
  projectId: number,
  input: { teamName: string; studentIds: number[] },
): Promise<ManualAllocationApplied> {
  const teamName = input.teamName.trim();
  if (teamName.length === 0) {
    throw { code: "INVALID_TEAM_NAME" };
  }
  if (
    !Array.isArray(input.studentIds) ||
    input.studentIds.length === 0 ||
    input.studentIds.some((studentId) => !Number.isInteger(studentId) || studentId < 1)
  ) {
    throw { code: "INVALID_STUDENT_IDS" };
  }

  const studentIds = Array.from(new Set(input.studentIds));
  if (studentIds.length !== input.studentIds.length) {
    throw { code: "INVALID_STUDENT_IDS" };
  }

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  if (project.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" };
  }

  const moduleStudents = await findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id);
  const moduleStudentById = new Map(moduleStudents.map((student) => [student.id, student] as const));

  const hasStudentOutsideModule = studentIds.some((studentId) => !moduleStudentById.has(studentId));
  if (hasStudentOutsideModule) {
    throw { code: "STUDENT_NOT_IN_MODULE" };
  }

  const hasStudentAlreadyAssigned = studentIds.some((studentId) => {
    const student = moduleStudentById.get(studentId);
    return student ? student.currentTeamId !== null : false;
  });
  if (hasStudentAlreadyAssigned) {
    throw { code: "STUDENT_ALREADY_ASSIGNED" };
  }

  const team = await applyManualAllocationTeam(
    project.id,
    project.enterpriseId,
    teamName,
    studentIds,
    { draftCreatedById: staffId },
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.moduleName,
    },
    team,
  };
}