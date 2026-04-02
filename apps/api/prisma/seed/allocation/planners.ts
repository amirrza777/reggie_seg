import type { SeedModule, SeedTeam, SeedUser, SeedUsersByRole } from "../types";
import { SEED_TAS_PER_MODULE } from "../volumes";

export function buildUsersByRole(users: SeedUser[]): SeedUsersByRole {
  return {
    adminOrStaff: users.filter(
      (user) => user.role === "STAFF" || user.role === "ENTERPRISE_ADMIN" || user.role === "ADMIN",
    ),
    students: users.filter((user) => user.role === "STUDENT"),
  };
}

export function planModuleLeadSeedData(staff: SeedUser[], modules: SeedModule[]) {
  const data: { moduleId: number; userId: number }[] = [];
  for (let index = 0; index < modules.length; index += 1) {
    const module = modules[index];
    const staffMember = staff[index % staff.length];
    if (!module || !staffMember) continue;
    data.push({ moduleId: module.id, userId: staffMember.id });
  }
  return data;
}

export function planStudentEnrollmentSeedData(enterpriseId: string, students: SeedUser[], modules: SeedModule[]) {
  return students.flatMap((student) =>
    modules.map((module) => ({
      enterpriseId,
      userId: student.id,
      moduleId: module.id,
    })),
  );
}

export function planTeamAllocationSeedData(students: SeedUser[], teams: SeedTeam[]) {
  const data: { userId: number; teamId: number }[] = [];
  const sortedTeams = [...teams].sort((left, right) => left.id - right.id);
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const team = sortedTeams[index % sortedTeams.length];
    if (!student || !team) continue;
    data.push({ userId: student.id, teamId: team.id });
  }
  return data;
}

export function planModuleTeachingAssistantSeedData(
  staff: SeedUser[],
  modules: SeedModule[],
  leadAssignments: { moduleId: number; userId: number }[],
) {
  const leadByModuleId = new Map(leadAssignments.map((assignment) => [assignment.moduleId, assignment.userId]));
  const data: { moduleId: number; userId: number }[] = [];
  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
    const module = modules[moduleIndex];
    if (!module) continue;
    const leadUserId = leadByModuleId.get(module.id);
    const preferredStaff = staff.filter((candidate) => candidate.id !== leadUserId);
    const candidatePool = preferredStaff.length > 0 ? preferredStaff : staff;
    for (let taIndex = 0; taIndex < SEED_TAS_PER_MODULE; taIndex += 1) {
      const assignee = candidatePool[(moduleIndex + taIndex) % candidatePool.length];
      if (!assignee) continue;
      data.push({ moduleId: module.id, userId: assignee.id });
    }
  }
  return data;
}
