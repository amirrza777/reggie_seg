import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import StaffProjectMeetingsPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/loadStaffProjectTeams", () => ({
  loadStaffProjectTeamsForPage: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffProjectSectionNav", () => ({
  StaffProjectSectionNav: ({ projectId }: { projectId: string }) => <div data-testid="staff-project-nav">{projectId}</div>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const loadStaffProjectTeamsForPageMock = vi.mocked(loadStaffProjectTeamsForPage);

describe("StaffProjectMeetingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, role: "STUDENT", isStaff: false } as any);

    await expect(
      StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "9" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid-project message", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "ADMIN", isStaff: false } as any);
    loadStaffProjectTeamsForPageMock.mockResolvedValue({ status: "invalid_project_id" });

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "abc" }) });
    render(page);

    expect(screen.getByText("Invalid project ID.")).toBeInTheDocument();
  });

  it("renders loader error messages", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "ADMIN", isStaff: false } as any);
    loadStaffProjectTeamsForPageMock.mockResolvedValue({
      status: "error",
      message: "Failed to load project meetings.",
    } as any);

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByText("Failed to load project meetings.")).toBeInTheDocument();
  });

  it("renders team meeting links when project data loads", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    loadStaffProjectTeamsForPageMock.mockResolvedValue({
      status: "ok",
      numericProjectId: 15,
      data: {
        project: { id: 15, name: "Capstone", moduleId: 5, moduleName: "Internet Systems" },
        teams: [
          { id: 31, teamName: "Team Alpha", allocations: [{ userId: 1 }, { userId: 2 }] },
          { id: 32, teamName: "Team Beta", allocations: [{ userId: 3 }] },
        ],
      },
    } as any);

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    expect(screen.getByTestId("staff-project-nav")).toHaveTextContent("15");
    expect(screen.getByRole("heading", { name: "Capstone" })).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Open team meetings" });
    expect(links[0]).toHaveAttribute(
      "href",
      "/staff/projects/15/teams/31/team-meetings",
    );
    expect(links).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Team Beta" })).toBeInTheDocument();
  });

  it("renders empty-state when no teams exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    loadStaffProjectTeamsForPageMock.mockResolvedValue({
      status: "ok",
      numericProjectId: 15,
      data: {
        project: { id: 15, name: "Capstone", moduleId: 5, moduleName: "Internet Systems" },
        teams: [],
      },
    } as any);

    const page = await StaffProjectMeetingsPage({ params: Promise.resolve({ projectId: "15" }) });
    render(page);

    expect(screen.getByText("No teams exist in this project yet.")).toBeInTheDocument();
  });
});
