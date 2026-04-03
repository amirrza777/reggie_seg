import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedUser } from "./types";
import { seedAdminTeamAllocation } from "./allocation/adminAllocation";
import { seedAssessmentStudentModuleCoverage } from "./allocation/assessmentCoverage";
import { seedGithubE2EUsers } from "./allocation/githubE2EUsers";
import {
  buildUsersByRole,
  planModuleLeadSeedData,
  planModuleTeachingAssistantSeedData,
  planStudentEnrollmentSeedData,
  planTeamAllocationSeedData,
} from "./allocation/planners";

export {
  buildUsersByRole,
  planModuleLeadSeedData,
  planModuleTeachingAssistantSeedData,
  planStudentEnrollmentSeedData,
  planTeamAllocationSeedData,
  seedAdminTeamAllocation,
  seedAssessmentStudentModuleCoverage,
  seedGithubE2EUsers,
};

export async function seedModuleLeads(users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedModuleLeads", async () => {
    const staff = buildUsersByRole(users).adminOrStaff;
    if (staff.length === 0 || modules.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no staff/modules)" };
    }
    const data = planModuleLeadSeedData(staff, modules);
    const created = await prisma.moduleLead.createMany({ data, skipDuplicates: true });
    return { value: undefined, rows: created.count, details: `assignments attempted=${data.length}` };
  });
}

export async function seedStudentEnrollments(enterpriseId: string, users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedStudentEnrollments", async () => {
    const students = buildUsersByRole(users).students;
    if (students.length === 0 || modules.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no students/modules)" };
    }
    const data = planStudentEnrollmentSeedData(enterpriseId, students, modules);
    const created = await prisma.userModule.createMany({ data, skipDuplicates: true });
    return { value: undefined, rows: created.count, details: `enrollments attempted=${data.length}` };
  });
}

export async function seedModuleTeachingAssistants(users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedModuleTeachingAssistants", async () => {
    const staff = buildUsersByRole(users).adminOrStaff;
    if (staff.length === 0 || modules.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no staff/modules)" };
    }
    const leadAssignments = planModuleLeadSeedData(staff, modules);
    const data = planModuleTeachingAssistantSeedData(staff, modules, leadAssignments);
    if (data.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no TA assignments planned)" };
    }
    const created = await prisma.moduleTeachingAssistant.createMany({ data, skipDuplicates: true });
    return { value: undefined, rows: created.count, details: `assignments attempted=${data.length}` };
  });
}

export async function seedTeamAllocations(users: SeedUser[], teams: SeedTeam[]) {
  return withSeedLogging("seedTeamAllocations", async () => {
    const students = buildUsersByRole(users).students;
    if (students.length === 0 || teams.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no students/teams)" };
    }
    const data = planTeamAllocationSeedData(students, teams);
    const created = await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
    return { value: undefined, rows: created.count, details: `allocations attempted=${data.length}` };
  });
}
