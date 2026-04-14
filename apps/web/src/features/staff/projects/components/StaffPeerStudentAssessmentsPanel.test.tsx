import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  StaffPeerStudentAssessmentsPanel,
  type StaffPeerAssessmentGroup,
} from "./StaffPeerStudentAssessmentsPanel";

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-viewer">{content}</div>,
}));

describe("StaffPeerStudentAssessmentsPanel", () => {
  const questionLabels = { q1: "Motivation" };

  it("shows empty copy on each tab and expected peer counts in labels", () => {
    render(
      <StaffPeerStudentAssessmentsPanel
        focusStudentName="Pat Example"
        questionLabels={questionLabels}
        expectedPeerReviews={3}
        givenGroups={[]}
        receivedGroups={[]}
      />,
    );
    expect(screen.getByRole("tab", { name: /Assessments given \(0\/3\)/ })).toBeInTheDocument();
    expect(screen.getByText("This student has not submitted any peer assessments about teammates yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Assessments received/ }));
    expect(
      screen.getByText("No peer assessments from teammates are recorded for this student yet."),
    ).toBeInTheDocument();
  });

  it("sorts counterpart groups alphabetically and renders answers", () => {
    const givenGroups: StaffPeerAssessmentGroup[] = [
      {
        counterpartId: 2,
        counterpartName: "Zed Student",
        assessments: [
          {
            id: "a1",
            submittedAt: "2026-01-15T12:00:00.000Z",
            answers: { q1: "High" },
          },
        ],
      },
      {
        counterpartId: 1,
        counterpartName: "Amy Student",
        assessments: [
          {
            id: "a2",
            submittedAt: "2026-01-10T12:00:00.000Z",
            answers: {},
          },
        ],
      },
    ];
    render(
      <StaffPeerStudentAssessmentsPanel
        focusStudentName="Pat Example"
        questionLabels={questionLabels}
        expectedPeerReviews={0}
        givenGroups={givenGroups}
        receivedGroups={[]}
      />,
    );
    const cardTitles = screen.getAllByRole("heading", { level: 3 });
    expect(cardTitles[0]).toHaveTextContent("Pat Example reviewing Amy Student");
    expect(cardTitles[1]).toHaveTextContent("Pat Example reviewing Zed Student");
    expect(screen.getByText("No answers stored for this submission.")).toBeInTheDocument();
    expect(screen.getByText(/Motivation:/)).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("on received tab shows feedback via rich viewer, empty copy when review is blank, and agreement pill on the question row", () => {
    const receivedGroups: StaffPeerAssessmentGroup[] = [
      {
        counterpartId: 9,
        counterpartName: "Peer Nine",
        assessments: [
          {
            id: "r1",
            submittedAt: "2026-02-01T08:00:00.000Z",
            answers: { q1: "" },
            feedbackReview: {
              reviewText: "   ",
              agreementsJson: { q1: { selected: "Agree", score: 4 } },
            },
          },
        ],
      },
    ];
    render(
      <StaffPeerStudentAssessmentsPanel
        focusStudentName="Pat Example"
        questionLabels={questionLabels}
        expectedPeerReviews={2}
        givenGroups={[]}
        receivedGroups={receivedGroups}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Assessments received \(1\/2\)/ }));
    const receivedHeading = screen.getByRole("heading", { level: 3 });
    expect(receivedHeading).toHaveTextContent("Peer Nine reviewing Pat Example");
    expect(screen.getByText("No written response submitted yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("rich-text-viewer")).not.toBeInTheDocument();
    expect(screen.getByText("No response")).toBeInTheDocument();
    expect(screen.getByText("Student feedback response")).toBeInTheDocument();
    expect(screen.getByTitle("Agree (4/5)")).toHaveTextContent("Agree");
    expect(screen.queryByText(/Agreement selections/)).not.toBeInTheDocument();
  });

  it("renders lexical review text through RichTextViewer when content is present", () => {
    const lexical = JSON.stringify({ root: { children: [], direction: null, format: "", indent: 0, type: "root", version: 1 } });
    const receivedGroups: StaffPeerAssessmentGroup[] = [
      {
        counterpartId: 9,
        counterpartName: "Peer Nine",
        assessments: [
          {
            id: "r1",
            submittedAt: "2026-02-01T08:00:00.000Z",
            answers: { q1: "ok" },
            feedbackReview: { reviewText: lexical, agreementsJson: null },
          },
        ],
      },
    ];
    render(
      <StaffPeerStudentAssessmentsPanel
        focusStudentName="Pat Example"
        questionLabels={questionLabels}
        expectedPeerReviews={0}
        givenGroups={[]}
        receivedGroups={receivedGroups}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Assessments received/ }));
    const viewers = screen.getAllByTestId("rich-text-viewer").map((el) => el.textContent);
    expect(viewers).toContain("ok");
    expect(viewers).toContain(lexical);
  });
});
