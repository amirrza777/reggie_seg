import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectOverviewDashboard } from "./ProjectOverviewDashboard";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/ui/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-content">{content}</div>,
}));

function baseProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "11",
    name: "Project Atlas",
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

    expect(screen.getByText("Project Overview")).toBeInTheDocument();
    expect(screen.getByText("Overview and key project information.")).toBeInTheDocument();
    expect(screen.getByText("Deadlines and Schedule")).toBeInTheDocument();
    expect(screen.getByText("Paragraph one.")).toBeInTheDocument();
    expect(screen.getByText("Paragraph two.")).toBeInTheDocument();
    expect(screen.getByText("Create or join a team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to team page" })).toHaveAttribute("href", "/projects/11/team");
  });

  it("renders team card when the user has a team", () => {
    renderDashboard({
      team: {
        id: 99,
        teamName: "Team Rocket",
      },
    });

    expect(screen.getByText(/You are in/i)).toBeInTheDocument();
    expect(screen.getByText("Team Rocket")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to team page" })).toBeInTheDocument();
  });

  it("renders custom allocation prompt without team", () => {
    renderDashboard({ teamFormationMode: "custom" });
    expect(screen.getByText(/questionnaire-based allocation/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete questionnaire" })).toHaveAttribute("href", "/projects/11/team");
  });

  it("renders staff allocation wait prompt without team", () => {
    renderDashboard({ teamFormationMode: "staff" });
    expect(screen.getByText(/Please wait for staff to add you to a team/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Complete questionnaire" })).not.toBeInTheDocument();
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
  });

  it("treats published marking as completed even without archived project", () => {
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
          mark: null,
          formativeFeedback: "Published narrative feedback",
          updatedAt: "2026-01-10T10:30:00.000Z",
          marker: { id: 2, firstName: "Grace", lastName: "Hopper" },
        },
      },
    });

    expect(screen.queryByText("Deadlines and Schedule")).not.toBeInTheDocument();
    expect(screen.getByText("Published narrative feedback")).toBeInTheDocument();
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
});
