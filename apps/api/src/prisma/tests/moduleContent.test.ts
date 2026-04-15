import { describe, expect, it } from "vitest";
import { planModuleSeedData } from "../../../prisma/seed/catalog";

describe("planModuleSeedData", () => {
  it("returns generated content fields for every module", () => {
    const modules = planModuleSeedData("ent-1");

    expect(modules.length).toBeGreaterThan(0);

    for (const module of modules) {
      expect(module.briefText?.trim().length).toBeGreaterThan(0);
      expect(module.expectationsText?.trim().length).toBeGreaterThan(0);
      expect(module.readinessNotesText?.trim().length).toBeGreaterThan(0);
    }
  });

  it("builds parseable expectation rows", () => {
    const [firstModule] = planModuleSeedData("ent-1");

    expect(firstModule).toBeDefined();

    const expectationRows = firstModule.expectationsText?.split("\n").filter(Boolean) ?? [];

    expect(expectationRows).toHaveLength(3);

    for (const row of expectationRows) {
      const [expectation = "", target = "", owner = ""] = row.split("|").map((part) => part.trim());
      expect(expectation.length).toBeGreaterThan(0);
      expect(target.length).toBeGreaterThan(0);
      expect(owner.length).toBeGreaterThan(0);
    }
  });
});
