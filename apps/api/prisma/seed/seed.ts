import { PrismaClient } from '@prisma/client';
import { randFirstName, randLastName, randWord } from '@ngneat/falso';

const prisma = new PrismaClient();

const seedUserCount = 50;

async function main() {
  const users = await seedUsers(seedUserCount);
  const modules = await seedModules();
  const teams = await seedTeams(modules, users);
  await seedModuleLeads(users, modules);
  await seedStudentEnrollments(users, modules);
  await seedTeamAllocations(users, modules, teams);
}

type SeedUser = { id: number; isStaff: boolean };
type SeedModule = { id: number };
type SeedTeam = { id: number; moduleId: number };

const moduleData = [{ name: 'Software Engineering Group Project' }, 
                    { name: 'Database Systems' }, 
                    { name: 'Data Structures'}, 
                    { name: 'Foundations of Computing'}, 
                    { name: 'Elementary Logic with Applications'},
                    { name: 'Internet Systems'}
                   ];

async function seedUsers(count: number): Promise<SeedUser[]> {
  // Create staff users plus a generated set of student users.
  const staffCount = Math.max(1, Math.floor(count / 50));
  const studentCount = Math.max(0, count - staffCount);

  const staffData = Array.from({ length: staffCount }, (_, index) => {
    const firstName = randFirstName();
    const lastName = randLastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@staff.example.com`;

    return {
      firstName,
      lastName,
      email,
      passwordHash: 'dev-hash',
      isStaff: true,
    };
  });

  const studentData = Array.from({ length: studentCount }, (_, index) => {
    const firstName = randFirstName();
    const lastName = randLastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.com`;

    return {
      firstName,
      lastName,
      email,
      passwordHash: 'dev-hash',
      isStaff: false,
    };
  });

  const userData = [...staffData, ...studentData];
  await prisma.user.createMany({
    data: userData,
    skipDuplicates: true,
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, isStaff: true, email: true },
    where: {
      email: {
        in: userData.map((u) => u.email),
      },
    },
  });

  return allUsers.map((u: { id: number; isStaff: boolean }) => ({
    id: u.id,
    isStaff: u.isStaff,
  }));
}

async function seedModules(): Promise<SeedModule[]> {
  // Create a couple of modules for students to enroll in and for teams to belong to.
  await prisma.module.createMany({
    data: moduleData,
    skipDuplicates: true,
  });

  const modules = await prisma.module.findMany({
    select: { id: true, name: true },
    where: { name: { in: moduleData.map((m) => m.name) } },
  });

  return modules.map((m: { id: number }) => ({ id: m.id }));
}

async function seedTeams(modules: SeedModule[], users: SeedUser[]): Promise<SeedTeam[]> {
  // Create teams tied to modules (moduleId is required on Team).
  if (modules.length === 0) return [];
  const fallbackModule = modules[0];
  if (!fallbackModule) return [];

  const studentCount = users.filter((u) => !u.isStaff).length;
  if (studentCount === 0) return [];

  const teamsPerModule = Math.ceil(studentCount / 5);
  const data = modules.flatMap((module) =>
    Array.from({ length: teamsPerModule }, () => ({
      teamName: `Team-${randWord()}`,
      moduleId: module.id,
    }))
  );

  await prisma.team.createMany({
    data,
    skipDuplicates: true,
  });

  const teams = await prisma.team.findMany({
    select: { id: true, moduleId: true, teamName: true },
    where: { teamName: { in: data.map((t) => t.teamName) } },
    orderBy: { id: 'asc' },
  });

  return teams.map((t: { id: number; moduleId: number }) => ({
    id: t.id,
    moduleId: t.moduleId,
  }));
}

async function seedModuleLeads(users: SeedUser[], modules: SeedModule[]) {
  // Assign the first two staff users as module leads.
  const staff = users.filter((u) => u.isStaff);
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

async function seedStudentEnrollments(users: SeedUser[], modules: SeedModule[]) {
  // Enroll each student into 3 random modules.
  const students = users.filter((u) => !u.isStaff);
  if (students.length === 0 || modules.length === 0) return;

  const moduleIds = modules.map((m) => m.id);
  const maxPerStudent = Math.min(3, moduleIds.length);
  const data: { userId: number; moduleId: number }[] = [];

  for (const student of students) {
    const shuffled = [...moduleIds].sort(() => Math.random() - 0.5);
    for (let index = 0; index < maxPerStudent; index += 1) {
      const moduleId = shuffled[index];
      if (!moduleId) continue;
      data.push({ userId: student.id, moduleId });
    }
  }

  await prisma.userModule.createMany({ data, skipDuplicates: true });
}

async function seedTeamAllocations(
  users: SeedUser[],
  modules: SeedModule[],
  teams: SeedTeam[]
) {
  // Assign students to teams grouped by module (5 students per team per module).
  const students = users.filter((u) => !u.isStaff);
  if (students.length === 0 || teams.length === 0 || modules.length === 0) return;

  const data: { userId: number; teamId: number }[] = [];
  for (const module of modules) {
    const moduleTeams = teams.filter((team) => team.moduleId === module.id);
    if (moduleTeams.length === 0) continue;

    for (let index = 0; index < students.length; index += 1) {
      const student = students[index];
      const team = moduleTeams[Math.floor(index / 5)];
      if (!student || !team) continue;
      data.push({ userId: student.id, teamId: team.id });
    }
  }

  await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    throw err;
  });
