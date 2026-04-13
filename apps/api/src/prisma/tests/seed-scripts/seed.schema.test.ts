import { describe, expect, it } from "vitest";
import { assertSeedCleanupCoverage, getSeedCleanupManifest } from "../../prisma/seed/schema";

describe("seed cleanup manifest", () => {
  it("derives cleanup coverage from prisma metadata", () => {
    const manifest = getSeedCleanupManifest();
    const tables = manifest.map((entry) => entry.tableName);

    expect(tables).toContain("HelpTopic");
    expect(tables).toContain("Notification");
    expect(tables).toContain("ForumReaction");
    expect(tables).toContain("ModuleTeachingAssistant");
  });

  it("orders child tables before parent tables", () => {
    const manifest = getSeedCleanupManifest();
    const tableOrder = manifest.map((entry) => entry.tableName);

    expect(tableOrder.indexOf("MeetingAttendance")).toBeLessThan(tableOrder.indexOf("Meeting"));
    expect(tableOrder.indexOf("HelpFaq")).toBeLessThan(tableOrder.indexOf("HelpFaqGroup"));
    expect(tableOrder.indexOf("HelpFaqGroup")).toBeLessThan(tableOrder.indexOf("HelpTopic"));
  });

  it("fails loudly when a prisma delegate is not covered", () => {
    expect(() =>
      assertSeedCleanupCoverage({
        $disconnect: () => undefined,
        imaginarySeedModel: {},
      }),
    ).toThrow(/imaginarySeedModel/);
  });
});
