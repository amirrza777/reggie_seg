import { describe, expect, it } from "vitest";
import type { ProjectDeadline } from "@/features/projects/types";
import type { CumulativeByWeekPoint } from "./cumulativeByWeek";
import {
  buildSummaryChartData,
  getSummaryWeekRange,
  normalizeProjectDeadline,
} from "./summaryChartData";

describe("summaryChartData", () => {
  it("normalizeProjectDeadline trims and slices dates", () => {
    const d = {
      taskOpenDate: "  2025-01-15T00:00:00Z  ",
      taskDueDate: "  2025-06-01  ",
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    } as ProjectDeadline;
    const n = normalizeProjectDeadline(d);
    expect(n.deadlineStart).toBe("2025-01-15");
    expect(n.deadlineEnd).toBe("2025-06-01");
    expect(n.projectStartTime).toBe(new Date("2025-01-15T12:00:00Z").getTime());
    expect(n.projectEndTime).toBe(new Date("2025-06-01T12:00:00Z").getTime());
  });

  it("normalizeProjectDeadline handles null deadline", () => {
    const n = normalizeProjectDeadline(null);
    expect(n.deadlineStart).toBeUndefined();
    expect(n.deadlineEnd).toBeUndefined();
    expect(n.projectStartTime).toBeNull();
    expect(n.projectEndTime).toBeNull();
  });

  it("getSummaryWeekRange merges action keys with deadline bounds", () => {
    const [min, max] = getSummaryWeekRange(
      { "2025-03-01": [], "2025-04-01": [] },
      "2025-02-01",
      "2025-05-01",
    );
    expect(min <= max).toBe(true);
  });

  it("getSummaryWeekRange swaps when action range is inverted vs deadlines", () => {
    const [min, max] = getSummaryWeekRange(
      { "2025-06-01": [] },
      "2025-12-01",
      "2025-01-01",
    );
    expect(min <= max).toBe(true);
  });

  it("getSummaryWeekRange picks earliest vs deadlineStart and latest vs deadlineEnd when both exist", () => {
    const [minA] = getSummaryWeekRange({ "2025-06-01": [] }, "2025-01-01", "2025-12-31");
    expect(minA).toBe("2025-01-01");

    const [minB] = getSummaryWeekRange({ "2025-01-15": [] }, "2025-06-01", "2025-12-31");
    expect(minB).toBe("2025-01-15");

    const [, maxBeforeDeadline] = getSummaryWeekRange({ "2025-02-01": [] }, "2025-01-01", "2025-03-01");
    expect(maxBeforeDeadline).toBe("2025-03-01");

    const [, maxPastDeadline] = getSummaryWeekRange({ "2025-08-01": [] }, "2025-01-01", "2025-03-01");
    expect(maxPastDeadline).toBe("2025-08-01");
  });

  it("getSummaryWeekRange uses today when no actions and no deadlines", () => {
    const today = new Date().toISOString().slice(0, 10);
    const [min, max] = getSummaryWeekRange({}, undefined, undefined);
    expect(min).toBe(today);
    expect(max).toBe(today);
  });

  it("buildSummaryChartData maps points and empty chart domain", () => {
    const points: CumulativeByWeekPoint[] = [
      {
        weekKey: "2025-06-09",
        weekLabel: "Week 1",
        weekNumber: 1,
        weekStartDateKey: "2025-06-09",
        weekEndDateKey: "2025-06-15",
        total: 5,
        completed: 2,
      },
    ];
    const { chartData, dateRangeSubtitle, xAxisDomain } = buildSummaryChartData(points);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].total).toBe(5);
    expect(dateRangeSubtitle).toContain("2025");
    expect(xAxisDomain[1]).toBeGreaterThanOrEqual(xAxisDomain[0]);
  });

  it("buildSummaryChartData handles empty cumulative series", () => {
    const { chartData, dateRangeSubtitle, xAxisDomain } = buildSummaryChartData([]);
    expect(chartData).toEqual([]);
    expect(dateRangeSubtitle).toBeNull();
    expect(xAxisDomain).toEqual([0, 0]);
  });
});
