import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPeerAssessmentsForUser, getTeammates } from "@/features/peerAssessment/api/client";
import { getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectPeerAssessmentsPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/peerAssessment/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getTeammates: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/features/peerAssessment/components/PeerListView", () => ({
  PeerListView: ({
    peers,
    teamId,
    currentUserId,
    listDescription,
    readOnly,
    completedRevieweeIds,
    completedAssessmentByRevieweeId,
  }: {
    peers: Array<{ id: number }>;
    teamId: number;
    currentUserId: number;
    listDescription: string;
    readOnly: boolean;
    completedRevieweeIds: number[];
    completedAssessmentByRevieweeId: Record<string, number>;
  }) => (
    <div
      data-testid="peer-list-view"
      data-peer-count={String(peers.length)}
      data-team-id={String(teamId)}
      data-current-user-id={String(currentUserId)}
      data-list-description={listDescription}
      data-read-only={String(readOnly)}
      data-completed-reviewee-ids={JSON.stringify(completedRevieweeIds)}
      data-completed-map={JSON.stringify(completedAssessmentByRevieweeId)}
    />
  ),
}));

vi.mock("@/features/peerAssessment/components/PeerAssessmentTitleWithInfo", () => ({
  PeerAssessmentTitleWithInfo: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <section>
      <h1>{title}</h1>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getTeammatesMock = vi.mocked(getTeammates);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);

describe("ProjectPeerAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeammatesMock.mockResolvedValue([{ id: 1 }, { id: 2 }] as Awaited<ReturnType<typeof getTeammates>>);
    getPeerAssessmentsForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
  });

  it("shows team-missing fallback for unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "42" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back to project" })).toHaveAttribute("href", "/projects/42");
  });

  it("skips team lookup for invalid project ids and falls back", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "bad-id" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("falls back when team lookup throws", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("team lookup failed"));

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "9" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
  });

  it("renders list with late/extension guidance and read-only mode", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 55 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentDueDate: "2000-01-01T10:00:00.000Z",
      assessmentDueDateMcf: "2000-01-05T11:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getPeerAssessmentsForUserMock.mockResolvedValue([
      { id: "bad-id", revieweeUserId: 2, submittedAt: "2025-01-01T10:00:00.000Z" },
      { id: "11", revieweeUserId: 2, submittedAt: "2025-01-01T10:00:00.000Z" },
      { id: "12", revieweeUserId: 2, submittedAt: "2025-02-01T10:00:00.000Z" },
      { id: "20", revieweeUserId: 3, submittedAt: "2025-02-02T10:00:00.000Z" },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    const list = screen.getByTestId("peer-list-view");
    expect(list).toHaveAttribute("data-team-id", "55");
    expect(list).toHaveAttribute("data-current-user-id", "3");
    expect(list).toHaveAttribute("data-read-only", "true");
    expect(list.getAttribute("data-list-description")).toContain("Late submissions or assessment changes are accepted until");
    expect(list).toHaveAttribute("data-completed-reviewee-ids", "[2,3]");
    expect(list).toHaveAttribute("data-completed-map", "{\"2\":12,\"3\":20}");
  });

  it("renders due-date-only guidance and editable mode", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 70 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentDueDate: "2099-01-01T10:00:00.000Z",
      assessmentDueDateMcf: null,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "70" }) });
    render(page);

    const list = screen.getByTestId("peer-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toContain("Please complete your reviews before the deadline.");
  });

  it("renders default guidance when deadline fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 33 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline unavailable"));

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "33" }) });
    render(page);

    const list = screen.getByTestId("peer-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toBe(
      "Complete all required peer assessments for your teammates in this list.",
    );
  });

  it("treats invalid deadline dates as editable and uses default guidance", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 10 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentDueDate: "not-a-date",
      assessmentDueDateMcf: "also-not-a-date",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await ProjectPeerAssessmentsPage({ params: Promise.resolve({ projectId: "10" }) });
    render(page);

    const list = screen.getByTestId("peer-list-view");
    expect(list).toHaveAttribute("data-read-only", "false");
    expect(list.getAttribute("data-list-description")).toBe(
      "Complete all required peer assessments for your teammates in this list.",
    );
  });
});
