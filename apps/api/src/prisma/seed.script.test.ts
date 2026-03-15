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
  questionnaireTemplate: { upsert: ReturnType<typeof vi.fn> };
  question: { findMany: ReturnType<typeof vi.fn> };
  project: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  team: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  moduleLead: { createMany: ReturnType<typeof vi.fn> };
  userModule: { createMany: ReturnType<typeof vi.fn> };
  teamAllocation: {
    createMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  peerAssessment: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  peerFeedback: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  projectDeadline: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  featureFlag: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  $disconnect: ReturnType<typeof vi.fn>;
};

function buildPrismaMock(): PrismaMock {
  return {
    enterprise: {
      findUnique: vi.fn().mockResolvedValue({ id: "ent-1" }),
      create: vi.fn().mockResolvedValue({ id: "ent-1" }),
    },
    user: {
      findUnique: vi.fn().mockImplementation((args: any) => {
        const email = args?.where?.enterpriseId_email?.email;
        if (email === "admin@kcl.ac.uk" || email === "github.staff@example.com" || email === "github.student@example.com") {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: 999 });
      }),
      create: vi.fn().mockResolvedValue({ id: 999 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ id: 1, role: "STAFF", email: "staff1@example.com" }, { id: 2, role: "STUDENT", email: "student1@example.com" }]),
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
      upsert: vi
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
      findMany: vi.fn().mockResolvedValue([
        { id: 10, projectId: 1, teamName: "Team Alpha" },
        { id: 11, projectId: 1, teamName: "Team Beta" },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 10 }),
    },
    moduleLead: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userModule: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    teamAllocation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        { user: { id: 1 } },
        { user: { id: 2 } },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    peerAssessment: {
      upsert: vi.fn().mockResolvedValue({ id: 100 }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    peerFeedback: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    projectDeadline: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureFlag: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
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
        userModule: prismaMock.userModule,
        teamAllocation: prismaMock.teamAllocation,
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
        projectDeadline: prismaMock.projectDeadline,
        featureFlag: prismaMock.featureFlag,
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
    }));

    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@kcl.ac.uk";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "admin123";

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

    expect(prismaMock.user.createMany).toHaveBeenCalled();
    expect(prismaMock.module.createMany).toHaveBeenCalled();
    expect(prismaMock.projectDeadline.upsert).toHaveBeenCalled();
    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(3);
    expect(prismaMock.$disconnect).toHaveBeenCalled();
    expect(logSpy).toHaveBeenLastCalledWith(expect.stringContaining("Seed users ready across 1 enterprise(s). Default password"));
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
        userModule: prismaMock.userModule,
        teamAllocation: prismaMock.teamAllocation,
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
        projectDeadline: prismaMock.projectDeadline,
        featureFlag: prismaMock.featureFlag,
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
        project: prismaMock.project,
        team: prismaMock.team,
        moduleLead: prismaMock.moduleLead,
        userModule: prismaMock.userModule,
        teamAllocation: prismaMock.teamAllocation,
        peerAssessment: prismaMock.peerAssessment,
        peerFeedback: prismaMock.peerFeedback,
        projectDeadline: prismaMock.projectDeadline,
        featureFlag: prismaMock.featureFlag,
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
    expect(prismaMock.user.createMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.module.createMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(6);
    expect(logSpy).toHaveBeenLastCalledWith(expect.stringContaining("Seed users ready across 2 enterprise(s). Default password"));
  });
});
