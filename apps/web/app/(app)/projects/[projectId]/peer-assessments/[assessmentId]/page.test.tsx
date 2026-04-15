import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPeerAssessmentById, getQuestionsByProject } from "@/features/peerAssessment/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import AssessmentPage from "./page";

vi.mock("@/features/peerAssessment/api/client", () => ({
  getPeerAssessmentById: vi.fn(),
  getQuestionsByProject: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProjectDeadline: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/peerAssessment/components/PeerAssessmentForm", () => ({
  PeerAssessmentForm: ({
    title,
    teammateName,
    projectId,
    teamId,
    assessmentId,
    assessmentOpenAt,
    assessmentDueAt,
  }: {
    title: string;
    teammateName: string;
    projectId: number;
    teamId: number;
    assessmentId: number;
    assessmentOpenAt: string | null;
    assessmentDueAt: string | null;
  }) => (
    <div
      data-testid="assessment-form"
      data-title={title}
      data-teammate={teammateName}
      data-project-id={String(projectId)}
      data-team-id={String(teamId)}
      data-assessment-id={String(assessmentId)}
      data-open-at={String(assessmentOpenAt ?? "")}
      data-due-at={String(assessmentDueAt ?? "")}
    />
  ),
}));

const getPeerAssessmentByIdMock = vi.mocked(getPeerAssessmentById);
const getQuestionsByProjectMock = vi.mocked(getQuestionsByProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("AssessmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeerAssessmentByIdMock.mockResolvedValue({
      firstName: "Sam",
      lastName: "Taylor",
      teamId: 15,
      templateId: 22,
      reviewerUserId: 3,
      revieweeUserId: 9,
      answers: { 1: "Answer" },
      templateQuestions: [],
    } as Awaited<ReturnType<typeof getPeerAssessmentById>>);
    getQuestionsByProjectMock.mockResolvedValue([{ id: 1, text: "Question" }] as Awaited<ReturnType<typeof getQuestionsByProject>>);
  });

  it("renders assessment form with teammate from search and deadline values", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentOpenDate: "2026-03-01T10:00:00.000Z",
      assessmentDueDate: "2026-03-10T10:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await AssessmentPage({
      params: Promise.resolve({ projectId: "11", assessmentId: "101" }),
      searchParams: Promise.resolve({ teammateName: "Alex North" }),
    });
    render(page);

    const form = screen.getByTestId("assessment-form");
    expect(form).toHaveAttribute("data-title", "Edit Peer Assessment");
    expect(form).toHaveAttribute("data-teammate", "Alex North");
    expect(form).toHaveAttribute("data-project-id", "11");
    expect(form).toHaveAttribute("data-team-id", "15");
    expect(form).toHaveAttribute("data-assessment-id", "101");
    expect(form).toHaveAttribute("data-open-at", "2026-03-01T10:00:00.000Z");
    expect(form).toHaveAttribute("data-due-at", "2026-03-10T10:00:00.000Z");
  });

  it("falls back to assessment user name when teammate search param is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline unavailable"));

    const page = await AssessmentPage({
      params: Promise.resolve({ projectId: "11", assessmentId: "101" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    const form = screen.getByTestId("assessment-form");
    expect(form).toHaveAttribute("data-teammate", "Sam Taylor");
    expect(form).toHaveAttribute("data-open-at", "");
    expect(form).toHaveAttribute("data-due-at", "");
  });

  it("skips deadline lookup when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await AssessmentPage({
      params: Promise.resolve({ projectId: "11", assessmentId: "101" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByTestId("assessment-form")).toBeInTheDocument();
    expect(getProjectDeadlineMock).not.toHaveBeenCalled();
  });

  it("renders empty state when no questions exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);

    const page = await AssessmentPage({
      params: Promise.resolve({ projectId: "11", assessmentId: "101" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByText("No questions found")).toBeInTheDocument();
    expect(screen.queryByTestId("assessment-form")).not.toBeInTheDocument();
  });

  it("uses assessment template questions when project returns none", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentOpenDate: null,
      assessmentDueDate: null,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);
    getPeerAssessmentByIdMock.mockResolvedValue({
      firstName: "Sam",
      lastName: "Taylor",
      teamId: 15,
      templateId: 22,
      reviewerUserId: 3,
      revieweeUserId: 9,
      answers: { 7: "From snapshot" },
      templateQuestions: [{ id: 7, text: "Q7", type: "text", order: 0 }],
    } as Awaited<ReturnType<typeof getPeerAssessmentById>>);

    const page = await AssessmentPage({
      params: Promise.resolve({ projectId: "11", assessmentId: "101" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByTestId("assessment-form")).toBeInTheDocument();
    expect(getQuestionsByProjectMock).toHaveBeenCalled();
  });
});
