import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GithubProjectReposHero } from "./GithubProjectReposHero";

describe("GithubProjectReposHero", () => {
  it("renders connected state and counts", () => {
    render(
      <GithubProjectReposHero
        connectedLogin="alice"
        accessibleRepoCount={7}
        linkedRepoCount={1}
        loading={false}
      />
    );

    expect(screen.getByText("Project Repositories")).toBeInTheDocument();
    expect(screen.getByText("GitHub Repository Insights")).toBeInTheDocument();
    expect(screen.getByText("Connected as @alice")).toBeInTheDocument();
    expect(screen.getByText("Accessible repositories")).toBeInTheDocument();
    expect(screen.getByText("Linked repositories")).toBeInTheDocument();
    expect(screen.getByText("Immutable records")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders disconnected/loading state placeholders", () => {
    render(
      <GithubProjectReposHero
        connectedLogin={null}
        accessibleRepoCount={0}
        linkedRepoCount={0}
        loading
      />
    );

    expect(screen.getByText("GitHub not connected")).toBeInTheDocument();
    expect(screen.getAllByText("...").length).toBe(2);
  });
});

