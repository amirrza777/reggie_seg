import { vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  prismaMock: {
    projectDeadline: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    teamAllocation: {
      findMany: vi.fn(),
    },
    moduleLead: {
      findMany: vi.fn(),
    },
    moduleTeachingAssistant: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    staffStudentMarking: {
      createMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    peerAssessment: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    peerFeedback: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  randSentenceMock: vi.fn().mockReturnValue("Consistent contributor with reliable communication."),
  configState: {
    SEED_STUDENT_MARK_MIN: 40,
    SEED_STUDENT_MARK_MAX: 90,
    SEED_STUDENT_MARK_COVERAGE: 1,
  },
}));

export const prismaMock = hoisted.prismaMock;
export const randSentenceMock = hoisted.randSentenceMock;
export const configState = hoisted.configState;

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("@ngneat/falso", () => ({
  randSentence: randSentenceMock,
}));

vi.mock("../../prisma/seed/config", () => ({
  get SEED_STUDENT_MARK_MIN() {
    return configState.SEED_STUDENT_MARK_MIN;
  },
  get SEED_STUDENT_MARK_MAX() {
    return configState.SEED_STUDENT_MARK_MAX;
  },
  get SEED_STUDENT_MARK_COVERAGE() {
    return configState.SEED_STUDENT_MARK_COVERAGE;
  },
}));

function ensureQuestionMock() {
  const m = prismaMock as typeof prismaMock & { question?: { findMany: ReturnType<typeof vi.fn> } };
  if (!m.question?.findMany) {
    m.question = { findMany: vi.fn() };
  }
}

export function resetOutcomesSeedMocks() {
  ensureQuestionMock();
  vi.clearAllMocks();
  ensureQuestionMock();
  prismaMock.projectDeadline.findMany.mockResolvedValue([]);
  prismaMock.projectDeadline.upsert.mockResolvedValue({});
  prismaMock.featureFlag.findMany.mockResolvedValue([]);
  prismaMock.featureFlag.upsert.mockResolvedValue({});
  prismaMock.teamAllocation.findMany.mockResolvedValue([]);
  prismaMock.moduleLead.findMany.mockResolvedValue([]);
  prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([]);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.staffStudentMarking.createMany.mockResolvedValue({ count: 0 });
  prismaMock.question.findMany.mockResolvedValue([]);
  prismaMock.peerAssessment.findMany.mockResolvedValue([]);
  prismaMock.peerAssessment.update.mockResolvedValue({ id: 1 });
  prismaMock.peerAssessment.create.mockResolvedValue({ id: 2 });
  prismaMock.peerFeedback.findMany.mockResolvedValue([]);
  prismaMock.peerFeedback.upsert.mockResolvedValue({});
  randSentenceMock.mockReturnValue("Consistent contributor with reliable communication.");
  configState.SEED_STUDENT_MARK_MIN = 40;
  configState.SEED_STUDENT_MARK_MAX = 90;
  configState.SEED_STUDENT_MARK_COVERAGE = 1;
}
