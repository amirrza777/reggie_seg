import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStaffProjectPeerAssessmentOverview,
  getStaffTeamDeadline,
} from "@/features/projects/api/client";
import { buildStaffPeerAssessmentDeadlineDisplay } from "@/features/staff/projects/lib/staffPeerAssessmentDeadlineDisplay";
import { getCurrentUser } from "@/shared/auth/session";
import StaffProjectPeerAssessmentsPage from "./page";
import { redirect } from "next/navigation";

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

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/ui/progress/ProgressCardGrid", () => ({
  ProgressCardGrid: ({
    items,
    getHref,
  }: {
    items: Array<{ id: number | null; teamName: string; deadlineDetail?: ReactNode }>;
    getHref: (item: { id: number | null; teamName: string }) => string | undefined;
  }) => (
    <div
      data-testid="progress-grid"
      data-count={items.length}
      data-first-href={String(getHref(items[0]) ?? "")}
      data-deadline-rendered={String(items.every((item) => item.deadlineDetail != null))}
    />
  ),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectPeerAssessmentOverview: vi.fn(),
  getStaffTeamDeadline: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffPeerAssessmentDeadlineRow", () => ({
  StaffPeerAssessmentDeadlineRow: ({ display }: { display: unknown }) => (
    <span data-testid="deadline-row">{display === null ? "none" : "has-display"}</span>
  ),
}));

vi.mock("@/features/staff/projects/lib/staffPeerAssessmentDeadlineDisplay", () => ({
  buildStaffPeerAssessmentDeadlineDisplay: vi.fn(() => ({
    label: "formatted",
  })),
}));

const getOverviewMock = vi.mocked(getStaffProjectPeerAssessmentOverview);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffTeamDeadlineMock = vi.mocked(getStaffTeamDeadline);
const buildDeadlineDisplayMock = vi.mocked(buildStaffPeerAssessmentDeadlineDisplay);
const redirectMock = vi.mocked(redirect);

describe("StaffProjectPeerAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 11 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getOverviewMock.mockResolvedValue({
      project: { id: 22, name: "Project 22" },
      questionnaireTemplate: null,
      canManageProjectSettings: false,
      hasSubmittedPeerAssessments: false,
      teams: [],
    } as any);
    getStaffTeamDeadlineMock.mockResolvedValue({
      effectiveDeadline: { assessmentDueDate: "2099-01-01T10:00:00.000Z" },
    } as Awaited<ReturnType<typeof getStaffTeamDeadline>>);
  });

  it("redirects to login when user is missing", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    await expect(
      StaffProjectPeerAssessmentsPage({
        params: Promise.resolve({ projectId: "22" }),
      }),
    ).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(getOverviewMock).not.toHaveBeenCalled();
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
    expect(getStaffTeamDeadlineMock).not.toHaveBeenCalled();
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
    expect(getStaffTeamDeadlineMock).toHaveBeenCalledWith(11, 22, 58);
    expect(buildDeadlineDisplayMock).toHaveBeenCalled();
  });

  it("renders enabled template change link and handles null team ids and deadline failures", async () => {
    getOverviewMock.mockResolvedValueOnce({
      project: { id: 22, name: "Project 22" },
      questionnaireTemplate: { id: 91, templateName: "Peer Q" },
      canManageProjectSettings: true,
      hasSubmittedPeerAssessments: false,
      teams: [
        { id: null, teamName: "Unassigned Team" },
        { id: 40, teamName: "Team 40" },
      ],
    } as any);
    getStaffTeamDeadlineMock
      .mockRejectedValueOnce(new Error("missing team id"))
      .mockResolvedValueOnce({
        effectiveDeadline: { assessmentDueDate: "2099-01-01T10:00:00.000Z" },
      } as Awaited<ReturnType<typeof getStaffTeamDeadline>>);

    const page = await StaffProjectPeerAssessmentsPage({
      params: Promise.resolve({ projectId: "22" }),
    });
    render(page);

    expect(screen.getByRole("link", { name: "Change template" })).toHaveAttribute(
      "href",
      "/staff/projects/22/manage",
    );
    expect(screen.getByTestId("progress-grid")).toHaveAttribute("data-first-href", "");
    expect(screen.getByTestId("progress-grid")).toHaveAttribute("data-count", "2");
    expect(getStaffTeamDeadlineMock).toHaveBeenNthCalledWith(1, 11, 22, null);
    expect(getStaffTeamDeadlineMock).toHaveBeenNthCalledWith(2, 11, 22, 40);
  });
});
