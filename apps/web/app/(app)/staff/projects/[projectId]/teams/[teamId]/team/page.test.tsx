import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import StaffProjectTeamTabsPage from "./page";

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
const getTeamDetailsMock = vi.mocked(getTeamDetails);

function baseContext() {
  return {
    ok: true as const,
    user: { id: 9 },
    project: {
      id: 22,
      name: "Project 22",
      moduleId: 3,
      moduleName: "Module 3",
      teamCount: 1,
      studentCount: 2,
    },
    team: {
      id: 58,
      teamName: "Team 58",
      allocations: [
        {
          userId: 101,
          user: {
            id: 101,
            firstName: "Alice",
            lastName: "Roe",
            email: "alice@example.com",
            githubAccount: { id: 1 },
            trelloMemberId: "member-101",
          },
        },
        {
          userId: 102,
          user: {
            id: 102,
            firstName: "",
            lastName: "",
            email: "unknown@example.com",
            githubAccount: null,
            trelloMemberId: "",
          },
        },
      ],
      deadlineProfile: "MCF",
      hasDeadlineOverride: true,
    },
  };
}

describe("staff team members page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when team context is unavailable", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "missing" });

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
    });

    expect(page).toBeNull();
  });

  it("renders member cards, initials, integration pills, and peer progress", async () => {
    getStaffTeamContextMock.mockResolvedValue(baseContext() as never);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 3, title: "Module", archivedAt: null },
      team: { id: 58, title: "Team 58" },
      students: [{ id: 101, submitted: 1, expected: 1 }],
      teamMarking: null,
    } as never);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
    });
    render(page);

    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.getByText("Team: Team 58 · 2 on this team · Profile: MCF · Team override active")).toBeInTheDocument();
    expect(screen.getByText("Alice Roe")).toBeInTheDocument();
    expect(screen.getByText("unknown@example.com")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.getByText("✓ GitHub")).toBeInTheDocument();
    expect(screen.getByText("✓ Trello")).toBeInTheDocument();
    expect(screen.getByText("⚠ GitHub")).toBeInTheDocument();
    expect(screen.getByText("⚠ Trello")).toBeInTheDocument();
    expect(screen.getByText("Peer reviews: 1/1")).toBeInTheDocument();
    expect(screen.getByText("Peer reviews: 0/1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Notify student" })[0]).toBeDisabled();
  });

  it("shows peer progress as unavailable when team details cannot be loaded", async () => {
    getStaffTeamContextMock.mockResolvedValue(baseContext() as never);
    getTeamDetailsMock.mockRejectedValue(new Error("peer details unavailable"));

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
    });
    render(page);

    expect(screen.getAllByText("Peer reviews: —")).toHaveLength(2);
  });

  it("shows empty-state text when there are no allocations", async () => {
    const context = baseContext();
    context.team.allocations = [];
    context.team.deadlineProfile = "STANDARD";
    context.team.hasDeadlineOverride = false;
    getStaffTeamContextMock.mockResolvedValue(context as never);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 3, title: "Module", archivedAt: null },
      team: { id: 58, title: "Team 58" },
      students: [],
      teamMarking: null,
    } as never);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
    });
    render(page);

    expect(screen.getByText("No students assigned yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Team: Team 58 · 0 on this team · Profile: Standard · No team override"),
    ).toBeInTheDocument();
  });

  it("shows N/A peer label when expected reviews are zero", async () => {
    const context = baseContext();
    context.team.allocations = [context.team.allocations[0]];
    getStaffTeamContextMock.mockResolvedValue(context as never);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 3, title: "Module", archivedAt: null },
      team: { id: 58, title: "Team 58" },
      students: [],
      teamMarking: null,
    } as never);

    const page = await StaffProjectTeamTabsPage({
      params: Promise.resolve({ projectId: "22", teamId: "58" }),
    });
    render(page);

    expect(screen.getByText("Peer reviews: N/A")).toBeInTheDocument();
  });
});
