import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getFeedbackReview, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
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
  getFeedbackReview: vi.fn(),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getFeedbackReviewMock = vi.mocked(getFeedbackReview);

const staffUser = { id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffPeerFeedbackStudentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffPeerFeedbackStudentPage({ params: Promise.resolve({ projectId: "1", teamId: "2", studentId: "3" }) }),
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

  it("uses fallback student title and empty-state evidence message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 9, moduleId: 1, name: "P" },
      teams: [{ id: 2, teamName: "Team Two", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getPeerAssessmentsForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Student 3" })).toBeInTheDocument();
    expect(screen.getByText("No peer-feedback evidence is available for this student yet.")).toBeInTheDocument();
  });

  it("renders feedback evidence cards with student response and agreements", async () => {
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
        id: 11,
        firstName: "Bob",
        lastName: "Smith",
        submittedAt: "2026-01-10T10:00:00.000Z",
        answers: [{ id: "a1", question: "Helped team?", answer: "Yes" }],
      },
      {
        id: 12,
        firstName: "Cara",
        lastName: "Jones",
        submittedAt: "2026-01-09T10:00:00.000Z",
        answers: [],
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getFeedbackReviewMock.mockImplementation(async (feedbackId: string) => {
      if (feedbackId === "11") {
        return {
          reviewText: "Thanks for the feedback",
          agreementsJson: { a1: { selected: "Agree", score: 5 } },
        } as Awaited<ReturnType<typeof getFeedbackReview>>;
      }
      throw new Error("missing");
    });

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Alice Roe" })).toBeInTheDocument();
    expect(screen.getByText("Feedback items")).toBeInTheDocument();
    expect(screen.getByText("Responses written")).toBeInTheDocument();
    expect(screen.getByText("Feedback ratings by question")).toBeInTheDocument();
    expect(screen.getByText("Helped team?")).toBeInTheDocument();
    expect(screen.getByText("Agree: 1")).toBeInTheDocument();
    expect(screen.getByText("Feedback summaries")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getAllByText("Thanks for the feedback").length).toBeGreaterThan(0);
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
        id: 21,
        firstName: "",
        lastName: "",
        submittedAt: "2026-01-10T10:00:00.000Z",
        answers: [{ id: "q1", question: "Communication", answer: "" }],
      },
      {
        id: 22,
        firstName: undefined,
        lastName: undefined,
        submittedAt: "2026-01-09T10:00:00.000Z",
        answers: null,
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getFeedbackReviewMock.mockResolvedValue({
      reviewText: undefined,
      agreementsJson: undefined,
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await StaffPeerFeedbackStudentPage({
      params: Promise.resolve({ projectId: "9", teamId: "2", studentId: "3" }),
    });
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Unknown student" })).toBeInTheDocument();
    expect(screen.getByText("No rating selections have been submitted yet.")).toBeInTheDocument();
    expect(screen.getByText("No written feedback responses have been submitted yet.")).toBeInTheDocument();
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
