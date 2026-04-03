import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectOverview } from "./ProjectOverview";

describe("ProjectOverview", () => {
  it("renders fallback project when prop is missing", () => {
    render(<ProjectOverview />);
    expect(screen.getByText("Capstone Project")).toBeInTheDocument();
    expect(screen.getByText("Project overview.")).toBeInTheDocument();
    expect(screen.getByText("project-123")).toBeInTheDocument();
  });

  it("renders provided project details", () => {
    render(
      <ProjectOverview
        project={
          {
            id: "proj-99",
            name: "Final Demo",
            summary: "Prepare investor demo.",
            questionnaireTemplateId: 1,
          } as any
        }
      />,
    );

    expect(screen.getByText("Final Demo")).toBeInTheDocument();
    expect(screen.getByText("Project overview.")).toBeInTheDocument();
    expect(screen.getByText("proj-99")).toBeInTheDocument();
  });
});
