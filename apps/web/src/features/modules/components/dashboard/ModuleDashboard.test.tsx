import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModuleDashboardData, ModuleTimelineItem } from "../../moduleDashboardData";
import {
  ModuleDashboardPageView,
  ModuleExpectationsCard,
  ModuleMarksCard,
  ModuleReadinessCard,
} from "./ModuleDashboard";

function timelineItem(overrides: Partial<ModuleTimelineItem> = {}): ModuleTimelineItem {
  return {
    whenLabel: "Soon",
    whenTone: "soon",
    dateLabel: "Mon 1 Jan",
    projectName: "Proj A",
    activity: "Workshop",
    occursAt: new Date("2026-01-15T12:00:00.000Z"),
    ...overrides,
  };
}

function makeDashboard(overrides: Partial<ModuleDashboardData> = {}): ModuleDashboardData {
  return {
    moduleCode: "MOD-1",
    teamCount: 2,
    projectCount: 1,
    hasLinkedProjects: true,
    marksRows: [],
    timelineRows: [],
    expectationRows: [],
    briefParagraphs: [],
    readinessParagraphs: [],
    ...overrides,
  };
}

describe("ModuleDashboardPageView", () => {
  it("renders toolbar when provided and shows populated cards", () => {
    const dashboard = makeDashboard({
      briefParagraphs: ["Line one", "Line two"],
      readinessParagraphs: ["Ready"],
      marksRows: [["Essay", "72", "Released"]],
      expectationRows: [["Attend labs", "Weekly", "Module team"]],
      timelineRows: [
        timelineItem(),
        timelineItem({
          whenLabel: "Past",
          whenTone: "past",
          projectName: "",
          activity: "Sprint review",
        }),
        timelineItem({
          whenLabel: "Upcoming",
          whenTone: "upcoming",
          projectName: "Solo",
          activity: "",
        }),
        timelineItem({
          whenLabel: "Later",
          whenTone: "upcoming",
          projectName: "",
          activity: "",
        }),
      ],
    });
    render(
      <ModuleDashboardPageView
        dashboard={dashboard}
        toolbar={<button type="button">Extra</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Attend labs")).toBeInTheDocument();
    expect(screen.getByText("Workshop")).toBeInTheDocument();
    expect(screen.getByText("Module timeline checkpoint")).toBeInTheDocument();
    expect(screen.getByText("Essay")).toBeInTheDocument();
  });

  it("renders projects panel slot when provided", () => {
    render(
      <ModuleDashboardPageView
        dashboard={makeDashboard()}
        projectsPanel={<section aria-label="Projects test">Project links here</section>}
      />,
    );
    expect(screen.getByLabelText("Projects test")).toBeInTheDocument();
  });

  it("shows empty-state copy when dashboard sections have no data", () => {
    render(<ModuleDashboardPageView dashboard={makeDashboard()} />);
    expect(screen.getByText("No module brief has been added yet.")).toBeInTheDocument();
    expect(screen.getByText("No project deadlines are scheduled yet.")).toBeInTheDocument();
    expect(screen.getByText("Module expectations have not been added yet.")).toBeInTheDocument();
    expect(screen.getByText("No readiness notes have been added yet.")).toBeInTheDocument();
    expect(screen.getByText("No module marking scheme summary is available here yet.")).toBeInTheDocument();
  });
});

describe("ModuleExpectationsCard", () => {
  it("renders table rows when provided", () => {
    render(
      <ModuleExpectationsCard expectationRows={[["A", "B", "C"]]} />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows empty expectations message", () => {
    render(<ModuleExpectationsCard expectationRows={[]} />);
    expect(screen.getByText("Module expectations have not been added yet.")).toBeInTheDocument();
  });
});

describe("ModuleReadinessCard", () => {
  it("renders paragraphs or empty state", () => {
    const { rerender } = render(<ModuleReadinessCard readinessParagraphs={["Note"]} />);
    expect(screen.getByText("Note")).toBeInTheDocument();
    rerender(<ModuleReadinessCard readinessParagraphs={[]} />);
    expect(screen.getByText("No readiness notes have been added yet.")).toBeInTheDocument();
  });
});

describe("ModuleMarksCard", () => {
  it("renders marks table or empty state", () => {
    const { rerender } = render(<ModuleMarksCard marksRows={[["Quiz", "10", "Draft"]]} />);
    expect(screen.getByText("Quiz")).toBeInTheDocument();
    rerender(<ModuleMarksCard marksRows={[]} />);
    expect(screen.getByText("No module marking scheme summary is available here yet.")).toBeInTheDocument();
  });
});
