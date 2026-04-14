import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GithubSectionContainer } from "./GithubSectionContainer";

describe("GithubSectionContainer", () => {
  it("renders kicker/title and optional description", () => {
    render(
      <GithubSectionContainer kicker="Kicker" title="Title" description="Description">
        <div>Children</div>
      </GithubSectionContainer>,
    );

    expect(screen.getByText("Kicker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });

  it("omits description when none is provided", () => {
    render(
      <GithubSectionContainer kicker="Kicker" title="Title">
        <div>Children</div>
      </GithubSectionContainer>,
    );

    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });
});
