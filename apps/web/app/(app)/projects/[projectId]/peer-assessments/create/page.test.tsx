import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  getPeerAssessmentData,
  getQuestionsByProject,
} from "@/features/peerAssessment/api/client";
import { getProject, getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { ApiError } from "@/shared/api/errors";
import CreateAssessmentPage from "./page";

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

vi.mock("@/features/peerAssessment/api/client", () => ({
  getPeerAssessmentData: vi.fn(),
  getQuestionsByProject: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
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
    reviewerId,
    revieweeId,
    templateId,
    assessmentOpenAt,
    assessmentDueAt,
  }: {
    title: string;
    teammateName: string;
    projectId: number;
    teamId: number;
    reviewerId: number;
    revieweeId: number;
    templateId: number;
    assessmentOpenAt: string | null;
    assessmentDueAt: string | null;
  }) => (
    <div
      data-testid="create-assessment-form"
      data-title={title}
      data-teammate={teammateName}
      data-project-id={String(projectId)}
      data-team-id={String(teamId)}
      data-reviewer-id={String(reviewerId)}
      data-reviewee-id={String(revieweeId)}
      data-template-id={String(templateId)}
      data-open-at={String(assessmentOpenAt ?? "")}
      data-due-at={String(assessmentDueAt ?? "")}
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getPeerAssessmentDataMock = vi.mocked(getPeerAssessmentData);
const getQuestionsByProjectMock = vi.mocked(getQuestionsByProject);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("CreateAssessmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeerAssessmentDataMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      questionnaireTemplateId: 101,
    } as Awaited<ReturnType<typeof getProject>>);
    getQuestionsByProjectMock.mockResolvedValue([
      { id: 1, text: "Question" },
    ] as Awaited<ReturnType<typeof getQuestionsByProject>>);
  });

  it("redirects to edit route when an existing assessment already exists", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getPeerAssessmentDataMock.mockResolvedValue({
      id: "777",
    } as Awaited<ReturnType<typeof getPeerAssessmentData>>);

    await expect(
      CreateAssessmentPage({
        params: Promise.resolve({ projectId: "19" }),
        searchParams: Promise.resolve({
          teamId: "55",
          revieweeId: "9",
          reviewerId: "5",
          teammateName: "Alex Smith",
        }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith(
      "/projects/19/peer-assessments/777?teammateName=Alex%20Smith",
    );
    expect(getProjectMock).not.toHaveBeenCalled();
  });

  it("continues on non-404 lookup errors and logs the error", async () => {
    const err = new ApiError("broken", { status: 500 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getPeerAssessmentDataMock.mockRejectedValue(err);
    getProjectDeadlineMock.mockResolvedValue({
      assessmentOpenDate: "2026-03-01T10:00:00.000Z",
      assessmentDueDate: "2026-03-10T10:00:00.000Z",
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await CreateAssessmentPage({
      params: Promise.resolve({ projectId: "44" }),
      searchParams: Promise.resolve({
        teamId: "8",
        revieweeId: "22",
        reviewerId: "12",
        teammateName: "Taylor Lee",
      }),
    });
    render(page);

    expect(errorSpy).toHaveBeenCalledWith("Error checking for existing assessment:", err);

    const form = screen.getByTestId("create-assessment-form");
    expect(form).toHaveAttribute("data-title", "Create Peer Assessment");
    expect(form).toHaveAttribute("data-teammate", "Taylor Lee");
    expect(form).toHaveAttribute("data-project-id", "44");
    expect(form).toHaveAttribute("data-team-id", "8");
    expect(form).toHaveAttribute("data-template-id", "101");
    expect(form).toHaveAttribute("data-open-at", "2026-03-01T10:00:00.000Z");
    expect(form).toHaveAttribute("data-due-at", "2026-03-10T10:00:00.000Z");

    errorSpy.mockRestore();
  });

  it("suppresses logging for 404 lookup errors and skips deadline lookup without user", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    getCurrentUserMock.mockResolvedValue(null);
    getPeerAssessmentDataMock.mockRejectedValue(new ApiError("not found", { status: 404 }));

    const page = await CreateAssessmentPage({
      params: Promise.resolve({ projectId: "50" }),
      searchParams: Promise.resolve({
        teamId: "3",
        revieweeId: "7",
        reviewerId: "6",
      }),
    });
    render(page);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(getProjectDeadlineMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("create-assessment-form")).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("renders no form when no questionnaire questions exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);
    getProjectDeadlineMock.mockRejectedValue(new Error("deadline down"));

    const page = await CreateAssessmentPage({
      params: Promise.resolve({ projectId: "31" }),
      searchParams: Promise.resolve({
        teamId: "1",
        revieweeId: "2",
        reviewerId: "3",
        teammateName: ["Ignored array"],
      }),
    });
    render(page);

    expect(screen.queryByTestId("create-assessment-form")).not.toBeInTheDocument();
  });
});
