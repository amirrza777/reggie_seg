import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    teamInvite: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teamAllocation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../shared/db.js", () => ({
  prisma: mocks.prisma,
}));

export function setupTeamAllocationRepoTestDefaults() {
  vi.clearAllMocks();
}

export const prisma = mocks.prisma as any;
