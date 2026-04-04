import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getFeedbackReview, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import StaffPeerFeedbackSectionPage from "./page";

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

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getTeamDetails: vi.fn(),
}));

vi.mock("@/features/peerFeedback/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getFeedbackReview: vi.fn(),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);
const getTeamDetailsMock = vi.mocked(getTeamDetails);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getFeedbackReviewMock = vi.mocked(getFeedbackReview);

const staffUser = { id: 5, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffPeerFeedbackSectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "1", teamId: "2" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid route message", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "x", teamId: "y" }) });
    render(page);

    expect(screen.getByText("Invalid project or team ID.")).toBeInTheDocument();
  });

  it("renders project/team lookup error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("project lookup failed"));

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("project lookup failed")).toBeInTheDocument();
  });

  it("renders default project/team lookup error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockRejectedValue("lookup failed");

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("Failed to load project team data.")).toBeInTheDocument();
  });

  it("renders default team-not-found state", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 21, teamName: "Team Y" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("Team not found in this project.")).toBeInTheDocument();
  });

  it("renders feedback load error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 20, teamName: "Team X" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockRejectedValue(new Error("feedback fetch failed"));

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("feedback fetch failed")).toBeInTheDocument();
  });

  it("renders default feedback load error for non-Error throws", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 20, teamName: "Team X" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockRejectedValue("feedback failed");

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("Failed to load peer feedback progress.")).toBeInTheDocument();
  });

  it("renders per-student feedback progress cards", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 20, teamName: "Team X" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      students: [
        { id: 101, title: "Alice" },
        { id: null, title: "No Id" },
      ],
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    getPeerAssessmentsForUserMock.mockImplementation(async (studentId: string) => {
      if (studentId === "101") {
        return [{ id: 1 }, { id: 2 }] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>;
      }
      return [] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>;
    });
    getFeedbackReviewMock.mockImplementation(async (assessmentId: string) => {
      if (assessmentId === "1") return { id: 1 } as Awaited<ReturnType<typeof getFeedbackReview>>;
      throw new Error("missing review");
    });

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("Peer feedback by student")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track feedback responses each student has completed for teammates and which responses are still outstanding."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Feedback reviews completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Feedback reviews pending").length).toBeGreaterThan(0);
    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
    expect(screen.getByText("1/2 pending")).toBeInTheDocument();
    expect(screen.getByText(/Missing student id/)).toBeInTheDocument();
  });

  it("renders row-level student fetch errors", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 20, teamName: "Team X" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      students: [{ id: 101, title: "Alice" }],
    } as Awaited<ReturnType<typeof getTeamDetails>>);
    getPeerAssessmentsForUserMock.mockRejectedValue(new Error("student feedback failed"));

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText(/student feedback failed/)).toBeInTheDocument();
    expect(screen.getByText("0/0 completed")).toBeInTheDocument();
    expect(screen.getByText("0/0 pending")).toBeInTheDocument();
  });

  it("renders empty student feedback state when team has no students", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 10, moduleId: 3, name: "Project X" },
      teams: [{ id: 20, teamName: "Team X" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);
    getTeamDetailsMock.mockResolvedValue({
      students: [],
    } as Awaited<ReturnType<typeof getTeamDetails>>);

    const page = await StaffPeerFeedbackSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) });
    render(page);

    expect(screen.getByText("No student feedback data is available for this team yet.")).toBeInTheDocument();
  });
});
