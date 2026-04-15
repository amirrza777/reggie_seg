import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubContributorCard } from "./GithubContributorCard";

vi.mock("recharts", () => {
  const makeComponent = (name: string) => ({ children }: { children?: React.ReactNode }) =>
    <div data-testid={name}>{children}</div>;
  return {
    ResponsiveContainer: makeComponent("ResponsiveContainer"),
    BarChart: makeComponent("BarChart"),
    CartesianGrid: makeComponent("CartesianGrid"),
    XAxis: makeComponent("XAxis"),
    YAxis: makeComponent("YAxis"),
    Tooltip: ({
      formatter,
      labelFormatter,
    }: {
      formatter?: (value: unknown, name: string) => [string, string];
      labelFormatter?: (label: unknown) => string;
    }) => (
      <div data-testid="Tooltip">
        {formatter ? formatter(12, "Commits")[0] : ""}
        {"|"}
        {labelFormatter ? labelFormatter("2026-03-04") : ""}
      </div>
    ),
    Bar: makeComponent("Bar"),
  };
});

function makeContributor(overrides?: Partial<any>) {
  return {
    rank: 1,
    name: "Ali Mohammed",
    login: "alim",
    commits: 12,
    additions: 120,
    deletions: 15,
    commitsByDay: {
      "2026-03-01": 1,
      "2026-03-02": 3,
      "2026-03-04": 2,
    },
    ...overrides,
  };
}

describe("GithubContributorCard", () => {
  it("renders an interactive contributor card with weekly summary", () => {
    render(
      <GithubContributorCard
        contributor={makeContributor()}
        repositoryFullName="team/repo"
        showWeeklyCommitSummary
        weeklyDenominator={4}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "https://github.com/team/repo/graphs/contributors");
    expect(screen.getByText("Ali Mohammed")).toBeInTheDocument();
    expect(screen.getByText("12 commits")).toBeInTheDocument();
    expect(screen.getByText("Active coding weeks")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByTestId("BarChart")).toBeInTheDocument();
  });

  it("falls back to initials and empty-state messaging when no chart data exists", () => {
    render(
      <GithubContributorCard
        contributor={makeContributor({ login: null, commitsByDay: {} })}
        showWeeklyCommitSummary
      />,
    );

    expect(screen.getByText("AM")).toBeInTheDocument();
    expect(screen.getByText("No weekly breakdown available")).toBeInTheDocument();
    expect(screen.getByText("No daily breakdown available")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("falls back to initials after avatar load error and supports no-weekly-summary mode", () => {
    render(
      <GithubContributorCard
        contributor={makeContributor({ name: "  ", commitsByDay: { "2026-03-01": 4 } })}
      />,
    );

    const avatar = document.querySelector("img");
    expect(avatar).not.toBeNull();
    if (avatar) {
      fireEvent.error(avatar);
    }

    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.queryByText("Active coding weeks")).not.toBeInTheDocument();
    expect(screen.getByTestId("Tooltip").textContent).toContain("|");
  });
});
