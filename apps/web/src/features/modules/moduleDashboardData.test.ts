import { describe, expect, it } from "vitest";
import { buildModuleDashboardData, formatLongDate } from "./moduleDashboardData";
import type { Module } from "./types";

describe("moduleDashboardData", () => {
  it("builds parsed dashboard data from expectations and notes (timeline from module text removed)", () => {
    const module: Module = {
      id: "101",
      code: "  CS101  ",
      title: "Software Engineering",
      teamCount: 4,
      projectCount: 2,
      briefText: "Brief line one\n\nBrief line two",
      readinessNotesText: "Ready line one\n\nReady line two",
      expectationsText: "Submit demo|Week 7|Team\n|Ignored target|Ignored owner\nRetro|Week 10|Lead",
    };

    const result = buildModuleDashboardData(module, [["CW", "25%", "Open"]]);

    expect(result.moduleCode).toBe("CS101");
    expect(result.teamCount).toBe(4);
    expect(result.projectCount).toBe(2);
    expect(result.hasLinkedProjects).toBe(true);
    expect(result.marksRows).toEqual([["CW", "25%", "Open"]]);
    expect(result.briefParagraphs).toEqual(["Brief line one", "Brief line two"]);
    expect(result.readinessParagraphs).toEqual(["Ready line one", "Ready line two"]);
    expect(result.expectationRows).toEqual([
      ["Submit demo", "Week 7", "Team"],
      ["Retro", "Week 10", "Lead"],
    ]);
    expect(result.timelineRows).toEqual([]);
  });

  it("falls back to module id-derived code and empty section defaults", () => {
    const numericIdModule: Module = { id: "7", code: "   ", title: "Numeric module" };
    const nonNumericIdModule: Module = { id: "module-alpha", title: "Alpha module" };

    const numericResult = buildModuleDashboardData(numericIdModule);
    const textResult = buildModuleDashboardData(nonNumericIdModule);

    expect(numericResult.moduleCode).toBe("MOD-7");
    expect(numericResult.hasLinkedProjects).toBe(false);
    expect(numericResult.timelineRows).toEqual([]);
    expect(numericResult.expectationRows).toEqual([]);
    expect(numericResult.briefParagraphs).toEqual([]);
    expect(numericResult.readinessParagraphs).toEqual([]);

    expect(textResult.moduleCode).toBe("module-alpha");
  });

  it("formats long dates in UTC", () => {
    const formatted = formatLongDate(new Date("2026-04-02T09:30:00.000Z"));
    expect(formatted).toContain("2026");
    expect(formatted).toContain("April");
  });
});
