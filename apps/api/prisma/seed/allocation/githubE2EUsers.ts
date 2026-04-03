import argon2 from "argon2";
import {
  SEED_GITHUB_STAFF_EMAIL,
  SEED_GITHUB_STAFF_PASSWORD,
  SEED_GITHUB_STUDENT_EMAIL,
  SEED_GITHUB_STUDENT_PASSWORD,
} from "../config";
import { withSeedLogging } from "../logging";
import { prisma } from "../prismaClient";
import type { SeedProject, SeedTeam } from "../types";

export async function seedGithubE2EUsers(enterpriseId: string, projects: SeedProject[], teams: SeedTeam[]) {
  return withSeedLogging("seedGithubE2EUsers", async () => {
    const project = projects[0];
    if (!project) return { value: undefined, rows: 0, details: "skipped (no project available)" };
    const team = teams.find((t) => t.projectId === project.id);
    if (!team) return { value: undefined, rows: 0, details: "skipped (no team for first project)" };

    const passwords = await hashGithubSeedPasswords();
    const existing = await findExistingGithubUsers(enterpriseId);
    const users = await upsertGithubUsers(enterpriseId, passwords);
    const createdAllocation = await upsertGithubStudentAllocation(team.id, users.student.id);
    const moduleWrites = await ensureGithubUsersModuleLinks(enterpriseId, project.id, users.student.id, users.staff.id);
    const createdUsers = Number(!existing.existingStaff) + Number(!existing.existingStudent);

    return {
      value: undefined,
      rows: createdUsers + createdAllocation + moduleWrites.enrollmentCreates + moduleWrites.moduleLeadCreates,
      details: `users=${createdUsers}, allocations=${createdAllocation}, enrollments=${moduleWrites.enrollmentCreates}, moduleLeads=${moduleWrites.moduleLeadCreates}`,
    };
  });
}

async function hashGithubSeedPasswords() {
  const [staffPasswordHash, studentPasswordHash] = await Promise.all([
    argon2.hash(SEED_GITHUB_STAFF_PASSWORD),
    argon2.hash(SEED_GITHUB_STUDENT_PASSWORD),
  ]);
  return { staffPasswordHash, studentPasswordHash };
}

async function findExistingGithubUsers(enterpriseId: string) {
  const [existingStaff, existingStudent] = await Promise.all([
    prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STAFF_EMAIL } },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STUDENT_EMAIL } },
      select: { id: true },
    }),
  ]);
  return { existingStaff, existingStudent };
}

async function upsertGithubUsers(enterpriseId: string, hashes: { staffPasswordHash: string; studentPasswordHash: string }) {
  const staff = await prisma.user.upsert({
    where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STAFF_EMAIL } },
    update: { firstName: "Github", lastName: "Staff", passwordHash: hashes.staffPasswordHash, role: "STAFF" },
    create: {
      enterpriseId,
      email: SEED_GITHUB_STAFF_EMAIL,
      firstName: "Github",
      lastName: "Staff",
      passwordHash: hashes.staffPasswordHash,
      role: "STAFF",
    },
    select: { id: true },
  });
  const student = await prisma.user.upsert({
    where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STUDENT_EMAIL } },
    update: { firstName: "Github", lastName: "Student", passwordHash: hashes.studentPasswordHash, role: "STUDENT" },
    create: {
      enterpriseId,
      email: SEED_GITHUB_STUDENT_EMAIL,
      firstName: "Github",
      lastName: "Student",
      passwordHash: hashes.studentPasswordHash,
      role: "STUDENT",
    },
    select: { id: true },
  });
  return { staff, student };
}

async function upsertGithubStudentAllocation(teamId: number, studentId: number) {
  const existingAllocation = await prisma.teamAllocation.findUnique({
    where: { teamId_userId: { teamId, userId: studentId } },
    select: { userId: true },
  });
  await prisma.teamAllocation.upsert({
    where: { teamId_userId: { teamId, userId: studentId } },
    update: {},
    create: { teamId, userId: studentId },
  });
  return Number(!existingAllocation);
}

async function ensureGithubUsersModuleLinks(enterpriseId: string, projectId: number, studentId: number, staffId: number) {
  const projectWithModule = await prisma.project.findUnique({
    where: { id: projectId },
    select: { moduleId: true },
  });
  if (!projectWithModule) return { enrollmentCreates: 0, moduleLeadCreates: 0 };

  const enrollments = await prisma.userModule.createMany({
    data: [
      { enterpriseId, userId: studentId, moduleId: projectWithModule.moduleId },
      { enterpriseId, userId: staffId, moduleId: projectWithModule.moduleId },
    ],
    skipDuplicates: true,
  });
  const moduleLeads = await prisma.moduleLead.createMany({
    data: [{ moduleId: projectWithModule.moduleId, userId: staffId }],
    skipDuplicates: true,
  });
  return { enrollmentCreates: enrollments.count, moduleLeadCreates: moduleLeads.count };
}
