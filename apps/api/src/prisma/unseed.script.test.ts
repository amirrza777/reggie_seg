import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PrismaUnseedMock = {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

function createUnseedMock() {
  const mock: PrismaUnseedMock = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return mock;
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("prisma unseed script", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("truncates known tables with foreign key checks toggled", async () => {
    const prismaMock = createUnseedMock();

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => prismaMock),
    }));

    await import("../../prisma/seed/unseed.ts");
    await flushAsyncWork();

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("SET FOREIGN_KEY_CHECKS = 0;");
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("SET FOREIGN_KEY_CHECKS = 1;");
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("TRUNCATE TABLE `User`;");
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("TRUNCATE TABLE `Enterprise`;");
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });

  it("ignores missing-table errors (MySQL 1146) and continues", async () => {
    const prismaMock = createUnseedMock();
    prismaMock.$executeRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes("TRUNCATE TABLE `QuestionnaireTemplate`;")) {
        const err: any = new Error("missing table");
        err.meta = { code: "1146" };
        throw err;
      }
      return undefined;
    });

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => prismaMock),
    }));

    await import("../../prisma/seed/unseed.ts");
    await flushAsyncWork();

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("TRUNCATE TABLE `QuestionnaireTemplate`;");
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledWith("SET FOREIGN_KEY_CHECKS = 1;");
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });
});
