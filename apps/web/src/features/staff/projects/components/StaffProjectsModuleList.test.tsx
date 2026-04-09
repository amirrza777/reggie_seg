import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCard, StaffProjectsModuleList, type StaffProject, type ModuleGroup } from "./StaffProjectsModuleList";

function buildProject(overrides: Partial<StaffProject> = {}): StaffProject {
  return {
    id: 10,
    name: "Alpha Project",
    moduleId: 1,
    moduleName: "SEGP",
    archivedAt: null,
    teamCount: 2,
    hasGithubRepo: true,
    daysOld: 5,
    membersTotal: 4,
    membersConnected: 3,
    dateRangeStart: "2026-02-01T09:00:00.000Z",
    dateRangeEnd: "2026-02-03T09:00:00.000Z",
    githubIntegrationPercent: 75,
    trelloBoardsLinkedPercent: 50,
    trelloBoardsLinkedCount: 1,
    peerAssessmentsSubmittedPercent: 25,
    peerAssessmentsSubmittedCount: 2,
    peerAssessmentsExpectedCount: 8,
    ...overrides,
  };
}

describe("StaffProjectsModuleList", () => {
  it("renders no-deadline fallback and zero-state integration tooltips", () => {
    const project = buildProject({
      dateRangeStart: null,
      dateRangeEnd: null,
      teamCount: 0,
      membersTotal: 0,
      membersConnected: 0,
      trelloBoardsLinkedCount: 0,
      peerAssessmentsExpectedCount: 0,
      peerAssessmentsSubmittedCount: 0,
      githubIntegrationPercent: 0,
      trelloBoardsLinkedPercent: 0,
      peerAssessmentsSubmittedPercent: 0,
    });

    render(<ProjectCard project={project} rawQuery={undefined} />);

    expect(screen.getByText("No deadlines scheduled")).toBeInTheDocument();
    expect(screen.getByLabelText(/GitHub: 0 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("No students on active teams yet."),
    );
    expect(screen.getByLabelText(/Trello: 0 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("No active teams yet."),
    );
    expect(screen.getByLabelText(/Assessments: 0 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("No assessments expected yet"),
    );
  });

  it("marks archived projects with pill, tooltip date, and link accessible name", () => {
    const { container } = render(
      <ProjectCard project={buildProject({ archivedAt: "2026-01-15T12:00:00.000Z" })} rawQuery={undefined} />,
    );
    expect(container.querySelector(".staff-projects__module-project-card--archived")).toBeTruthy();
    expect(container.querySelector(".staff-projects__project-archived-pill")).toBeTruthy();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    const pill = screen.getByLabelText(/archived on/i);
    expect(pill).toHaveAttribute("title", pill.getAttribute("aria-label"));
    expect(screen.getByRole("link", { name: /Alpha Project \(archived project\)/i })).toBeInTheDocument();
  });

  it("renders single-day and multi-day deadline labels and non-zero tooltip counts", () => {
    const singleDay = buildProject({
      id: 11,
      dateRangeStart: "2026-02-01T09:00:00.000Z",
      dateRangeEnd: "2026-02-01T12:00:00.000Z",
      teamCount: 1,
      membersTotal: 1,
      membersConnected: 1,
      githubIntegrationPercent: 100,
      trelloBoardsLinkedCount: 1,
      trelloBoardsLinkedPercent: 100,
      peerAssessmentsExpectedCount: 1,
      peerAssessmentsSubmittedCount: 1,
      peerAssessmentsSubmittedPercent: 100,
    });

    const { rerender } = render(<ProjectCard project={singleDay} rawQuery={undefined} />);

    expect(screen.getByText("Feb 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("1 team")).toBeInTheDocument();
    expect(screen.getByText("1 student")).toBeInTheDocument();

    const multiDay = buildProject({
      id: 12,
      dateRangeStart: "2026-02-01T09:00:00.000Z",
      dateRangeEnd: "2026-02-03T09:00:00.000Z",
      membersTotal: 4,
      membersConnected: 3,
      githubIntegrationPercent: 75,
      trelloBoardsLinkedCount: 2,
      teamCount: 2,
      peerAssessmentsExpectedCount: 8,
      peerAssessmentsSubmittedCount: 2,
      peerAssessmentsSubmittedPercent: 25,
    });
    rerender(<ProjectCard project={multiDay} rawQuery={undefined} />);

    expect(screen.getByText(/Feb 1, 2026.*Feb 3, 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText(/GitHub: 75 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("3/4 students linked."),
    );
    expect(screen.getByLabelText(/Trello: 50 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("2/2 teams with a board linked."),
    );
    expect(screen.getByLabelText(/Assessments: 25 percent/i)).toHaveAttribute(
      "title",
      expect.stringContaining("2/8 submitted."),
    );
  });

  it("uses fallback label when formatted dates are invalid", () => {
    render(
      <ProjectCard
        project={buildProject({
          id: 13,
          dateRangeStart: "not-a-date",
          dateRangeEnd: "also-not-a-date",
        })}
        rawQuery={undefined}
      />,
    );

    expect(screen.getByText("No deadlines scheduled")).toBeInTheDocument();
  });

  it("renders grouped modules, totals, and opens groups when searching", () => {
    const modules: ModuleGroup[] = [
      {
        moduleId: 1,
        moduleName: "SEGP Alpha",
        projects: [
          buildProject({ id: 21, name: "Alpha Project", teamCount: 2 }),
          buildProject({ id: 22, name: "Beta Project", teamCount: 1 }),
        ],
      },
    ];

    const { container } = render(
      <StaffProjectsModuleList modules={modules} hasQuery rawQuery="alpha" />,
    );

    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(true);
    expect(screen.getByText("2 projects · 3 teams")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Alpha Project/i })).toHaveAttribute("href", "/staff/projects/21");
    expect(container.querySelector("mark.staff-projects__search-hit")).toBeInTheDocument();
  });

  it("keeps groups collapsed when there is no search query", () => {
    const modules: ModuleGroup[] = [
      {
        moduleId: 2,
        moduleName: "SEGP",
        projects: [buildProject({ id: 30 })],
      },
    ];

    const { container } = render(
      <StaffProjectsModuleList modules={modules} hasQuery={false} rawQuery={undefined} />,
    );

    expect((container.querySelector("details") as HTMLDetailsElement).open).toBe(false);
  });
});
