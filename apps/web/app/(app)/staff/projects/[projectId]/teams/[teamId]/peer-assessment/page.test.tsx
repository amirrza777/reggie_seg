import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamDeadline } from "@/features/projects/api/client";
import { formatDate } from "@/shared/lib/formatDate";
import { getTeamDetails, getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import StaffPeerAssessmentSectionPage from "./page";

const peerGridMock = vi.fn(() => <div data-testid="peer-grid" />);

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffTeamDeadline: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
  getStudentDetails: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffPeerMemberDualProgressGrid", () => ({
  StaffPeerMemberDualProgressGrid: (props: unknown) => peerGridMock(props),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
const getStaffTeamDeadlineMock = vi.mocked(getStaffTeamDeadline);
const getTeamDetailsMock = vi.mocked(getTeamDetails);
const getStudentDetailsMock = vi.mocked(getStudentDetails);

const successContext = {
  ok: true as const,
  user: { id: 8 },
  project: { id: 50, moduleId: 9, name: "Project" },
  team: {
    id: 60,
    allocations: [{ userId: 1 }, { userId: 2 }, { userId: 3 }],
  },
};

describe("StaffPeerAssessmentSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStaffTeamDeadlineMock.mockRejectedValue(new Error("deadline fetch skipped in test"));
  });

  it("returns null when context is not ok", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "Invalid project or team ID." });

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });

    expect(page).toBeNull();
  });

  it("renders detail error from Error throws", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getTeamDetailsMock.mockRejectedValue(new Error("detail failed"));

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(screen.getByText("detail failed")).toBeInTheDocument();
  });

  it("renders fallback detail error for non-Error throws", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getTeamDetailsMock.mockRejectedValue("detail failed");

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(screen.getByText("Failed to load peer assessment data.")).toBeInTheDocument();
  });

  it("renders empty students state", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getTeamDetailsMock.mockResolvedValue({
      students: [],
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(screen.getByText("No student allocation data is available for this team yet.")).toBeInTheDocument();
  });

  it("renders student grid with given/received values and row fallback handling", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getTeamDetailsMock.mockResolvedValue({
      students: [
        { id: 101, title: "Alice Roe", submitted: 2, expected: 2 },
        { id: 102, title: "Bob Yeo", submitted: 1, expected: 2 },
        { id: null, title: "Missing Id", submitted: 0, expected: 2 },
      ],
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    getStudentDetailsMock.mockImplementation(async (_userId, _moduleId, _teamId, studentId) => {
      if (studentId === 101) {
        return {
          teamMembers: [
            { id: 101, reviewedCurrentStudent: false },
            { id: 201, reviewedCurrentStudent: true },
            { id: 202, reviewedCurrentStudent: false },
          ],
        } as Awaited<ReturnType<typeof getStudentDetails>>;
      }
      throw new Error("student detail failed");
    });

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(peerGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            id: 101,
            title: "Alice Roe",
            givenSubmitted: 2,
            givenExpected: 2,
            receivedSubmitted: 1,
            receivedExpected: 2,
            deadline: undefined,
            href: "/staff/projects/50/teams/60/peer-assessment/101",
          },
          {
            id: 102,
            title: "Bob Yeo",
            givenSubmitted: 1,
            givenExpected: 2,
            receivedSubmitted: 0,
            receivedExpected: 2,
            deadline: undefined,
            href: "/staff/projects/50/teams/60/peer-assessment/102",
          },
          {
            id: -3,
            title: "Missing Id",
            givenSubmitted: 0,
            givenExpected: 2,
            receivedSubmitted: 0,
            receivedExpected: 2,
            deadline: undefined,
            href: undefined,
          },
        ],
      }),
    );
    expect(screen.getByTestId("peer-grid")).toBeInTheDocument();
  });

  it("includes team effective assessment deadline on grid items when deadline API succeeds", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getStaffTeamDeadlineMock.mockResolvedValue({
      baseDeadline: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: "2026-05-15T16:00:00.000Z",
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: false,
        deadlineProfile: "STANDARD",
      },
      effectiveDeadline: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: "2026-05-15T16:00:00.000Z",
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: false,
        deadlineProfile: "STANDARD",
      },
      deadlineInputMode: null,
      shiftDays: null,
    });
    getTeamDetailsMock.mockResolvedValue({
      students: [{ id: 101, title: "Alice Roe", submitted: 0, expected: 1 }],
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    getStudentDetailsMock.mockResolvedValue({
      teamMembers: [
        { id: 101, reviewedCurrentStudent: false },
        { id: 201, reviewedCurrentStudent: false },
      ],
    } as Awaited<ReturnType<typeof getStudentDetails>>);

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(peerGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 101,
            deadline: {
              dateLabel: formatDate("2026-05-15T16:00:00.000Z"),
              profile: "STANDARD",
            },
          }),
        ],
      }),
    );
  });

  it("marks deadline display as MCF when effective profile is MCF", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getStaffTeamDeadlineMock.mockResolvedValue({
      baseDeadline: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: "2026-05-20T12:00:00.000Z",
        assessmentDueDateMcf: "2026-05-27T12:00:00.000Z",
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: false,
        deadlineProfile: "MCF",
      },
      effectiveDeadline: {
        taskOpenDate: null,
        taskDueDate: null,
        assessmentOpenDate: null,
        assessmentDueDate: "2026-05-20T12:00:00.000Z",
        assessmentDueDateMcf: "2026-05-27T12:00:00.000Z",
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: false,
        deadlineProfile: "MCF",
      },
      deadlineInputMode: null,
      shiftDays: null,
    });
    getTeamDetailsMock.mockResolvedValue({
      students: [{ id: 101, title: "Alice Roe", submitted: 0, expected: 1 }],
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    getStudentDetailsMock.mockResolvedValue({
      teamMembers: [
        { id: 101, reviewedCurrentStudent: false },
        { id: 201, reviewedCurrentStudent: false },
      ],
    } as Awaited<ReturnType<typeof getStudentDetails>>);

    const page = await StaffPeerAssessmentSectionPage({
      params: Promise.resolve({ projectId: "50", teamId: "60" }),
    });
    render(page);

    expect(peerGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            deadline: {
              dateLabel: formatDate("2026-05-20T12:00:00.000Z"),
              profile: "MCF",
            },
          }),
        ],
      }),
    );
  });
});
