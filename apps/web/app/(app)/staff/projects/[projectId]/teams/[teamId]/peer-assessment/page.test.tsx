import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails, getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import StaffPeerAssessmentSectionPage from "./page";

const peerGridMock = vi.fn(() => <div data-testid="peer-grid" />);

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
  getStudentDetails: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffPeerMemberDualProgressGrid", () => ({
  StaffPeerMemberDualProgressGrid: (props: unknown) => peerGridMock(props),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
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
            href: "/staff/projects/50/teams/60/peer-assessment/101",
          },
          {
            id: 102,
            title: "Bob Yeo",
            givenSubmitted: 1,
            givenExpected: 2,
            receivedSubmitted: 0,
            receivedExpected: 2,
            href: "/staff/projects/50/teams/60/peer-assessment/102",
          },
          {
            id: -3,
            title: "Missing Id",
            givenSubmitted: 0,
            givenExpected: 2,
            receivedSubmitted: 0,
            receivedExpected: 2,
            href: undefined,
          },
        ],
      }),
    );
    expect(screen.getByTestId("peer-grid")).toBeInTheDocument();
  });
});
