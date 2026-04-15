import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupSections } from "./StaffProjectManageSetupSections";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock("./StaffProjectManageSetupContext", () => ({
  StaffProjectManageSetupProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="setup-provider">{children}</div>
  ),
}));

vi.mock("./sections/StaffProjectManageProjectNameSection", () => ({
  StaffProjectManageProjectNameSection: () => <div data-testid="name-section" />,
}));
vi.mock("./sections/StaffProjectManagePeerTemplateSection", () => ({
  StaffProjectManagePeerTemplateSection: () => <div data-testid="peer-template-section" />,
}));
vi.mock("./sections/StaffProjectManageProjectDeadlinesSection", () => ({
  StaffProjectManageProjectDeadlinesSection: () => <div data-testid="deadlines-section" />,
}));
vi.mock("./sections/StaffProjectManageInfoBoardSection", () => ({
  StaffProjectManageInfoBoardSection: () => <div data-testid="info-board-section" />,
}));
vi.mock("./sections/StaffProjectManageProjectAccessSection", () => ({
  StaffProjectManageProjectAccessSection: () => <div data-testid="access-section" />,
}));
vi.mock("./sections/StaffProjectManageForumSection", () => ({
  StaffProjectManageForumSection: () => <div data-testid="forum-section" />,
}));
vi.mock("./sections/StaffProjectManageFeatureFlagsSection", () => ({
  StaffProjectManageFeatureFlagsSection: () => <div data-testid="flags-section" />,
}));
vi.mock("./sections/StaffProjectManageWarningsSection", () => ({
  StaffProjectManageWarningsSection: () => <div data-testid="warnings-section" />,
}));
vi.mock("./sections/StaffProjectManageArchiveOrDeleteSection", () => ({
  StaffProjectManageArchiveOrDeleteSection: () => <div data-testid="archive-section" />,
}));

const baseInitial: StaffProjectManageSummary = {
  id: 1,
  name: "Project",
  archivedAt: null,
  moduleId: 2,
  moduleArchivedAt: null,
  questionnaireTemplateId: 9,
  questionnaireTemplate: { id: 9, templateName: "Peer Q" },
  projectDeadline: {
    taskOpenDate: "2026-01-01T00:00:00.000Z",
    taskDueDate: "2026-01-15T00:00:00.000Z",
    taskDueDateMcf: "2026-01-22T00:00:00.000Z",
    assessmentOpenDate: "2026-01-16T00:00:00.000Z",
    assessmentDueDate: "2026-01-30T00:00:00.000Z",
    assessmentDueDateMcf: "2026-02-06T00:00:00.000Z",
    feedbackOpenDate: "2026-01-31T00:00:00.000Z",
    feedbackDueDate: "2026-02-14T00:00:00.000Z",
    feedbackDueDateMcf: "2026-02-21T00:00:00.000Z",
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
  },
  hasSubmittedPeerAssessments: false,
  informationText: null,
  projectAccess: {
    moduleLeaders: [],
    moduleTeachingAssistants: [],
    moduleMemberDirectory: [],
    projectStudentIds: [],
  },
  canMutateProjectSettings: true,
};

describe("StaffProjectManageSetupSections", () => {
  it("renders editable description when the project and module are active", () => {
    render(
      <StaffProjectManageSetupSections
        projectId={1}
        initial={baseInitial}
        warningsOk
        warningsConfig={{} as never}
        overviewHref="/staff/projects/1"
        discussionHref="/staff/projects/1/discussion"
        warningsTabHref="/staff/projects/1/warnings"
      />,
    );
    expect(
      screen.getByText(
        /Update project details, student information board, deadlines, staff and student access, peer assessment questionnaire, forum privacy, student tabs, and automatic warning configuration from the staff workspace/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to project/i })).toHaveAttribute("href", "/staff/projects/1");
    expect(screen.getByTestId("name-section")).toBeInTheDocument();
    expect(screen.getByTestId("info-board-section")).toBeInTheDocument();
    expect(screen.getByTestId("peer-template-section")).toBeInTheDocument();
    expect(screen.getByTestId("deadlines-section")).toBeInTheDocument();
    expect(screen.getByTestId("access-section")).toBeInTheDocument();
  });

  it("renders read-only note when the project or module is archived", () => {
    render(
      <StaffProjectManageSetupSections
        projectId={1}
        initial={{ ...baseInitial, archivedAt: "2026-01-01T00:00:00.000Z" }}
        warningsOk={false}
        warningsConfig={null}
        overviewHref="/o"
        discussionHref="/d"
        warningsTabHref="/w"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/read-only while this project is archived/i);
  });
});
