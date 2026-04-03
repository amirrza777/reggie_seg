import { afterEach, describe, expect, it, vi } from "vitest";
import { buildModuleDashboardData, formatLongDate } from "./moduleDashboardData";
import type { Module } from "./types";

describe("moduleDashboardData", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds parsed dashboard data from timeline, expectations, and notes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const module: Module = {
      id: "101",
      code: "  CS101  ",
      title: "Software Engineering",
      teamCount: 4,
      projectCount: 2,
      briefText: "Brief line one\n\nBrief line two",
      readinessNotesText: "Ready line one\n\nReady line two",
      expectationsText: "Submit demo|Week 7|Team\n|Ignored target|Ignored owner\nRetro|Week 10|Lead",
      timelineText: [
        "2025-12-30T00:00:00.000Z|Project A|Review",
        "2026-01-05T00:00:00.000Z|Project B|Plan",
        "2026-03-15T00:00:00.000Z|Project C|Kickoff",
        "not-a-date|Project D|TBD",
      ].join("\n"),
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

    expect(result.timelineRows).toHaveLength(4);
    expect(result.timelineRows[0]).toMatchObject({
      whenTone: "past",
      whenLabel: "2 days ago",
      projectName: "Project A",
      activity: "Review",
    });
    expect(result.timelineRows[1]).toMatchObject({
      whenTone: "soon",
      whenLabel: "4 days from now",
      projectName: "Project B",
      activity: "Plan",
    });
    expect(result.timelineRows[2].whenTone).toBe("upcoming");
    expect(result.timelineRows[2].whenLabel).toMatch(/about 2 months from now/i);
    expect(result.timelineRows[3]).toMatchObject({
      whenTone: "upcoming",
      whenLabel: "Scheduled",
      dateLabel: "not-a-date",
      projectName: "Project D",
      activity: "TBD",
    });
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

  it("covers relative timeline labels for singular day/month/year ranges", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const module: Module = {
      id: "12",
      title: "Timeline module",
      timelineText: [
        "2026-01-02T00:00:00.000Z|A|One day ahead",
        "2026-02-15T00:00:00.000Z|B|Month-range ahead",
        "2027-01-01T00:00:00.000Z|C|One year ahead",
        "2025-01-01T00:00:00.000Z|D|One year ago",
        "||",
      ].join("\n"),
    };

    const result = buildModuleDashboardData(module);
    const labels = result.timelineRows.map((row) => row.whenLabel);

    expect(labels).toContain("1 day from now");
    expect(labels).toContain("about 2 months from now");
    expect(labels).toContain("about 1 year from now");
    expect(labels).toContain("about 1 year ago");
    expect(result.timelineRows).toHaveLength(4);
  });
});
