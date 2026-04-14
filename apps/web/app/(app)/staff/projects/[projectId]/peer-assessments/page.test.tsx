import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffProjectPeerAssessmentOverview, getStaffTeamDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import StaffProjectPeerAssessmentsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title }: { title: string }) => <div data-testid="placeholder">{title}</div>,
}));

vi.mock("@/shared/ui/progress/ProgressCardGrid", () => ({
  ProgressCardGrid: ({
    items,
    getHref,
  }: {
    items: Array<{ id: number | null; teamName: string }>;
    getHref: (item: { id: number | null; teamName: string }) => string | undefined;
  }) => (
    <div data-testid="progress-grid" data-count={items.length} data-first-href={String(getHref(items[0]) ?? "")} />
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectPeerAssessmentOverview: vi.fn(),
  getStaffTeamDeadline: vi.fn(),
}));

const getOverviewMock = vi.mocked(getStaffProjectPeerAssessmentOverview);
const getStaffTeamDeadlineMock = vi.mocked(getStaffTeamDeadline);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("StaffProjectPeerAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 99, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffTeamDeadlineMock.mockResolvedValue({
      effectiveDeadline: null,
    } as Awaited<ReturnType<typeof getStaffTeamDeadline>>);
    getOverviewMock.mockResolvedValue({
      project: { id: 22, name: "Project 22" },
      questionnaireTemplate: null,
      canManageProjectSettings: false,
      hasSubmittedPeerAssessments: false,
      teams: [],
    } as any);
  });

  it("renders no-template and empty-team states", async () => {
    const page = await StaffProjectPeerAssessmentsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(getOverviewMock).toHaveBeenCalledWith(22);
    expect(screen.getByTestId("placeholder")).toHaveTextContent("Project 22 — peer assessments");
    expect(screen.getByText("No questionnaire selected")).toBeInTheDocument();
    expect(screen.getByText("Only the module lead can change the template.")).toBeInTheDocument();
    expect(screen.getByText("No active teams are currently set up for this project.")).toBeInTheDocument();
  });

  it("renders linked template and disables change when submissions exist", async () => {
    getOverviewMock.mockResolvedValueOnce({
      project: { id: 22, name: "Project 22" },
      questionnaireTemplate: { id: 91, templateName: "Peer Q" },
      canManageProjectSettings: true,
      hasSubmittedPeerAssessments: true,
      teams: [{ id: 58, teamName: "Team 58" }],
    } as any);

    const page = await StaffProjectPeerAssessmentsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByRole("link", { name: "Peer Q" })).toHaveAttribute("href", "/staff/questionnaires/91");
    expect(screen.getByRole("button", { name: "Change template" })).toBeDisabled();
    expect(screen.getByText("Locked after peer assessments have been submitted.")).toBeInTheDocument();
    expect(screen.getByTestId("progress-grid")).toHaveAttribute("data-first-href", "/staff/projects/22/teams/58/peer-assessment");
  });

  it("renders enabled template change link and handles null team ids", async () => {
    getOverviewMock.mockResolvedValueOnce({
      project: { id: 22, name: "Project 22" },
      questionnaireTemplate: { id: 91, templateName: "Peer Q" },
      canManageProjectSettings: true,
      hasSubmittedPeerAssessments: false,
      teams: [{ id: null, teamName: "Unassigned Team" }],
    } as any);

    const page = await StaffProjectPeerAssessmentsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByRole("link", { name: "Change template" })).toHaveAttribute(
      "href",
      "/staff/projects/22/manage",
    );
    expect(screen.getByTestId("progress-grid")).toHaveAttribute("data-first-href", "");
  });
});

