import argon2 from "argon2";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedUser } from "./types";

export async function seedModuleLeads(users: SeedUser[], modules: SeedModule[]) {
  const staff = users.filter((u) => u.role === "STAFF" || u.role === "ADMIN");
  if (staff.length === 0 || modules.length === 0) return;

  const data: { moduleId: number; userId: number }[] = [];
  for (let index = 0; index < modules.length; index += 1) {
    const module = modules[index];
    const staffMember = staff[index % staff.length];
    if (!module || !staffMember) continue;
    data.push({ moduleId: module.id, userId: staffMember.id });
  }

  await prisma.moduleLead.createMany({ data, skipDuplicates: true });
}

export async function seedStudentEnrollments(enterpriseId: string, users: SeedUser[], modules: SeedModule[]) {
  const students = users.filter((u) => u.role === "STUDENT");
  if (students.length === 0 || modules.length === 0) return;

  const data = students.flatMap((s) =>
    modules.map((m) => ({
      enterpriseId,
      userId: s.id,
      moduleId: m.id,
    }))
  );

  await prisma.userModule.createMany({ data, skipDuplicates: true });
}

export async function seedTeamAllocations(users: SeedUser[], teams: SeedTeam[]) {
  const students = users.filter((u) => u.role === "STUDENT");
  if (students.length === 0 || teams.length === 0) return;

  const team1 = teams.find((t) => t.projectId === 1);
  if (!team1) return;

  const data: { userId: number; teamId: number }[] = [];
  for (const student of students) {
    data.push({ userId: student.id, teamId: team1.id });
  }

  await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
}

export async function seedAdminTeamAllocation(enterpriseId: string) {
  const admin = await prisma.user.findUnique({
    where: { enterpriseId_email: { enterpriseId, email: "admin@kcl.ac.uk" } },
    select: { id: true },
  });
  if (!admin) return;

  const firstProject = await prisma.project.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
  if (!firstProject) return;

  const team = await prisma.team.findFirst({
    where: { projectId: firstProject.id },
    select: { id: true },
  });
  if (!team) return;

  await prisma.teamAllocation.upsert({
    where: { teamId_userId: { teamId: team.id, userId: admin.id } },
    update: {},
    create: { teamId: team.id, userId: admin.id },
  });
}

export async function seedGithubE2EUsers(enterpriseId: string, projects: SeedProject[], teams: SeedTeam[]) {
  const project = projects[0];
  if (!project) return;

  const team = teams.find((t) => t.projectId === project.id);
  if (!team) return;

  const staffEmail = (process.env.SEED_GITHUB_STAFF_EMAIL || "github.staff@example.com").toLowerCase();
  const staffPassword = process.env.SEED_GITHUB_STAFF_PASSWORD || "Password123!";
  const studentEmail = (process.env.SEED_GITHUB_STUDENT_EMAIL || "github.student@example.com").toLowerCase();
  const studentPassword = process.env.SEED_GITHUB_STUDENT_PASSWORD || "Password123!";

  const [staffPasswordHash, studentPasswordHash] = await Promise.all([
    argon2.hash(staffPassword),
    argon2.hash(studentPassword),
  ]);

  const staff = await prisma.user.upsert({
    where: { enterpriseId_email: { enterpriseId, email: staffEmail } },
    update: {
      firstName: "Github",
      lastName: "Staff",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
    create: {
      enterpriseId,
      email: staffEmail,
      firstName: "Github",
      lastName: "Staff",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
    select: { id: true },
  });

  const student = await prisma.user.upsert({
    where: { enterpriseId_email: { enterpriseId, email: studentEmail } },
    update: {
      firstName: "Github",
      lastName: "Student",
      passwordHash: studentPasswordHash,
      role: "STUDENT",
    },
    create: {
      enterpriseId,
      email: studentEmail,
      firstName: "Github",
      lastName: "Student",
      passwordHash: studentPasswordHash,
      role: "STUDENT",
    },
    select: { id: true },
  });

  await prisma.teamAllocation.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: student.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: student.id,
    },
  });

  const projectWithModule = await prisma.project.findUnique({
    where: { id: project.id },
    select: { moduleId: true },
  });

  if (projectWithModule) {
    await prisma.userModule.createMany({
      data: [
        { enterpriseId, userId: student.id, moduleId: projectWithModule.moduleId },
        { enterpriseId, userId: staff.id, moduleId: projectWithModule.moduleId },
      ],
      skipDuplicates: true,
    });

    await prisma.moduleLead.createMany({
      data: [{ moduleId: projectWithModule.moduleId, userId: staff.id }],
      skipDuplicates: true,
    });
  }
}
