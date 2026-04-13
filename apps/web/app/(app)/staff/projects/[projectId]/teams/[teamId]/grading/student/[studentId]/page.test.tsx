import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { getStudentDetails, getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffTeamGradingStudentPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getStudentDetails: vi.fn(),
  getTeamDetails: vi.fn(),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="placeholder" data-title={title} data-description={description} />
  ),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/progress/PerformanceSummaryCard", () => ({
  PerformanceSummaryCard: ({ title }: { title: string }) => (
    <div data-testid="performance-summary" data-title={title} />
  ),
}));

vi.mock("@/features/staff/peerAssessments/components/StaffMarkingCard", () => ({
  StaffMarkingCard: ({
    staffId,
    moduleId,
    teamId,
    studentId,
  }: {
    staffId: number;
    moduleId: number;
    teamId: number;
    studentId: number;
  }) => (
    <div
      data-testid="staff-marking-card"
      data-staff-id={String(staffId)}
      data-module-id={String(moduleId)}
      data-team-id={String(teamId)}
      data-student-id={String(studentId)}
    />
  ),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
const getStudentDetailsMock = vi.mocked(getStudentDetails);
const getTeamDetailsMock = vi.mocked(getTeamDetails);

const emptyTeamDetails = {
  module: { id: 10, title: "Module Alpha", archivedAt: null },
  team: { id: 11, title: "Team One" },
  students: [] as Awaited<ReturnType<typeof getTeamDetails>>["students"],
  teamMarking: null,
} as Awaited<ReturnType<typeof getTeamDetails>>;

const successContext = {
  ok: true as const,
  user: { id: 7 },
  project: {
    id: 100,
    name: "Project",
    moduleId: 10,
    moduleName: "Module Alpha",
    moduleArchivedAt: null as string | null,
    teamCount: 1,
    studentCount: 4,
  },
  team: { id: 11, teamName: "Team One", allocations: [] },
};

describe("StaffTeamGradingStudentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeamDetailsMock.mockResolvedValue(emptyTeamDetails);
  });

  it("returns null when team context is not ok", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "Team not found in this project." });

    const page = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "1", teamId: "2", studentId: "3" }),
    });

    expect(page).toBeNull();
  });

  it("renders invalid-route message for non-numeric studentId", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);

    const page = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "x" }),
    });
    render(page);

    expect(screen.getByText("Invalid student route. Please open the student from the team list.")).toBeInTheDocument();
  });

  it("renders not-found and generic API errors", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getStudentDetailsMock.mockRejectedValueOnce(new ApiError("missing", { status: 404 }));

    const notFoundPage = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "12" }),
    });
    render(notFoundPage);
    expect(screen.getByText("This student was not found in the selected team.")).toBeInTheDocument();

    getStudentDetailsMock.mockRejectedValueOnce(new ApiError("nope", { status: 403 }));
    const forbiddenPage = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "12" }),
    });
    render(forbiddenPage);
    expect(screen.getByText("You don’t have permission to view staff peer assessments.")).toBeInTheDocument();

    getStudentDetailsMock.mockRejectedValueOnce(new Error("boom"));
    const genericPage = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "12" }),
    });
    render(genericPage);
    expect(screen.getByText("Something went wrong loading this student. Please try again.")).toBeInTheDocument();
  });

  it("renders full student detail view with team marking metadata and peer review links", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getStudentDetailsMock.mockResolvedValue({
      module: { id: 10, title: "Module Alpha", archivedAt: null },
      team: { id: 11, title: "Team One" },
      student: { id: 12, firstName: "", lastName: "" },
      teamMembers: [
        {
          id: 20,
          firstName: "Ada",
          lastName: "Lovelace",
          reviewedByCurrentStudent: true,
          reviewedCurrentStudent: false,
        },
        {
          id: 21,
          firstName: "",
          lastName: "",
          reviewedByCurrentStudent: false,
          reviewedCurrentStudent: true,
        },
      ],
      performanceSummary: {
        overallAverage: 4.5,
        totalReviews: 2,
        questionAverages: [],
      },
      teamMarking: {
        mark: null,
        formativeFeedback: null,
        updatedAt: "not-a-date",
        marker: { id: 1, firstName: "Staff", lastName: "Marker" },
      },
      studentMarking: null,
    } as Awaited<ReturnType<typeof getStudentDetails>>);

    const page = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "12" }),
    });
    render(page);

    expect(screen.getByTestId("placeholder")).toHaveAttribute("data-title", "Grading —");
    expect(screen.getByText("No team formative feedback yet.")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText(/Unknown time/)).toBeInTheDocument();
    const givenSection = screen.getByRole("heading", { name: "Reviews Given" }).closest("section")!;
    const receivedSection = screen.getByRole("heading", { name: "Reviews Received" }).closest("section")!;
    expect(within(givenSection).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      "/staff/projects/100/teams/11/peer-assessment/12?peerTab=given&peerCounterpart=20",
    );
    expect(within(receivedSection).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      "/staff/projects/100/teams/11/peer-assessment/12?peerTab=received&peerCounterpart=20",
    );
    expect(within(givenSection).getByRole("link", { name: "—" })).toHaveAttribute(
      "href",
      "/staff/projects/100/teams/11/peer-assessment/12?peerTab=given&peerCounterpart=21",
    );
    expect(within(receivedSection).getByRole("link", { name: "—" })).toHaveAttribute(
      "href",
      "/staff/projects/100/teams/11/peer-assessment/12?peerTab=received&peerCounterpart=21",
    );
    expect(screen.getByTestId("performance-summary")).toHaveAttribute(
      "data-title",
      "—'s average scores"
    );
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-staff-id", "7");
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-module-id", "10");
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-team-id", "11");
  });

  it("uses team details marking when student payload omits team marking", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getStudentDetailsMock.mockResolvedValue({
      module: { id: 10, title: "Module Alpha", archivedAt: null },
      team: { id: 11, title: "Team One" },
      student: { id: 12, firstName: "Sam", lastName: "Student" },
      teamMembers: [],
      performanceSummary: {
        overallAverage: 0,
        totalReviews: 0,
        questionAverages: [],
      },
      teamMarking: null,
      studentMarking: null,
    } as Awaited<ReturnType<typeof getStudentDetails>>);
    getTeamDetailsMock.mockResolvedValue({
      ...emptyTeamDetails,
      teamMarking: {
        mark: 88,
        formativeFeedback: "Team feedback from team endpoint.",
        updatedAt: "2026-04-01T12:00:00.000Z",
        marker: { id: 2, firstName: "Lead", lastName: "Staff" },
      },
    });

    const page = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "11", studentId: "12" }),
    });
    render(page);

    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("Team feedback from team endpoint.")).toBeInTheDocument();
  });

  it("renders team-marking empty state when neither endpoint has team marking", async () => {
    getStaffTeamContextMock.mockResolvedValue({
      ...successContext,
      user: { id: 14 },
      project: { ...successContext.project, moduleId: 50 },
      team: { id: 60, teamName: "Team Delta", allocations: [] },
    });
    getStudentDetailsMock.mockResolvedValue({
      module: { id: 50, title: "Module Beta", archivedAt: null },
      team: { id: 60, title: "Team Delta" },
      student: { id: 70, firstName: "Grace", lastName: "Hopper" },
      teamMembers: [],
      performanceSummary: {
        overallAverage: 0,
        totalReviews: 0,
        questionAverages: [],
      },
      teamMarking: null,
      studentMarking: null,
    } as Awaited<ReturnType<typeof getStudentDetails>>);
    getTeamDetailsMock.mockResolvedValue({
      module: { id: 50, title: "Module Beta", archivedAt: null },
      team: { id: 60, title: "Team Delta" },
      students: [],
      teamMarking: null,
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffTeamGradingStudentPage({
      params: Promise.resolve({ projectId: "100", teamId: "60", studentId: "70" }),
    });
    render(page);

    expect(screen.getByText("No team-level marking yet.")).toBeInTheDocument();
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-student-id", "70");
  });
});
