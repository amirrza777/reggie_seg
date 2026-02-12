import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await seedAdminUser();
  const users = await seedUsers();
  const modules = await seedModules();
  const templates = await seedQuestionnaireTemplates();
  const projects = await seedProjects(modules, templates);
  const teams = await seedTeams(projects);
  await seedModuleLeads(users, modules);
  await seedStudentEnrollments(users, modules);
  await seedTeamAllocations(users, teams);
  await seedProjectDeadlines();
  await seedPeerAssessments(users, projects, teams, templates);
}

type SeedUser = { id: number; isStaff: boolean };
type SeedModule = { id: number };
type SeedTemplate = { id: number };
type SeedProject = { id: number };
type SeedTeam = { id: number; projectId: number };

async function seedAdminUser() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isStaff: true,
      isAdmin: true,
    },
  });
}

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
  {
    firstName: 'Frank',
    lastName: 'Student',
    email: 'frank.student@example.com',
    passwordHash: 'dev-hash',
    isStaff: false,
  },
  {
    firstName: 'Grace',
    lastName: 'Student',
    email: 'grace.student@example.com',
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

const projectData = [
  { name: 'Small Group Project', moduleIndex: 0 },
  { name: 'Large Group Project', moduleIndex: 0 },
  { name: 'Data Project', moduleIndex: 2 },
  { name: 'Database Project', moduleIndex: 1 },
];

const teamData = [
  { teamName: 'Team Alpha', projectIndex: 0 },
  { teamName: 'Team Beta', projectIndex: 0 },
  { teamName: 'Team Beta', projectIndex: 1 },
  { teamName: 'Team Gamma', projectIndex: 2 },
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

async function seedQuestionnaireTemplates(): Promise<SeedTemplate[]> {
  // Create a default questionnaire template with sample questions.
  // Get a staff user to own the templates
  const staffUser = await prisma.user.findFirst({
    where: { isStaff: true },
  });
  
  if (!staffUser) return [];

  const templateName = 'Default Peer Assessment Template';
  
  const template = await prisma.questionnaireTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      templateName,
      ownerId: staffUser.id,
      questions: {
        create: [
          {
            label: 'Technical Skills',
            type: 'text',
            order: 1,
          },
          {
            label: 'Communication',
            type: 'text',
            order: 2,
          },
          {
            label: 'Teamwork',
            type: 'text',
            order: 3,
          },
        ],
      },
    },
    include: { questions: true },
  });

  return [{ id: template.id }];
}

async function seedProjects(modules: SeedModule[], templates: SeedTemplate[]): Promise<SeedProject[]> {
  // Create projects tied to modules.
  if (modules.length === 0 || templates.length === 0) return [];
  const fallbackModule = modules[0];
  const defaultTemplate = templates[0];
  if (!fallbackModule || !defaultTemplate) return [];

  const data = projectData.map((project) => {
    const module = modules[project.moduleIndex] ?? fallbackModule;
    return {
      name: project.name,
      moduleId: module.id,
      questionnaireTemplateId: defaultTemplate.id,
    };
  });

  await prisma.project.createMany({
    data,
    skipDuplicates: true,
  });

  const projects = await prisma.project.findMany({
    select: { id: true },
    where: { name: { in: projectData.map((p) => p.name) } },
  });

  return projects.map((p: { id: number }) => ({ id: p.id }));
}

async function seedTeams(projects: SeedProject[]): Promise<SeedTeam[]> {
  // Create teams tied to projects.
  if (projects.length === 0) return [];
  const fallbackProject = projects[0];
  if (!fallbackProject) return [];

  const data = teamData.map((team) => {
    const project = projects[team.projectIndex] ?? fallbackProject;
    return {
      teamName: team.teamName,
      projectId: project.id,
    };
  });

  await prisma.team.createMany({
    data,
    skipDuplicates: true,
  });

  const teams = await prisma.team.findMany({
    select: { id: true, projectId: true, teamName: true },
    where: { teamName: { in: teamData.map((t) => t.teamName) } },
  });

  return teams.map((t: { id: number; projectId: number }) => ({
    id: t.id,
    projectId: t.projectId,
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

  const team1 = teams.find(t => t.projectId === 1);
  if (!team1) return;

  const data: { userId: number; teamId: number }[] = [];
  
  for (const student of students) {
    data.push({ userId: student.id, teamId: team1.id });
  }

  await prisma.teamAllocation.createMany({ data, skipDuplicates: true });
}

async function seedProjectDeadlines() {
  // Create deadlines for project 1
  const now = new Date();
  const taskOpen = new Date(now);
  const taskDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const assessmentOpen = new Date(taskDue.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after task due
  const assessmentDue = new Date(assessmentOpen.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
  const feedbackOpen = new Date(assessmentDue.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after
  const feedbackDue = new Date(feedbackOpen.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

  await prisma.projectDeadline.upsert({
    where: { projectId: 1 },
    update: {},
    create: {
      projectId: 1,
      taskOpenDate: taskOpen,
      taskDueDate: taskDue,
      assessmentOpenDate: assessmentOpen,
      assessmentDueDate: assessmentDue,
      feedbackOpenDate: feedbackOpen,
      feedbackDueDate: feedbackDue,
    },
  });
}

async function seedPeerAssessments(
  projects: SeedProject[],
  teams: SeedTeam[],
  templates: SeedTemplate[]
) {
  if (projects.length === 0 || templates.length === 0) return;

  const project1 = projects[0];
  const team1 = teams.find(t => t.projectId === project1.id);
  const template1 = templates[0];

  if (!project1 || !team1 || !template1) return;

  const teamMembers = await prisma.teamAllocation.findMany({
    where: { teamId: team1.id },
    include: { user: true },
  });

  if (teamMembers.length < 2) return;

  const teamMemberIds = teamMembers.map(tm => tm.user.id);

  for (let i = 0; i < teamMemberIds.length; i++) {
    const reviewerId = teamMemberIds[i];
    const revieweeId = teamMemberIds[(i + 1) % teamMemberIds.length];

    if (!reviewerId || !revieweeId) continue;

    await prisma.peerAssessment.upsert({
      where: {
        projectId_teamId_reviewerUserId_revieweeUserId: {
          projectId: project1.id,
          teamId: team1.id,
          reviewerUserId: reviewerId,
          revieweeUserId: revieweeId,
        },
      },
      update: {},
      create: {
        projectId: project1.id,
        teamId: team1.id,
        reviewerUserId: reviewerId,
        revieweeUserId: revieweeId,
        templateId: template1.id,
        answersJson: {
          'Technical Skills': `${reviewerId % 2 === 0 ? 'Excellent' : 'Good'} technical abilities`,
          'Communication': `${reviewerId % 3 === 0 ? 'Clear' : 'Could improve'} communication`,
          'Teamwork': `${reviewerId % 4 === 0 ? 'Strong' : 'Adequate'} teamwork skills`,
        },
      },
    });
  }
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
