import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await seedUsers();
  const modules = await seedModules();
  const teams = await seedTeams(modules);
  await seedModuleLeads(users, modules);
  await seedStudentEnrollments(users, modules);
  await seedTeamAllocations(users, teams);
}

type SeedUser = { id: number; isStaff: boolean };
type SeedModule = { id: number };
type SeedTeam = { id: number; moduleId: number };

const userData = [
  {
    firstName: 'Alice',
    lastName: 'Lecturer',
    email: 'alice.lecturer@example.com',
    passwordHash: 'dev-hash',
    isStaff: true,
  },
  {
    firstName: 'Ben',
    lastName: 'Tutor',
    email: 'ben.tutor@example.com',
    passwordHash: 'dev-hash',
    isStaff: true,
  },
  {
    firstName: 'Cara',
    lastName: 'Student',
    email: 'cara.student@example.com',
    passwordHash: 'dev-hash',
    isStaff: false,
  },
  {
    firstName: 'Dan',
    lastName: 'Student',
    email: 'dan.student@example.com',
    passwordHash: 'dev-hash',
    isStaff: false,
  },
  {
    firstName: 'Eve',
    lastName: 'Student',
    email: 'eve.student@example.com',
    passwordHash: 'dev-hash',
    isStaff: false,
  },
];

const moduleData = [{ name: 'Software Engineering Group Project' }, 
                    { name: 'Database Systems' }, 
                    { name: 'Data Structures'}, 
                    { name: 'Foundations of Computing'}, 
                    { name: 'Elementary Logic with Applications'},
                    { name: 'Internet Systems'}
                   ];

const teamData = [
  { teamName: 'Team Alpha', moduleIndex: 0 },
  { teamName: 'Team Beta', moduleIndex: 0 },
  { teamName: 'Team Gamma', moduleIndex: 1 },
];

async function seedUsers(): Promise<SeedUser[]> {
  // Create a small set of staff and student users with a placeholder password hash.
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

async function seedTeams(modules: SeedModule[]): Promise<SeedTeam[]> {
  // Create teams tied to modules (moduleId is required on Team).
  if (modules.length === 0) return [];
  const fallbackModule = modules[0];
  if (!fallbackModule) return [];

  const data = teamData.map((team) => {
    const module = modules[team.moduleIndex] ?? fallbackModule;
    return {
      teamName: team.teamName,
      moduleId: module.id,
    };
  });

  await prisma.team.createMany({
    data,
    skipDuplicates: true,
  });

  const teams = await prisma.team.findMany({
    select: { id: true, moduleId: true, teamName: true },
    where: { teamName: { in: teamData.map((t) => t.teamName) } },
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
  // Enroll all students into all modules.
  const students = users.filter((u) => !u.isStaff);
  if (students.length === 0 || modules.length === 0) return;

  const data = students.flatMap((s) =>
    modules.map((m) => ({
      userId: s.id,
      moduleId: m.id,
    }))
  );

  await prisma.userModule.createMany({ data, skipDuplicates: true });
}

async function seedTeamAllocations(users: SeedUser[], teams: SeedTeam[]) {
  // Assign students to teams that match their module.
  const students = users.filter((u) => !u.isStaff);
  if (students.length === 0 || teams.length === 0) return;

  const data: { userId: number; teamId: number }[] = [];
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const team = teams[index % teams.length];
    if (!student || !team) continue;
    data.push({ userId: student.id, teamId: team.id });
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
