import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectOverviewDashboard } from "./ProjectOverviewDashboard";

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-content">{content}</div>,
}));

function baseProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "11",
    name: "Project Atlas",
    moduleName: "Software Engineering",
    questionnaireTemplateId: 1,
    informationText: "Paragraph one.\n\nParagraph two.",
    ...overrides,
  } as any;
}

function baseDeadline(overrides: Record<string, unknown> = {}) {
  return {
    taskOpenDate: null,
    taskDueDate: "2026-01-20T00:00:00.000Z",
    taskDueDateMcf: null,
    assessmentOpenDate: "2026-01-08T00:00:00.000Z",
    assessmentDueDate: "2026-01-11T00:00:00.000Z",
    assessmentDueDateMcf: null,
    feedbackOpenDate: "2026-01-15T00:00:00.000Z",
    feedbackDueDate: "2026-01-25T00:00:00.000Z",
    feedbackDueDateMcf: null,
    isOverridden: false,
    ...overrides,
  } as any;
}

function renderDashboard(overrides: Record<string, unknown> = {}) {
  return render(
    <ProjectOverviewDashboard
      project={baseProject()}
      deadline={baseDeadline()}
      marking={null}
      team={null}
      teamFormationMode="self"
      {...overrides}
    />,
  );
}

describe("ProjectOverviewDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active project overview with schedule and split information paragraphs", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { level: 1, name: "Project Atlas Overview" })).toBeInTheDocument();
    expect(screen.getByText("Team:")).toBeInTheDocument();
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("Module:")).toBeInTheDocument();
    expect(screen.getByText("Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("Overview and key project information.")).toBeInTheDocument();
    expect(screen.getByText("Deadlines and Schedule")).toBeInTheDocument();
    expect(screen.getByText("Paragraph one.")).toBeInTheDocument();
    expect(screen.getByText("Paragraph two.")).toBeInTheDocument();
  });

  it("shows module fallback when project module name is missing", () => {
    renderDashboard({
      project: baseProject({ moduleName: "", moduleId: 99 }),
    });

    expect(screen.getByText("Module 99")).toBeInTheDocument();
  });

  it("shows team name in the hero when the user has a team", () => {
    renderDashboard({
      team: {
        id: 99,
        teamName: "Team Rocket",
      },
    });

    expect(screen.getByText("Team Rocket")).toBeInTheDocument();
  });

  it("shows custom allocation team status in the hero when team is missing", () => {
    renderDashboard({ teamFormationMode: "custom" });
    expect(screen.getByText("Pending questionnaire allocation")).toBeInTheDocument();
  });

  it("shows staff allocation team status in the hero when team is missing", () => {
    renderDashboard({ teamFormationMode: "staff" });
    expect(screen.getByText("Pending staff allocation")).toBeInTheDocument();
  });

  it("renders all schedule status labels for mixed deadline values", () => {
    renderDashboard({
      deadline: baseDeadline({
        taskOpenDate: null,
        taskDueDate: "not-a-date",
        assessmentOpenDate: "2026-01-09T00:00:00.000Z",
        assessmentDueDate: "2026-01-11T00:00:00.000Z",
        feedbackOpenDate: "2026-01-15T00:00:00.000Z",
        feedbackDueDate: "2026-01-20T00:00:00.000Z",
      }),
    });

    expect(screen.getByText("Unscheduled")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Soon")).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming").length).toBeGreaterThan(0);
  });

  it("renders empty information board content message", () => {
    renderDashboard({
      project: baseProject({ informationText: "   " }),
    });

    expect(screen.getByText("No information board content has been published for this project yet.")).toBeInTheDocument();
  });

  it("shows marking panel for archived project and hides schedule", () => {
    renderDashboard({
      project: baseProject({ archivedAt: "2026-01-09T00:00:00.000Z" }),
      marking: {
        teamId: 3,
        teamMarking: {
          mark: 68,
          formativeFeedback: "Team feedback text",
          updatedAt: "2026-01-10T10:30:00.000Z",
          marker: { id: 2, firstName: "Ada", lastName: "Lovelace" },
        },
        studentMarking: {
          mark: null,
          formativeFeedback: null,
          updatedAt: "invalid-date",
          marker: { id: 8, firstName: "", lastName: "" },
        },
      },
    });

    expect(screen.queryByText("Deadlines and Schedule")).not.toBeInTheDocument();
    expect(screen.getByText("Tutor marking and formative feedback")).toBeInTheDocument();
    expect(screen.getByText("Team mark:")).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByText("Team feedback text")).toBeInTheDocument();
    expect(screen.getByText("Your mark:")).toBeInTheDocument();
    expect(screen.getByText("Not yet published")).toBeInTheDocument();
    expect(screen.getByText("Updated by Staff 8 on Unknown time")).toBeInTheDocument();
    expect(screen.getByText("Project complete. Final mark and feedback are available below.")).toBeInTheDocument();
  });

  it("treats published numeric marks as completed even without archived project", () => {
    renderDashboard({
      deadline: baseDeadline({
        taskDueDate: "2026-01-20T00:00:00.000Z",
        assessmentDueDate: "2026-01-20T00:00:00.000Z",
        feedbackDueDate: "2026-01-20T00:00:00.000Z",
      }),
      marking: {
        teamId: 6,
        teamMarking: null,
        studentMarking: {
          mark: 74,
          formativeFeedback: "Published narrative feedback",
          updatedAt: "2026-01-10T10:30:00.000Z",
          marker: { id: 2, firstName: "Grace", lastName: "Hopper" },
        },
      },
    });

    expect(screen.queryByText("Deadlines and Schedule")).not.toBeInTheDocument();
    expect(screen.getByText("Published narrative feedback")).toBeInTheDocument();
  });

  it("shows awaiting mark card when project is complete without published marks", () => {
    renderDashboard({
      deadline: baseDeadline({
        taskDueDate: "2026-01-05T00:00:00.000Z",
        assessmentDueDate: "2026-01-06T00:00:00.000Z",
        feedbackDueDate: "2026-01-07T00:00:00.000Z",
      }),
      marking: null,
    });

    expect(screen.queryByText("Deadlines and Schedule")).not.toBeInTheDocument();
    expect(screen.getByText("Final marking status")).toBeInTheDocument();
    expect(screen.getByText("This project is complete and currently awaiting final mark publication.")).toBeInTheDocument();
    expect(screen.getByText("Project complete. Final mark is awaiting publication.")).toBeInTheDocument();
    expect(screen.queryByText("Tutor marking and formative feedback")).not.toBeInTheDocument();
  });

  it("omits individual-updated meta line when student marking is missing", () => {
    renderDashboard({
      project: baseProject({ archivedAt: "2026-01-09T00:00:00.000Z" }),
      marking: {
        teamId: 3,
        teamMarking: {
          mark: 55,
          formativeFeedback: null,
          updatedAt: "2026-01-10T10:30:00.000Z",
          marker: { id: 2, firstName: "Ada", lastName: "Lovelace" },
        },
        studentMarking: null,
      },
    });

    expect(screen.queryByText(/Updated by .* on .*Unknown time/)).not.toBeInTheDocument();
    expect(screen.getByText("No individual formative feedback yet.")).toBeInTheDocument();
  });

  it("displays allocation questionnaire window when a template and dates are configured", () => {
    renderDashboard({
      project: baseProject({ teamAllocationQuestionnaireTemplateId: 9 }),
      deadline: baseDeadline({
        teamAllocationQuestionnaireOpenDate: "2026-01-05T00:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-01-12T00:00:00.000Z",
      }),
      teamFormationMode: "custom",
    });

    expect(screen.getByText("Team questionnaire opens")).toBeInTheDocument();
    expect(screen.getByText("Team questionnaire deadline")).toBeInTheDocument();
    expect(screen.getAllByText("Team formation")).toHaveLength(2);
  });

  it("does not display questionnaire schedule rows without an allocation template", () => {
    renderDashboard({
      deadline: baseDeadline({
        teamAllocationQuestionnaireOpenDate: "2026-01-05T00:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-01-12T00:00:00.000Z",
      }),
    });

    expect(screen.queryByText("Team questionnaire opens")).not.toBeInTheDocument();
    expect(screen.queryByText("Team questionnaire deadline")).not.toBeInTheDocument();
  });
});

