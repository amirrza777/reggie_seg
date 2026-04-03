import { describe, expect, it } from "vitest";
import type { EnterpriseOverview } from "../types";
import { buildEnterpriseOverviewSummaryView } from "./enterpriseOverviewSummary.logic";

const riskHeavyOverview: EnterpriseOverview = {
  totals: {
    users: 100,
    activeUsers: 70,
    students: 50,
    staff: 30,
    enterpriseAdmins: 0,
    modules: 4,
    teams: 0,
    meetings: 12,
  },
  hygiene: {
    inactiveUsers: 30,
    studentsWithoutModule: 10,
    modulesWithoutStudents: 2,
  },
  trends: {
    newUsers30d: 12,
    newModules30d: 0,
  },
};

const healthyOverview: EnterpriseOverview = {
  totals: {
    users: 20,
    activeUsers: 20,
    students: 12,
    staff: 6,
    enterpriseAdmins: 2,
    modules: 3,
    teams: 4,
    meetings: 10,
  },
  hygiene: {
    inactiveUsers: 0,
    studentsWithoutModule: 0,
    modulesWithoutStudents: 0,
  },
  trends: {
    newUsers30d: 4,
    newModules30d: 2,
  },
};

describe("buildEnterpriseOverviewSummaryView", () => {
  it("builds ranked risks/actions and derived health values for risk-heavy overviews", () => {
    const loadedAt = new Date("2026-03-22T14:30:00.000Z");
    const view = buildEnterpriseOverviewSummaryView(riskHeavyOverview, "success", null, loadedAt);

    expect(view.riskItems.map((item) => item.label)).toEqual([
      "Inactive accounts to review",
      "Students not assigned to a module",
      "Modules with no students",
    ]);
    expect(view.riskItems.map((item) => item.value)).toEqual([30, 10, 2]);

    expect(view.quickHealthChecks).toEqual([
      { label: "Active account rate", value: "70%", detail: "70/100 active" },
      { label: "Student module coverage", value: "80%", detail: "40/50 assigned" },
      { label: "Module utilization", value: "50%", detail: "2/4 with students" },
    ]);
    expect(view.operationalRatios).toEqual([
      {
        label: "Students / active module",
        value: "20.0",
        detail: "40 students across 2 active modules",
      },
      {
        label: "Students / team",
        value: "0.0",
        detail: "50 students across 0 teams",
      },
      {
        label: "Active users / enterprise admin",
        value: "0.0",
        detail: "70 active users across 0 enterprise admins",
      },
    ]);

    expect(view.actionQueue.map((item) => item.id)).toEqual([
      "admin-ownership",
      "teams-missing",
      "students-unassigned",
      "inactive-accounts",
      "activation-rate",
    ]);
    expect(view.priorityActionCount).toBe(5);
    expect(view.roleDistribution).toEqual([
      { label: "Students", value: 50, percent: 63 },
      { label: "Staff", value: 30, percent: 38 },
      { label: "Enterprise admins", value: 0, percent: 0 },
    ]);
    expect(view.setupChecklist).toEqual([
      { label: "Students assigned to modules", complete: false, pending: 10 },
      { label: "Modules have enrolled students", complete: false, pending: 2 },
      { label: "All accounts are active", complete: false, pending: 30 },
      { label: "Teams set up", complete: false, pending: 1 },
    ]);
    expect(view.completedChecklistItems).toBe(0);
    expect(view.lastUpdatedLabel).toBe(loadedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    expect(view.priorityBanner).toEqual({
      tone: "error",
      text: "Priority: Inactive accounts to review (30). Plus 2 additional risk areas.",
    });
  });

  it("returns healthy defaults when there are no risks or action blockers", () => {
    const view = buildEnterpriseOverviewSummaryView(healthyOverview, "success", null, null);

    expect(view.riskItems).toEqual([]);
    expect(view.actionQueue).toEqual([
      {
        id: "healthy-system",
        label: "No immediate blockers",
        detail: "Coverage, activation, and team setup currently look healthy.",
        tone: "healthy",
        href: "/enterprise/modules",
        cta: "Open modules",
        impact: 0,
      },
    ]);
    expect(view.priorityActionCount).toBe(0);
    expect(view.completedChecklistItems).toBe(4);
    expect(view.priorityBanner).toEqual({
      tone: "success",
      text: "No priority risks detected. Enterprise setup looks healthy.",
    });
  });

  it("returns loading/error banner variants and fallback empty structures", () => {
    const loadingView = buildEnterpriseOverviewSummaryView(null, "loading", null, null);
    expect(loadingView.riskItems).toEqual([]);
    expect(loadingView.priorityBanner).toEqual({
      tone: "success",
      text: "Scanning enterprise setup risks...",
    });

    const errorView = buildEnterpriseOverviewSummaryView(null, "error", null, null);
    expect(errorView.priorityBanner).toEqual({
      tone: "error",
      text: "Could not evaluate enterprise setup risks.",
    });
    expect(errorView.quickHealthChecks).toEqual([]);
    expect(errorView.operationalRatios).toEqual([]);
    expect(errorView.roleDistribution).toEqual([]);
    expect(errorView.setupChecklist).toEqual([]);
  });
});
