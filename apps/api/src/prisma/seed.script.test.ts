import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PrismaMock = {
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
  module: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
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
  moduleLead: { createMany: ReturnType<typeof vi.fn> };
  moduleTeachingAssistant: { createMany: ReturnType<typeof vi.fn> };
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

function buildPrismaMock(): PrismaMock {
  const userLookupCounts = new Map<string, number>();
  let meetingIdCounter = 200;
  const prismaMock = {
    enterprise: {
      findUnique: vi.fn().mockResolvedValue({ id: "ent-1" }),
      create: vi.fn().mockResolvedValue({ id: "ent-1" }),
    },
    user: {
      findUnique: vi.fn().mockImplementation((args: any) => {
        const email = args?.where?.enterpriseId_email?.email;
        if (email === "admin@kcl.ac.uk") {
          return Promise.resolve(null);
        }
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
        { id: 1, role: "STAFF", email: "staff1@example.com" },
        { id: 2, role: "STUDENT", email: "student1@example.com" },
        { id: 3, role: "STUDENT", email: "student2@example.com" },
        { id: 4, role: "STUDENT", email: "student3@example.com" },
        { id: 5, role: "ADMIN", email: "admin1@example.com" },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 1, role: "STAFF" }),
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    module: {
      createMany: vi.fn().mockResolvedValue({ count: 6 }),
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
        { id: 1, questionnaireTemplateId: 1 },
        { id: 2, questionnaireTemplateId: 1 },
        { id: 3, questionnaireTemplateId: 1 },
        { id: 4, questionnaireTemplateId: 1 },
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
    },
    moduleTeachingAssistant: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userModule: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    teamAllocation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        { teamId: 10, userId: 2, user: { id: 2 } },
        { teamId: 10, userId: 5, user: { id: 5 } },
        { teamId: 11, userId: 3, user: { id: 3 } },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    meeting: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([
        { id: 201, title: "Retro", date: new Date(Date.now() - 60_000) },
        { id: 202, title: "Planning", date: new Date(Date.now() + 60_000) },
      ]),
      create: vi.fn().mockImplementation(async () => {
        meetingIdCounter += 1;
        return { id: meetingIdCounter };
      }),
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
    projectDeadline: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureFlag: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    helpTopic: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    helpArticle: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    helpFaqGroup: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    helpFaq: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    discussionPost: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 1, projectId: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    forumReaction: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    forumStudentReport: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    teamInvite: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "invite-1" }),
    },
    githubAccount: {
      upsert: vi.fn().mockResolvedValue({ id: 1, login: "github-demo-staff" }),
    },
    githubRepository: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    projectGithubRepository: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
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

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("prisma seed script", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SEED_COMPLETED_PROJECT_SCENARIO = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("runs end-to-end and disconnects prisma", async () => {
    const prismaMock = buildPrismaMock();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({
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
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
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
      })),
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

    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@kcl.ac.uk";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "admin123";

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.user.createMany).toHaveBeenCalled();
    expect(prismaMock.user.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ email: "staff.assessment@example.com", role: "STAFF" }),
          expect.objectContaining({ email: "entp_admin.assessment@example.com", role: "ENTERPRISE_ADMIN" }),
          expect.objectContaining({ email: "global_admin.assessment@example.com", role: "ADMIN" }),
        ]),
      }),
    );
    expect(prismaMock.module.createMany).toHaveBeenCalled();
    expect(prismaMock.moduleTeachingAssistant.createMany).toHaveBeenCalled();
    expect(prismaMock.teamInvite.upsert).toHaveBeenCalled();
    expect(prismaMock.githubAccount.upsert).toHaveBeenCalled();
    expect(prismaMock.projectGithubRepository.upsert).toHaveBeenCalled();
    expect(prismaMock.forumReaction.createMany).toHaveBeenCalled();
    expect(prismaMock.forumStudentReport.createMany).toHaveBeenCalled();
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
    expect(prismaMock.module.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: "Software Engineering Group Project",
            code: "MOD-1",
            joinCode: expect.any(String),
            briefText: expect.stringContaining("Software Engineering Group Project"),
            timelineText: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.* \| .* \| .+/),
            expectationsText: expect.stringMatching(/^.+ \| .+ \| .+/),
            readinessNotesText: expect.stringContaining("Software Engineering Group Project"),
          }),
        ]),
      }),
    );
    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalled();
    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(3);
    expect(prismaMock.$disconnect).toHaveBeenCalled();
    expect(logSpy.mock.calls.some(([message]) => String(message).includes("Seed users ready across 1 enterprise(s). Default password"))).toBe(true);
    expect(logSpy.mock.calls.some(([message]) => String(message).includes("Seed profile: dev"))).toBe(true);
  });

  it("skips bootstrap admin creation when admin env is missing", async () => {
    const prismaMock = buildPrismaMock();
    prismaMock.user.findUnique = vi.fn().mockResolvedValue({ id: 999 });

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({
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
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
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
      })),
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

    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });

  it("repeats the seed flow for each configured enterprise", async () => {
    const prismaMock = buildPrismaMock();
    prismaMock.enterprise.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.enterprise.create = vi
      .fn()
      .mockResolvedValueOnce({ id: "ent-1" })
      .mockResolvedValueOnce({ id: "ent-2" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({
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
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
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
      })),
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
    vi.doMock("../../prisma/seed/volumes.ts", async () => {
      const actual = await vi.importActual<typeof import("../../prisma/seed/volumes.ts")>("../../prisma/seed/volumes.ts");
      return {
        ...actual,
        SEED_ENTERPRISE_COUNT: 2,
      };
    });

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.enterprise.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.createMany).toHaveBeenCalled();
    expect(prismaMock.module.createMany).toHaveBeenCalled();
    expect(prismaMock.module.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            briefText: expect.any(String),
            timelineText: expect.any(String),
            expectationsText: expect.any(String),
            readinessNotesText: expect.any(String),
          }),
        ]),
      }),
    );
    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(6);
    expect(logSpy.mock.calls.some(([message]) => String(message).includes("Seed users ready across 2 enterprise(s). Default password"))).toBe(true);
  });
});
