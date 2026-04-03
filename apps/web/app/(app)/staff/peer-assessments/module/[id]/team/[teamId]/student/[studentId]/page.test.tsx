import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import { getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import StudentPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getStudentDetails: vi.fn(),
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

vi.mock("@/shared/ui/PerformanceSummaryCard", () => ({
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

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStudentDetailsMock = vi.mocked(getStudentDetails);

describe("StudentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invalid-route message for non-numeric params", async () => {
    const page = await StudentPage({
      params: Promise.resolve({ id: "x", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("Invalid student route. Please open the student from the team list.")).toBeInTheDocument();
  });

  it("renders permission error when user lacks access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await StudentPage({
      params: Promise.resolve({ id: "1", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("You don’t have permission to view staff peer assessments.")).toBeInTheDocument();
  });

  it("renders not-found and generic API errors", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStudentDetailsMock.mockRejectedValueOnce(new ApiError("missing", { status: 404 }));

    const notFoundPage = await StudentPage({
      params: Promise.resolve({ id: "10", teamId: "11", studentId: "12" }),
    });
    render(notFoundPage);
    expect(screen.getByText("This student was not found in the selected team.")).toBeInTheDocument();

    getStudentDetailsMock.mockRejectedValueOnce(new Error("boom"));
    const genericPage = await StudentPage({
      params: Promise.resolve({ id: "10", teamId: "11", studentId: "12" }),
    });
    render(genericPage);
    expect(screen.getByText("Something went wrong loading this student. Please try again.")).toBeInTheDocument();
  });

  it("renders full student detail view with team marking metadata", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStudentDetailsMock.mockResolvedValue({
      module: { id: 10, title: "Module Alpha" },
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

    const page = await StudentPage({
      params: Promise.resolve({ id: "10", teamId: "11", studentId: "12" }),
    });
    render(page);

    expect(screen.getByTestId("placeholder")).toHaveAttribute(
      "data-title",
      "Module Alpha – Team One – —"
    );
    expect(screen.getByText("No team formative feedback yet.")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText(/Unknown time/)).toBeInTheDocument();
    expect(screen.getAllByText("Ada Lovelace")).toHaveLength(2);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByTestId("performance-summary")).toHaveAttribute(
      "data-title",
      "—'s average scores"
    );
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-staff-id", "7");
  });

  it("renders team-marking empty state when no team mark exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 14, isStaff: true, isAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStudentDetailsMock.mockResolvedValue({
      module: { id: 50, title: "Module Beta" },
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

    const page = await StudentPage({
      params: Promise.resolve({ id: "50", teamId: "60", studentId: "70" }),
    });
    render(page);

    expect(screen.getByText("No team-level marking yet.")).toBeInTheDocument();
    expect(screen.getByTestId("staff-marking-card")).toHaveAttribute("data-student-id", "70");
  });
});
