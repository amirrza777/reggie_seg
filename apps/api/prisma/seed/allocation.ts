import argon2 from "argon2";
import { SEED_GITHUB_STAFF_EMAIL, SEED_GITHUB_STAFF_PASSWORD, SEED_GITHUB_STUDENT_EMAIL, SEED_GITHUB_STUDENT_PASSWORD } from "./config";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedUser, SeedUsersByRole } from "./types";

export async function seedModuleLeads(users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedModuleLeads", async () => {
    const staff = buildUsersByRole(users).adminOrStaff;
    if (staff.length === 0 || modules.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no staff/modules)",
      };
    }

    const data = buildModuleLeadSeedData(staff, modules);

    const created = await prisma.moduleLead.createMany({ data, skipDuplicates: true });
    return {
      value: undefined,
      rows: created.count,
      details: `assignments attempted=${data.length}`,
    };
  });
}

export async function seedStudentEnrollments(enterpriseId: string, users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedStudentEnrollments", async () => {
    const students = buildUsersByRole(users).students;
    if (students.length === 0 || modules.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no students/modules)",
      };
    }

    const data = buildStudentEnrollmentSeedData(enterpriseId, students, modules);

    const created = await prisma.userModule.createMany({ data, skipDuplicates: true });
    return {
      value: undefined,
      rows: created.count,
      details: `enrollments attempted=${data.length}`,
    };
  });
}

export async function seedTeamAllocations(users: SeedUser[], teams: SeedTeam[]) {
  return withSeedLogging("seedTeamAllocations", async () => {
    const students = buildUsersByRole(users).students;
    if (students.length === 0 || teams.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no students/teams)",
      };
    }

    const data = buildTeamAllocationSeedData(students, teams);

    const created = await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
    return {
      value: undefined,
      rows: created.count,
      details: `allocations attempted=${data.length}`,
    };
  });
}

export function buildUsersByRole(users: SeedUser[]): SeedUsersByRole {
  return {
    adminOrStaff: users.filter(
      (user) => user.role === "STAFF" || user.role === "ENTERPRISE_ADMIN" || user.role === "ADMIN"
    ),
    students: users.filter((user) => user.role === "STUDENT"),
  };
}

function buildModuleLeadSeedData(staff: SeedUser[], modules: SeedModule[]) {
  const data: { moduleId: number; userId: number }[] = [];
  for (let index = 0; index < modules.length; index += 1) {
    const module = modules[index];
    const staffMember = staff[index % staff.length];
    if (!module || !staffMember) continue;
    data.push({ moduleId: module.id, userId: staffMember.id });
  }
  return data;
}

function buildStudentEnrollmentSeedData(enterpriseId: string, students: SeedUser[], modules: SeedModule[]) {
  return students.flatMap((student) =>
    modules.map((module) => ({
      enterpriseId,
      userId: student.id,
      moduleId: module.id,
    }))
  );
}

function buildTeamAllocationSeedData(students: SeedUser[], teams: SeedTeam[]) {
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

export async function seedAdminTeamAllocation(enterpriseId: string) {
  return withSeedLogging("seedAdminTeamAllocation", async () => {
    const admin = await prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: "admin@kcl.ac.uk" } },
      select: { id: true },
    });
    if (!admin) {
      return { value: undefined, rows: 0, details: "skipped (admin user not found)" };
    }

    const firstProject = await prisma.project.findFirst({
      where: { module: { enterpriseId } },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (!firstProject) {
      return { value: undefined, rows: 0, details: "skipped (no project found)" };
    }

    const team = await prisma.team.findFirst({
      where: { enterpriseId, projectId: firstProject.id },
      select: { id: true },
    });
    if (!team) {
      return { value: undefined, rows: 0, details: "skipped (no team for first project)" };
    }

    const existing = await prisma.teamAllocation.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: admin.id } },
      select: { userId: true },
    });

    await prisma.teamAllocation.upsert({
      where: { teamId_userId: { teamId: team.id, userId: admin.id } },
      update: {},
      create: { teamId: team.id, userId: admin.id },
    });

    return {
      value: undefined,
      rows: existing ? 0 : 1,
      details: existing ? "allocation already exists" : "admin allocated to first team",
    };
  });
}

export async function seedGithubE2EUsers(enterpriseId: string, projects: SeedProject[], teams: SeedTeam[]) {
  return withSeedLogging("seedGithubE2EUsers", async () => {
    const project = projects[0];
    if (!project) {
      return { value: undefined, rows: 0, details: "skipped (no project available)" };
    }

    const team = teams.find((t) => t.projectId === project.id);
    if (!team) {
      return { value: undefined, rows: 0, details: "skipped (no team for first project)" };
    }

    const staffEmail = SEED_GITHUB_STAFF_EMAIL;
    const staffPassword = SEED_GITHUB_STAFF_PASSWORD;
    const studentEmail = SEED_GITHUB_STUDENT_EMAIL;
    const studentPassword = SEED_GITHUB_STUDENT_PASSWORD;

    const [staffPasswordHash, studentPasswordHash] = await Promise.all([
      argon2.hash(staffPassword),
      argon2.hash(studentPassword),
    ]);

    const [existingStaff, existingStudent] = await Promise.all([
      prisma.user.findUnique({
        where: { enterpriseId_email: { enterpriseId, email: staffEmail } },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { enterpriseId_email: { enterpriseId, email: studentEmail } },
        select: { id: true },
      }),
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

    const existingAllocation = await prisma.teamAllocation.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: student.id,
        },
      },
      select: { userId: true },
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

    let enrollmentCreates = 0;
    let moduleLeadCreates = 0;
    if (projectWithModule) {
      const enrollments = await prisma.userModule.createMany({
        data: [
          { enterpriseId, userId: student.id, moduleId: projectWithModule.moduleId },
          { enterpriseId, userId: staff.id, moduleId: projectWithModule.moduleId },
        ],
        skipDuplicates: true,
      });
      enrollmentCreates = enrollments.count;

      const moduleLeads = await prisma.moduleLead.createMany({
        data: [{ moduleId: projectWithModule.moduleId, userId: staff.id }],
        skipDuplicates: true,
      });
      moduleLeadCreates = moduleLeads.count;
    }

    const createdUsers = Number(!existingStaff) + Number(!existingStudent);
    const createdAllocation = Number(!existingAllocation);
    return {
      value: undefined,
      rows: createdUsers + createdAllocation + enrollmentCreates + moduleLeadCreates,
      details: `users=${createdUsers}, allocations=${createdAllocation}, enrollments=${enrollmentCreates}, moduleLeads=${moduleLeadCreates}`,
    };
  });
}
