import { describe, expect, it } from "vitest";
import { planModuleSeedData } from "../../../prisma/seed/catalog";

describe("planModuleSeedData", () => {
  it("returns generated content fields for every module", () => {
    const modules = planModuleSeedData("ent-1");

    expect(modules.length).toBeGreaterThan(0);

    for (const module of modules) {
      expect(module.briefText?.trim().length).toBeGreaterThan(0);
      expect(module.timelineText?.trim().length).toBeGreaterThan(0);
      expect(module.expectationsText?.trim().length).toBeGreaterThan(0);
      expect(module.readinessNotesText?.trim().length).toBeGreaterThan(0);
    }
  });

  it("builds parseable timeline and expectation rows", () => {
    const [firstModule] = planModuleSeedData("ent-1");

    expect(firstModule).toBeDefined();

    const timelineRows = firstModule.timelineText?.split("\n").filter(Boolean) ?? [];
    const expectationRows = firstModule.expectationsText?.split("\n").filter(Boolean) ?? [];

    expect(timelineRows.length).toBeGreaterThanOrEqual(3);
    expect(timelineRows.length).toBeLessThanOrEqual(5);
    expect(expectationRows).toHaveLength(3);

    for (const row of timelineRows) {
      const [whenRaw = "", label = "", activity = ""] = row.split("|").map((part) => part.trim());
      expect(Number.isFinite(Date.parse(whenRaw))).toBe(true);
      expect(label.length).toBeGreaterThan(0);
      expect(activity.length).toBeGreaterThan(0);
    }

    for (const row of expectationRows) {
      const [expectation = "", target = "", owner = ""] = row.split("|").map((part) => part.trim());
      expect(expectation.length).toBeGreaterThan(0);
      expect(target.length).toBeGreaterThan(0);
      expect(owner.length).toBeGreaterThan(0);
    }
  });
});
