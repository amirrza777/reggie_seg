import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPrismaMock, flushAsyncWork, mockSeedRuntime } from "./seed.script.shared";

describe("prisma seed script smoke", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SEED_COMPLETED_PROJECT_SCENARIO = "false";
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "12345678901234567890123456789012";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("runs end-to-end and disconnects prisma", async () => {
    const prismaMock = buildPrismaMock();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockSeedRuntime(prismaMock);
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@kcl.ac.uk";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "admin123";

    await import("../../prisma/seed/seed.ts");
    await flushAsyncWork();

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
    expect(prismaMock.staffStudentMarking.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ studentUserId: 2 }),
          expect.objectContaining({ studentUserId: 3 }),
        ]),
      }),
    );
    const rows = (prismaMock.staffStudentMarking.createMany.mock.calls[0]?.[0] as any)?.data ?? [];
    expect(rows.every((row: any) => [2, 3].includes(row.studentUserId))).toBe(true);
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
  });
});
