import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getFeedbackReview } from "@/features/peerFeedback/api/client";
import {
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
  getQuestionsByProject,
} from "@/features/peerAssessment/api/client";
import StaffPeerAssessmentStudentPage from "./page";

const studentPanelMock = vi.fn(() => <div data-testid="staff-peer-student-panel" />);

vi.mock("@/features/staff/projects/lib/staffTeamContext", () => ({
  getStaffTeamContext: vi.fn(),
}));

vi.mock("@/features/peerFeedback/api/client", () => ({
  getFeedbackReview: vi.fn(),
}));

vi.mock("@/features/peerAssessment/api/client", () => ({
  getPeerAssessmentsForUser: vi.fn(),
  getPeerAssessmentsReceivedForUser: vi.fn(),
  getQuestionsByProject: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffPeerStudentAssessmentsPanel", () => ({
  StaffPeerStudentAssessmentsPanel: (props: unknown) => studentPanelMock(props),
}));

const getStaffTeamContextMock = vi.mocked(getStaffTeamContext);
const getFeedbackReviewMock = vi.mocked(getFeedbackReview);
const getPeerAssessmentsForUserMock = vi.mocked(getPeerAssessmentsForUser);
const getPeerAssessmentsReceivedForUserMock = vi.mocked(getPeerAssessmentsReceivedForUser);
const getQuestionsByProjectMock = vi.mocked(getQuestionsByProject);

const successContext = {
  ok: true as const,
  user: { id: 8 },
  project: { id: 50, moduleId: 9, name: "Project" },
  team: {
    id: 60,
    allocations: [
      { userId: 101, user: { firstName: "Alice", lastName: "Roe" } },
      { userId: 102, user: { firstName: "Bob", lastName: "Yeo" } },
      { userId: 103, user: { firstName: "Cara", lastName: "Dee" } },
    ],
  },
};

describe("StaffPeerAssessmentStudentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when context is not ok", async () => {
    getStaffTeamContextMock.mockResolvedValue({ ok: false, error: "Invalid project or team ID." });

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });

    expect(page).toBeNull();
  });

  it("renders invalid route parameter message", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "x", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(screen.getByText("Invalid route parameters.")).toBeInTheDocument();
  });

  it("renders load error from Error throws", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getPeerAssessmentsForUserMock.mockRejectedValue(new Error("assessment load failed"));
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([]);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(screen.getByText("assessment load failed")).toBeInTheDocument();
  });

  it("renders fallback load error for non-Error throws", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getPeerAssessmentsForUserMock.mockRejectedValue("assessment load failed");
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([]);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(screen.getByText("Failed to load peer assessments.")).toBeInTheDocument();
  });

  it("renders student panel with grouped assessments, labels, and feedback fallback", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getPeerAssessmentsForUserMock.mockResolvedValue([
      {
        id: "a1",
        revieweeUserId: 201,
        firstName: "Peer",
        lastName: "One",
        submittedAt: new Date("2026-04-01T10:00:00.000Z"),
        answers: { q1: "Given answer" },
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([
      {
        id: "r1",
        reviewerUserId: 301,
        firstName: "Reviewer",
        lastName: "A",
        submittedAt: "2026-04-02T10:00:00.000Z",
        answers: { q1: "Received answer" },
      },
      {
        id: "r2",
        reviewerUserId: 302,
        firstName: "Reviewer",
        lastName: "B",
        submittedAt: "2026-04-03T10:00:00.000Z",
        answers: {},
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getQuestionsByProjectMock.mockResolvedValue([
      { id: "q1", text: "Communication quality" },
    ] as Awaited<ReturnType<typeof getQuestionsByProject>>);
    getFeedbackReviewMock.mockImplementation(async (assessmentId: string) => {
      if (assessmentId === "r1") {
        return {
          reviewText: "Staff review",
          agreementsJson: { q1: { selected: "Reasonable", score: 3 } },
        } as Awaited<ReturnType<typeof getFeedbackReview>>;
      }
      throw new Error("missing review");
    });

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(screen.getByText(/Alice Roe.*assessment record/)).toBeInTheDocument();
    expect(studentPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        questionLabels: { q1: "Communication quality" },
        expectedPeerReviews: 2,
        backHref: "/staff/projects/50/teams/60/peer-assessment",
        givenGroups: [
          {
            counterpartId: 201,
            counterpartName: "Peer One",
            assessments: [
              {
                id: "a1",
                submittedAt: "2026-04-01T10:00:00.000Z",
                answers: { q1: "Given answer" },
              },
            ],
          },
        ],
        receivedGroups: [
          {
            counterpartId: 301,
            counterpartName: "Reviewer A",
            assessments: [
              {
                id: "r1",
                submittedAt: "2026-04-02T10:00:00.000Z",
                answers: { q1: "Received answer" },
                feedbackReview: {
                  reviewText: "Staff review",
                  agreementsJson: { q1: { selected: "Reasonable", score: 3 } },
                },
              },
            ],
          },
          {
            counterpartId: 302,
            counterpartName: "Reviewer B",
            assessments: [
              {
                id: "r2",
                submittedAt: "2026-04-03T10:00:00.000Z",
                answers: {},
                feedbackReview: {
                  reviewText: null,
                  agreementsJson: null,
                },
              },
            ],
          },
        ],
      }),
    );
    expect(screen.getByTestId("staff-peer-student-panel")).toBeInTheDocument();
  });

  it("keeps raw question ids when question lookup fails", async () => {
    getStaffTeamContextMock.mockResolvedValue({
      ...successContext,
      team: {
        ...successContext.team,
        allocations: [],
      },
    });
    getPeerAssessmentsForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getQuestionsByProjectMock.mockRejectedValue(new Error("questions unavailable"));

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "999" }),
    });
    render(page);

    expect(screen.getByText(/Student 999.*assessment record/)).toBeInTheDocument();
    expect(studentPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        questionLabels: {},
        expectedPeerReviews: 0,
      }),
    );
  });

  it("falls back to unknown student label when matching student has blank names", async () => {
    getStaffTeamContextMock.mockResolvedValue({
      ...successContext,
      team: {
        ...successContext.team,
        allocations: [{ userId: 101, user: { firstName: "", lastName: "" } }],
      },
    });
    getPeerAssessmentsForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(screen.getByText(/Unknown student.*assessment record/)).toBeInTheDocument();
  });

  it("continues when the optional feedback layer throws at Promise.all level", async () => {
    const context = {
      ...successContext,
      team: {
        ...successContext.team,
        allocations: [{ userId: 101, user: { firstName: "Alice", lastName: "Roe" } }],
      },
    };
    getStaffTeamContextMock.mockResolvedValue(context);
    getPeerAssessmentsForUserMock.mockResolvedValue([] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);

    let idReads = 0;
    const trickyAssessment = {
      get id() {
        idReads += 1;
        if (idReads <= 2) throw new Error("id explosion");
        return "safe-id";
      },
      reviewerUserId: 901,
      firstName: "Reviewer",
      lastName: "Edge",
      submittedAt: "2026-04-04T10:00:00.000Z",
      answers: {},
    };
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([
      trickyAssessment,
    ] as unknown as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);
    getFeedbackReviewMock.mockResolvedValue({ reviewText: null, agreementsJson: null } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    expect(studentPanelMock).toHaveBeenCalled();
    expect(screen.getByTestId("staff-peer-student-panel")).toBeInTheDocument();
  });

  it("groups repeated counterparts and applies fallback labels/answers", async () => {
    getStaffTeamContextMock.mockResolvedValue(successContext);
    getPeerAssessmentsForUserMock.mockResolvedValue([
      {
        id: "g1",
        revieweeUserId: 777,
        firstName: "",
        lastName: "",
        submittedAt: new Date("2026-04-01T10:00:00.000Z"),
        answers: null,
      },
      {
        id: "g2",
        revieweeUserId: 777,
        firstName: "",
        lastName: "",
        submittedAt: "2026-04-02T10:00:00.000Z",
        answers: { q2: "B" },
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsForUser>>);
    getPeerAssessmentsReceivedForUserMock.mockResolvedValue([
      {
        id: "r10",
        reviewerUserId: 888,
        firstName: "",
        lastName: "",
        submittedAt: new Date("2026-04-03T10:00:00.000Z"),
        answers: null,
      },
      {
        id: "r11",
        reviewerUserId: 888,
        firstName: "",
        lastName: "",
        submittedAt: "2026-04-04T10:00:00.000Z",
        answers: { q3: "C" },
      },
    ] as Awaited<ReturnType<typeof getPeerAssessmentsReceivedForUser>>);
    getQuestionsByProjectMock.mockResolvedValue([] as Awaited<ReturnType<typeof getQuestionsByProject>>);
    getFeedbackReviewMock.mockResolvedValue({
      reviewText: undefined,
      agreementsJson: undefined,
    } as Awaited<ReturnType<typeof getFeedbackReview>>);

    const page = await StaffPeerAssessmentStudentPage({
      params: Promise.resolve({ projectId: "50", teamId: "60", studentId: "101" }),
    });
    render(page);

    const lastCall = studentPanelMock.mock.calls.at(-1)?.[0] as {
      givenGroups: Array<{ counterpartName: string; assessments: Array<{ answers: Record<string, unknown>; submittedAt: string }> }>;
      receivedGroups: Array<{
        counterpartName: string;
        assessments: Array<{ answers: Record<string, unknown>; submittedAt: string; feedbackReview: { reviewText: string | null; agreementsJson: Record<string, unknown> | null } }>;
      }>;
    };

    expect(lastCall.givenGroups[0].counterpartName).toBe("Student 777");
    expect(lastCall.givenGroups[0].assessments).toHaveLength(2);
    expect(lastCall.givenGroups[0].assessments[0].answers).toEqual({});
    expect(lastCall.givenGroups[0].assessments[0].submittedAt).toBe("2026-04-01T10:00:00.000Z");
    expect(lastCall.receivedGroups[0].counterpartName).toBe("Student 888");
    expect(lastCall.receivedGroups[0].assessments).toHaveLength(2);
    expect(lastCall.receivedGroups[0].assessments[0].answers).toEqual({});
    expect(lastCall.receivedGroups[0].assessments[0].feedbackReview).toEqual({
      reviewText: null,
      agreementsJson: null,
    });
  });
});
