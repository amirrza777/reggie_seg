import { sendEmail } from "../../shared/email.js";
import { assertProjectMutableForWrites } from "../../shared/projectWriteGuard.js";
import { planRandomTeams } from "./randomizer.js";
import {
  applyManualAllocationTeam,
  applyRandomAllocationPlan,
  findModuleStudentsForManualAllocation,
  findProjectTeamSummaries,
  findStaffScopedProject,
  findVacantModuleStudentsForProject,
} from "./repo.js";

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

export type ManualAllocationWorkspace = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: "AVAILABLE" | "ALREADY_IN_TEAM";
    currentTeam: {
      id: number;
      teamName: string;
    } | null;
  }>;
  counts: {
    totalStudents: number;
    availableStudents: number;
    alreadyInTeamStudents: number;
  };
};

export type ManualAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  team: {
    id: number;
    teamName: string;
    memberCount: number;
  };
};

function resolveRandomAllocationTeamNames(teamCount: number, teamNames?: string[]): string[] {
  if (!teamNames) {
    return Array.from({ length: teamCount }, (_, index) => `Random Team ${index + 1}`);
  }

  if (teamNames.length !== teamCount) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const normalized = teamNames.map((teamName) => teamName.trim());
  if (normalized.some((teamName) => teamName.length === 0)) {
    throw { code: "INVALID_TEAM_NAMES" };
  }

  const lowered = normalized.map((teamName) => teamName.toLowerCase());
  if (new Set(lowered).size !== lowered.length) {
    throw { code: "DUPLICATE_TEAM_NAMES" };
  }

  return normalized;
}

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

/** Returns the manual allocation workspace for project. */
export async function getManualAllocationWorkspaceForProject(
  staffId: number,
  projectId: number,
  options?: { query?: string | null },
): Promise<ManualAllocationWorkspace> {
  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const [students, existingTeams] = await Promise.all([
    normalizedQuery
      ? findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id, {
          query: normalizedQuery,
        })
      : findModuleStudentsForManualAllocation(project.enterpriseId, project.moduleId, project.id),
    findProjectTeamSummaries(project.id),
  ]);

  const studentsWithStatus = students.map((student) => {
    const isAssigned = student.currentTeamId !== null;
    const currentTeam =
      isAssigned && student.currentTeamName
        ? {
            id: student.currentTeamId,
            teamName: student.currentTeamName,
          }
        : null;

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      status: isAssigned ? "ALREADY_IN_TEAM" : "AVAILABLE",
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

/** Applies the manual allocation for project. */
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
  assertProjectMutableForWrites(project);

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

  const selectedStudents = studentIds.map((studentId) => {
    const student = moduleStudentById.get(studentId)!;
    return {
      firstName: student.firstName,
      email: student.email,
    };
  });

  const team = await applyManualAllocationTeam(project.id, project.enterpriseId, teamName, studentIds);
  await notifyStudentsAboutManualAllocation(project.name, team.teamName, selectedStudents);

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

/** Previews the random allocation for project. */
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
  assertProjectMutableForWrites(project);

  const students = await findVacantModuleStudentsForProject(project.enterpriseId, project.moduleId, projectId);
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

/** Applies the random allocation for project. */
export async function applyRandomAllocationForProject(
  staffId: number,
  projectId: number,
  teamCount: number,
  options: { seed?: number; teamNames?: string[] } = {},
): Promise<RandomAllocationApplied> {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw { code: "INVALID_TEAM_COUNT" };
  }

  const teamNames = resolveRandomAllocationTeamNames(teamCount, options.teamNames);

  const project = await findStaffScopedProject(staffId, projectId);
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" };
  }
  assertProjectMutableForWrites(project);

  const students = await findVacantModuleStudentsForProject(project.enterpriseId, project.moduleId, projectId);
  if (students.length === 0) {
    throw { code: "NO_VACANT_STUDENTS" };
  }
  if (teamCount > students.length) {
    throw { code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" };
  }

  const plannedTeams = planRandomTeams(students, teamCount, { seed: options.seed });
  const appliedTeams = await applyRandomAllocationPlan(projectId, project.enterpriseId, plannedTeams, { teamNames });
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
