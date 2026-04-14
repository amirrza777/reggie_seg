import { describe, expect, it } from "vitest";
import { chartDashboardStyles } from "./GithubRepoChartsDashboard.styles";

describe("chartDashboardStyles", () => {
  it("defines chart and insight layout styles", () => {
    expect(chartDashboardStyles.chartSection.borderTop).toBe("1px solid var(--border)");
    expect(chartDashboardStyles.chartGrid.gridTemplateColumns).toContain("repeat(12");
    expect(chartDashboardStyles.chartColHalf.gridColumn).toBe("span 6");
    expect(chartDashboardStyles.insightCard).toMatchObject({
      borderRadius: 10,
      background: "var(--surface)",
    });
  });
});
