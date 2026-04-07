import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
} from "@/features/peerFeedback/api/client";
import StaffPeerFeedbackStudentPage from "./page";

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

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/peerFeedback/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getPeerAssessmentsReceivedForUser: vi.fn(),
  getFeedbackReview: vi.fn(),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getPeerAssessmentsReceivedForUserMock = vi.mocked(getPeerAssessmentsReceivedForUser);
const getFeedbackReviewMock = vi.mocked(getFeedbackReview);

const staffUser = { id: 7, isStaff: true, role: "STAFF" } as Awaited<
  ReturnType<typeof getCurrentUser>
>;

describe("StaffPeerFeedbackStudentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      isStaff: false,
      role: "STUDENT",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffPeerFeedbackStudentPage({
        params: Promise.resolve({ projectId: "1", teamId: "2", studentId: "3" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid parameter message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "x", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("Invalid route parameters.")).toBeInTheDocument();
  });

  it("renders project lookup error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("project load failed"));

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("project load failed")).toBeInTheDocument();
  });

  it("renders default project lookup error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("project load failed");

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("renders team-not-found message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [{ id: 200, teamName: "Other", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders fallback student title and empty-state sections", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [{ id: 2, teamName: "Team Two", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockResolvedValue(
      [] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>,
    );
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue(
      [] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>,
    );

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText(/Student 3.*evidence item/)).toBeInTheDocument();
    expect(screen.getByText("Avg rating received")).toBeInTheDocument();
    expect(
      screen.getByText("No assessment reviews were found for assessments this student gave."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No completed feedback reviews were found for assessments this student received."),
    ).toBeInTheDocument();
  });

  it("renders ratings and answer text in both sections", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [
        {
          id: 2,
          teamName: "Team Two",
          allocations: [{ userId: 3, user: { firstName: "Alice", lastName: "Roe" } }],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockResolvedValue([
      {
        id: "11",
        firstName: "Bob",
        lastName: "Smith",
        submittedAt: "2026-01-10T10:00:00.000Z",
        answers: [{ id: "a1", question: "Helped team?", answer: "Yes" }],
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([
      {
        id: "12",
        firstName: "Cara",
        lastName: "Jones",
        submittedAt: "2026-01-09T10:00:00.000Z",
        answers: [{ id: "r1", question: "Communicated clearly?", answer: "Mostly" }],
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getFeedbackReviewMock.mockImplementation(async (feedbackId: string) => {
      if (feedbackId === "11") {
        return {
          reviewText: "Teammate noted strong delivery and communication.",
          agreementsJson: { a1: { selected: "Agree", score: 4 } },
        } as Awaited<ReturnType<typeof getFeedbackReview>>;
      }
      return {
        reviewText: "I agreed with most of the assessment comments.",
        agreementsJson: { r1: { selected: "Reasonable", score: 3 } },
      } as Awaited<ReturnType<typeof getFeedbackReview>>;
    });

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText(/Alice Roe.*evidence item/)).toBeInTheDocument();
    expect(screen.getByText("4.00 / 5")).toBeInTheDocument();
    expect(screen.getByText("Reviews on this user’s assessments given to teammates")).toBeInTheDocument();
    expect(screen.getByText("How this user reviewed assessments made on them")).toBeInTheDocument();
    expect(screen.getAllByText("Bob Smith").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cara Jones").length).toBeGreaterThan(0);
    expect(screen.getByText(/Helped team\?/)).toBeInTheDocument();
    expect(screen.getByText(/Agree \(4\/5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Communicated clearly\?/)).toBeInTheDocument();
    expect(screen.getByText(/Reasonable \(3\/5\)/)).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Mostly")).toBeInTheDocument();
    expect(screen.getByText("Teammate noted strong delivery and communication.")).toBeInTheDocument();
    expect(screen.getByText("I agreed with most of the assessment comments.")).toBeInTheDocument();
  });

  it("renders unknown-name and no-response fallbacks", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [
        {
          id: 2,
          teamName: "Team Two",
          allocations: [{ userId: 3, user: { firstName: "", lastName: "" } }],
        },
      ],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockResolvedValue([
      {
        id: "21",
        firstName: "",
        lastName: "",
        submittedAt: "2026-01-10T10:00:00.000Z",
        answers: [{ id: "q1", question: "Communication", answer: "" }],
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue(
      [] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>,
    );
    getFeedbackReviewMock.mockResolvedValue({
      agreementsJson: { random: { selected: "Reasonable", score: 3 } },
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText(/Unknown student.*evidence item/)).toBeInTheDocument();
    expect(screen.getAllByText("Unknown teammate").length).toBeGreaterThan(0);
    expect(screen.getByText("No response")).toBeInTheDocument();
  });

  it("renders feedback load error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [{ id: 2, teamName: "Team Two", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockRejectedValue(new Error("feedback unavailable"));

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("feedback unavailable")).toBeInTheDocument();
  });

  it("renders default feedback load error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [{ id: 2, teamName: "Team Two", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockRejectedValue("feedback unavailable");

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByText("Failed to load feedback evidence.")).toBeInTheDocument();
  });
});
