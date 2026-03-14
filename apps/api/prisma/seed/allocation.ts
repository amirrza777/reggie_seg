import argon2 from "argon2";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedModule, SeedProject, SeedTeam, SeedUser } from "./types";

export async function seedModuleLeads(users: SeedUser[], modules: SeedModule[]) {
  return withSeedLogging("seedModuleLeads", async () => {
    const staff = users.filter((u) => u.role === "STAFF" || u.role === "ADMIN");
    if (staff.length === 0 || modules.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no staff/modules)",
      };
    }

    const data: { moduleId: number; userId: number }[] = [];
    for (let index = 0; index < modules.length; index += 1) {
      const module = modules[index];
      const staffMember = staff[index % staff.length];
      if (!module || !staffMember) continue;
      data.push({ moduleId: module.id, userId: staffMember.id });
    }

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
    const students = users.filter((u) => u.role === "STUDENT");
    if (students.length === 0 || modules.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no students/modules)",
      };
    }

    const data = students.flatMap((s) =>
      modules.map((m) => ({
        enterpriseId,
        userId: s.id,
        moduleId: m.id,
      }))
    );

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
    const students = users.filter((u) => u.role === "STUDENT");
    if (students.length === 0 || teams.length === 0) {
      return {
        value: undefined,
        rows: 0,
        details: "skipped (no students/teams)",
      };
    }

    const data: { userId: number; teamId: number }[] = [];
    const sortedTeams = [...teams].sort((left, right) => left.id - right.id);
    for (let index = 0; index < students.length; index += 1) {
      const student = students[index];
      const team = sortedTeams[index % sortedTeams.length];
      if (!student || !team) continue;
      data.push({ userId: student.id, teamId: team.id });
    }

    const created = await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
    return {
      value: undefined,
      rows: created.count,
      details: `allocations attempted=${data.length}`,
    };
  });
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

    const staffEmail = (process.env.SEED_GITHUB_STAFF_EMAIL || "github.staff@example.com").toLowerCase();
    const staffPassword = process.env.SEED_GITHUB_STAFF_PASSWORD || "Password123!";
    const studentEmail = (process.env.SEED_GITHUB_STUDENT_EMAIL || "github.student@example.com").toLowerCase();
    const studentPassword = process.env.SEED_GITHUB_STUDENT_PASSWORD || "Password123!";

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
