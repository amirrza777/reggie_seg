import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnterpriseOverviewSummary } from "./EnterpriseOverviewSummary";
import { useEnterpriseOverviewSummary } from "./hooks/useEnterpriseOverviewSummary";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("./hooks/useEnterpriseOverviewSummary", () => ({
  useEnterpriseOverviewSummary: vi.fn(),
}));

const useEnterpriseOverviewSummaryMock = vi.mocked(useEnterpriseOverviewSummary);

describe("EnterpriseOverviewSummary", () => {
  it("renders loading states with placeholder metric values", () => {
    useEnterpriseOverviewSummaryMock.mockReturnValue({
      overview: null,
      status: "loading",
      message: null,
      riskItems: [],
      quickHealthChecks: [],
      operationalRatios: [],
      actionQueue: [],
      priorityActionCount: 0,
      roleDistribution: [],
      setupChecklist: [],
      completedChecklistItems: 0,
      lastUpdatedLabel: null,
      priorityBanner: { tone: "success", text: "Scanning enterprise setup risks..." },
    } as ReturnType<typeof useEnterpriseOverviewSummary>);

    render(<EnterpriseOverviewSummary />);

    expect(screen.getByText("Scanning enterprise setup risks...")).toBeInTheDocument();
    expect(screen.getByText("Calculating role distribution…")).toBeInTheDocument();
    expect(screen.getByText("Evaluating enterprise risks…")).toBeInTheDocument();
    expect(screen.getByText("Calculating health checks…")).toBeInTheDocument();
    expect(screen.getByText("Building priority actions…")).toBeInTheDocument();
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument();
  });

  it("renders populated overview details, warnings, and action queue tones", () => {
    useEnterpriseOverviewSummaryMock.mockReturnValue({
      overview: {
        totals: {
          users: 150,
          activeUsers: 120,
          students: 80,
          staff: 45,
          enterpriseAdmins: 25,
          modules: 6,
          teams: 20,
          meetings: 40,
        },
        hygiene: {
          inactiveUsers: 30,
          studentsWithoutModule: 8,
          modulesWithoutStudents: 2,
        },
        trends: {
          newUsers30d: 12,
          newModules30d: 1,
        },
      },
      status: "success",
      message: "Could not refresh all counters.",
      riskItems: [{ label: "Inactive accounts to review", value: 30 }],
      quickHealthChecks: [{ label: "Active account rate", value: "80%", detail: "120/150 active" }],
      operationalRatios: [{ label: "Students / team", value: "4.0", detail: "80 students across 20 teams" }],
      actionQueue: [
        {
          id: "students-unassigned",
          label: "Assign unplaced students",
          detail: "8 students are not assigned to any module.",
          tone: "critical",
          href: "/enterprise/modules",
          cta: "Assign students",
          impact: 8,
        },
        {
          id: "inactive-accounts",
          label: "Follow up inactive accounts",
          detail: "30 users are inactive and may need access or onboarding support.",
          tone: "attention",
          href: "/staff/dashboard",
          cta: "Review analytics",
          impact: 30,
        },
        {
          id: "healthy-system",
          label: "No immediate blockers",
          detail: "Coverage, activation, and team setup currently look healthy.",
          tone: "healthy",
          href: "/enterprise/modules",
          cta: "Open modules",
          impact: 0,
        },
      ],
      priorityActionCount: 2,
      roleDistribution: [{ label: "Students", value: 80, percent: 53 }],
      setupChecklist: [
        { label: "Students assigned to modules", complete: false, pending: 8 },
        { label: "Teams set up", complete: true, pending: 0 },
      ],
      completedChecklistItems: 1,
      lastUpdatedLabel: "Apr 2, 2026, 10:00 AM",
      priorityBanner: { tone: "error", text: "Priority: Inactive accounts to review (30)." },
    } as ReturnType<typeof useEnterpriseOverviewSummary>);

    render(<EnterpriseOverviewSummary />);

    expect(screen.getByText("Priority: Inactive accounts to review (30).")).toBeInTheDocument();
    expect(screen.getByText("Could not refresh all counters.")).toBeInTheDocument();
    expect(screen.getByText("Last updated: Apr 2, 2026, 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Inactive accounts to review")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("2 priority actions generated from current setup and growth signals.")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Assign students" })).toHaveAttribute("href", "/enterprise/modules");
    expect(screen.getByRole("link", { name: "Review analytics" })).toHaveAttribute("href", "/staff/dashboard");
    expect(screen.getByRole("link", { name: "Open module management" })).toHaveAttribute("href", "/enterprise/modules");
    expect(screen.getByText("1/2 setup checks complete")).toBeInTheDocument();
    expect(screen.getByText("8 open")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows empty-state fallbacks for risks and action queue when there are no priorities", () => {
    useEnterpriseOverviewSummaryMock.mockReturnValue({
      overview: {
        totals: {
          users: 10,
          activeUsers: 10,
          students: 6,
          staff: 3,
          enterpriseAdmins: 1,
          modules: 2,
          teams: 2,
          meetings: 4,
        },
        hygiene: {
          inactiveUsers: 0,
          studentsWithoutModule: 0,
          modulesWithoutStudents: 0,
        },
        trends: {
          newUsers30d: 1,
          newModules30d: 1,
        },
      },
      status: "success",
      message: null,
      riskItems: [],
      quickHealthChecks: [{ label: "Active account rate", value: "100%", detail: "10/10 active" }],
      operationalRatios: [{ label: "Students / team", value: "3.0", detail: "6 students across 2 teams" }],
      actionQueue: [
        {
          id: "healthy-system",
          label: "No immediate blockers",
          detail: "Coverage, activation, and team setup currently look healthy.",
          tone: "healthy",
          href: "/enterprise/modules",
          cta: "Open modules",
          impact: 0,
        },
      ],
      priorityActionCount: 0,
      roleDistribution: [{ label: "Students", value: 6, percent: 60 }],
      setupChecklist: [{ label: "Students assigned to modules", complete: true, pending: 0 }],
      completedChecklistItems: 1,
      lastUpdatedLabel: null,
      priorityBanner: { tone: "success", text: "No priority risks detected." },
    } as ReturnType<typeof useEnterpriseOverviewSummary>);

    render(<EnterpriseOverviewSummary />);

    expect(screen.getByText("No open risk items.")).toBeInTheDocument();
    expect(screen.getByText("No priority actions at the moment. Keep monitoring for changes.")).toBeInTheDocument();
    expect(screen.getByText("No immediate blockers")).toBeInTheDocument();
    expect(screen.getByText("No priority risks detected.")).toBeInTheDocument();
  });
});
