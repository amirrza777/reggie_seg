import { vi } from "vitest";

export type PrismaMock = {
  enterprise: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  module: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  questionnaireTemplate: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  question: { findMany: ReturnType<typeof vi.fn> };
  project: {
    createMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  team: {
    createMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  moduleLead: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  moduleTeachingAssistant: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  userModule: { createMany: ReturnType<typeof vi.fn> };
  teamAllocation: {
    createMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  meeting: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  meetingAttendance: { createMany: ReturnType<typeof vi.fn> };
  meetingParticipant: { createMany: ReturnType<typeof vi.fn> };
  meetingMinutes: { createMany: ReturnType<typeof vi.fn> };
  meetingComment: { create: ReturnType<typeof vi.fn> };
  mention: { createMany: ReturnType<typeof vi.fn> };
  peerAssessment: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  peerFeedback: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  staffStudentMarking: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  projectDeadline: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  featureFlag: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  helpTopic: { upsert: ReturnType<typeof vi.fn> };
  helpArticle: { upsert: ReturnType<typeof vi.fn> };
  helpFaqGroup: { upsert: ReturnType<typeof vi.fn> };
  helpFaq: { upsert: ReturnType<typeof vi.fn> };
  discussionPost: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  forumReaction: { createMany: ReturnType<typeof vi.fn> };
  forumStudentReport: { createMany: ReturnType<typeof vi.fn> };
  teamInvite: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  githubAccount: { upsert: ReturnType<typeof vi.fn> };
  githubRepository: { upsert: ReturnType<typeof vi.fn> };
  projectGithubRepository: { upsert: ReturnType<typeof vi.fn> };
  githubRepoSnapshot: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  githubRepoSnapshotRepoStat: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  githubRepoSnapshotUserStat: { createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  notification: { findFirst: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

type SeedRuntimeOptions = {
  enterpriseCount?: number;
};

function buildPrismaClientMock(prismaMock: PrismaMock) {
  return {
    enterprise: prismaMock.enterprise,
    user: prismaMock.user,
    module: prismaMock.module,
    questionnaireTemplate: prismaMock.questionnaireTemplate,
    question: prismaMock.question,
    project: prismaMock.project,
    team: prismaMock.team,
    moduleLead: prismaMock.moduleLead,
    moduleTeachingAssistant: prismaMock.moduleTeachingAssistant,
    userModule: prismaMock.userModule,
    teamAllocation: prismaMock.teamAllocation,
    meeting: prismaMock.meeting,
    meetingAttendance: prismaMock.meetingAttendance,
    meetingParticipant: prismaMock.meetingParticipant,
    meetingMinutes: prismaMock.meetingMinutes,
    meetingComment: prismaMock.meetingComment,
    mention: prismaMock.mention,
    peerAssessment: prismaMock.peerAssessment,
    peerFeedback: prismaMock.peerFeedback,
    staffStudentMarking: prismaMock.staffStudentMarking,
    projectDeadline: prismaMock.projectDeadline,
    featureFlag: prismaMock.featureFlag,
    helpTopic: prismaMock.helpTopic,
    helpArticle: prismaMock.helpArticle,
    helpFaqGroup: prismaMock.helpFaqGroup,
    helpFaq: prismaMock.helpFaq,
    discussionPost: prismaMock.discussionPost,
    forumReaction: prismaMock.forumReaction,
    forumStudentReport: prismaMock.forumStudentReport,
    teamInvite: prismaMock.teamInvite,
    githubAccount: prismaMock.githubAccount,
    githubRepository: prismaMock.githubRepository,
    projectGithubRepository: prismaMock.projectGithubRepository,
    githubRepoSnapshot: prismaMock.githubRepoSnapshot,
    githubRepoSnapshotRepoStat: prismaMock.githubRepoSnapshotRepoStat,
    githubRepoSnapshotUserStat: prismaMock.githubRepoSnapshotUserStat,
    notification: prismaMock.notification,
    $transaction: prismaMock.$transaction,
    $disconnect: prismaMock.$disconnect,
  };
}

export function mockSeedRuntime(prismaMock: PrismaMock, options?: SeedRuntimeOptions) {
  vi.doMock("@prisma/client", () => ({
    PrismaClient: vi.fn(() => buildPrismaClientMock(prismaMock)),
    Role: { STUDENT: "STUDENT", STAFF: "STAFF", ADMIN: "ADMIN" },
  }));
  vi.doMock("argon2", () => ({
    default: { hash: vi.fn().mockResolvedValue("hashed") },
  }));
  vi.doMock("@ngneat/falso", () => ({
    randFirstName: vi.fn().mockReturnValue("First"),
    randLastName: vi.fn().mockReturnValue("Last"),
    randSentence: vi.fn().mockReturnValue("Random generated question."),
    randParagraph: vi.fn().mockReturnValue("Random generated paragraph."),
  }));
  vi.doMock("../../prisma/seed/team-health-warning-scenario.ts", () => ({
    seedTeamHealthWarningScenario: vi.fn(async () => undefined),
  }));
  if (options?.enterpriseCount !== undefined) {
    vi.doMock("../../prisma/seed/volumes.ts", async () => {
      const actual = await vi.importActual<typeof import("../../prisma/seed/volumes.ts")>("../../prisma/seed/volumes.ts");
      return { ...actual, SEED_ENTERPRISE_COUNT: options.enterpriseCount };
    });
  }
}

export function buildPrismaMock(): PrismaMock {
  const userLookupCounts = new Map<string, number>();
  let meetingIdCounter = 200;
  let meetingCommentIdCounter = 300;
  const prismaMock = {
    enterprise: {
      findUnique: vi.fn().mockResolvedValue({ id: "ent-1" }),
      create: vi.fn().mockResolvedValue({ id: "ent-1" }),
    },
    user: {
      findUnique: vi.fn().mockImplementation((args: any) => {
        const email = args?.where?.enterpriseId_email?.email;
        if (email === "admin@kcl.ac.uk") return Promise.resolve(null);
        if (email === "github.staff@example.com" || email === "github.student@example.com") {
          const seen = userLookupCounts.get(email) ?? 0;
          userLookupCounts.set(email, seen + 1);
          return Promise.resolve(seen === 0 ? null : { id: email === "github.staff@example.com" ? 101 : 102 });
        }
        return Promise.resolve({ id: 999 });
      }),
      create: vi.fn().mockResolvedValue({ id: 999 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 1, role: "STAFF", email: "staff1@example.com", firstName: "Staff", lastName: "One" },
        { id: 2, role: "STUDENT", email: "student1@example.com", firstName: "Alice", lastName: "Smith" },
        { id: 3, role: "STUDENT", email: "student2@example.com", firstName: "Bob", lastName: "Jones" },
        { id: 4, role: "STUDENT", email: "student3@example.com", firstName: "Cara", lastName: "Ng" },
        { id: 5, role: "ADMIN", email: "admin1@example.com", firstName: "Admin", lastName: "One" },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 1, role: "STAFF" }),
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    module: {
      createMany: vi.fn().mockResolvedValue({ count: 6 }),
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 1, name: "Software Engineering Group Project" },
        { id: 2, name: "Database Systems" },
      ]),
    },
    questionnaireTemplate: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue({ id: 1, questions: [{ label: "Technical contribution" }, { label: "Communication" }] }),
      update: vi
        .fn()
        .mockResolvedValue({ id: 1, questions: [{ label: "Technical contribution" }, { label: "Communication" }] }),
    },
    question: {
      findMany: vi.fn().mockResolvedValue([
        { id: 1, label: "Technical Skills", type: "rating", configs: { min: 1, max: 5 } },
        {
          id: 2,
          label: "Communication",
          type: "multiple-choice",
          configs: { options: ["Excellent", "Good", "Needs Improvement"] },
        },
        { id: 3, label: "Teamwork", type: "slider", configs: { min: 0, max: 100, step: 5 } },
      ]),
    },
    project: {
      createMany: vi.fn().mockResolvedValue({ count: 4 }),
      create: vi.fn().mockResolvedValue({ id: 101, questionnaireTemplateId: 1 }),
      update: vi.fn().mockResolvedValue({ id: 101, questionnaireTemplateId: 1 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 1, moduleId: 1, questionnaireTemplateId: 1 },
        { id: 2, moduleId: 2, questionnaireTemplateId: 1 },
        { id: 3, moduleId: 1, questionnaireTemplateId: 1 },
        { id: 4, moduleId: 2, questionnaireTemplateId: 1 },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      findUnique: vi.fn().mockResolvedValue({ moduleId: 1 }),
    },
    team: {
      createMany: vi.fn().mockResolvedValue({ count: 4 }),
      create: vi.fn().mockResolvedValue({ id: 110 }),
      update: vi.fn().mockResolvedValue({ id: 110 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 10, projectId: 1, teamName: "Team Alpha" },
        { id: 11, projectId: 1, teamName: "Team Beta" },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 10 }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    moduleLead: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ moduleId: 1, userId: 1 }]),
    },
    moduleTeachingAssistant: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ moduleId: 1, userId: 5 }]),
    },
    userModule: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    teamAllocation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        { teamId: 10, userId: 2, user: { id: 2, role: "STUDENT" } },
        { teamId: 10, userId: 3, user: { id: 3, role: "STUDENT" } },
        { teamId: 10, userId: 5, user: { id: 5, role: "ADMIN" } },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    meeting: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([
        { id: 201, title: "Retro", date: new Date(Date.now() - 60_000) },
        { id: 202, title: "Planning", date: new Date(Date.now() + 60_000) },
      ]),
      create: vi.fn().mockImplementation(async () => ({ id: ++meetingIdCounter })),
    },
    meetingAttendance: {
      createMany: vi.fn().mockResolvedValue({ count: 12 }),
    },
    meetingParticipant: {
      createMany: vi.fn().mockResolvedValue({ count: 24 }),
    },
    meetingMinutes: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    meetingComment: {
      create: vi.fn().mockImplementation(async () => ({ id: ++meetingCommentIdCounter })),
    },
    mention: {
      createMany: vi.fn().mockResolvedValue({ count: 4 }),
    },
    peerAssessment: {
      create: vi.fn().mockResolvedValue({ id: 100 }),
      update: vi.fn().mockResolvedValue({ id: 100 }),
      upsert: vi.fn().mockResolvedValue({ id: 100 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    peerFeedback: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    staffStudentMarking: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    projectDeadline: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureFlag: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    helpTopic: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    helpArticle: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    helpFaqGroup: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    helpFaq: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    discussionPost: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 1, projectId: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    forumReaction: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
    forumStudentReport: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    teamInvite: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "invite-1" }),
    },
    githubAccount: { upsert: vi.fn().mockResolvedValue({ id: 1, login: "github-demo-staff" }) },
    githubRepository: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    projectGithubRepository: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    githubRepoSnapshot: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    githubRepoSnapshotRepoStat: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    githubRepoSnapshotUserStat: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    notification: {
      findFirst: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    $transaction: vi.fn().mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === "function") return arg(prismaMock);
      return arg;
    }),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return prismaMock;
}

export async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
