import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BranchActivitySection } from "./GithubRepoChartsDashboard.BranchActivitySection";

vi.mock("@/shared/ui/Button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/ui/skeletons/Skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton-text" />,
}));

vi.mock("./GithubRepoChartsDashboard.MetricGrid", () => ({
  GithubRepoMetricsGrid: ({ metrics }: { metrics: Array<{ label: string; value: string }> }) => (
    <div data-testid="metrics">{metrics.map((metric) => metric.label).join(",")}</div>
  ),
}));

describe("BranchActivitySection", () => {
  it("renders metrics, branch selector, and commit rows with metadata", () => {
    const onSelectBranch = vi.fn();
    const onRefreshBranches = vi.fn();

    render(
      <BranchActivitySection
        totalBranchCommits={18}
        branchCount={2}
        defaultBranchName="main"
        commitsByBranch={{ main: 10, dev: 8 }}
        liveBranches={{
          linkId: 1,
          repository: { id: 1, fullName: "org/repo", defaultBranch: "main", htmlUrl: "https://example.com" },
          branches: [
            { name: "main", isDefault: true },
            { name: "dev", isDefault: false },
          ],
        } as any}
        liveBranchesLoading={false}
        liveBranchesError={null}
        liveBranchesRefreshing={false}
        selectedBranch="dev"
        onSelectBranch={onSelectBranch}
        branchCommits={{
          linkId: 1,
          repository: { id: 1, fullName: "org/repo", defaultBranch: "main", htmlUrl: "https://example.com" },
          branch: "dev",
          commits: [
            {
              sha: "abcdef123456",
              htmlUrl: "https://example.com/commit/1",
              message: "Improve dashboard metrics",
              authorLogin: "ayan",
              authorEmail: null,
              date: "2026-03-10T10:00:00.000Z",
              additions: 12,
              deletions: 3,
            },
            {
              sha: "11223344",
              htmlUrl: "https://example.com/commit/2",
              message: "",
              authorLogin: "",
              authorEmail: "",
              date: null,
              additions: null,
              deletions: null,
            },
          ],
        } as any}
        branchCommitsLoading={false}
        branchCommitsError={null}
        onRefreshBranches={onRefreshBranches}
      />,
    );

    expect(screen.getByTestId("metrics")).toHaveTextContent("Default branch,Tracked branches,All branch commits");
    expect(screen.getByText("Branch commits")).toBeInTheDocument();
    expect(screen.getByText("8 snapshot commits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Improve dashboard metrics" })).toBeInTheDocument();
    expect(screen.getByText("(no message)")).toBeInTheDocument();
    expect(screen.getByText("Unknown date")).toBeInTheDocument();
    expect(screen.getByText("+12 / -3")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Select branch"), { target: { value: "main" } });
    expect(onSelectBranch).toHaveBeenCalledWith("main");

    fireEvent.click(screen.getByRole("button", { name: "Refresh branches" }));
    expect(onRefreshBranches).toHaveBeenCalled();
  });

  it("renders loading and error states for branches and commits", () => {
    render(
      <BranchActivitySection
        totalBranchCommits={0}
        branchCount={0}
        defaultBranchName="main"
        commitsByBranch={{}}
        liveBranches={null}
        liveBranchesLoading
        liveBranchesError="branches offline"
        liveBranchesRefreshing
        selectedBranch="main"
        branchCommits={null}
        branchCommitsLoading
        branchCommitsError="commits unavailable"
      />,
    );

    expect(screen.getByText("Failed to load branches: branches offline")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load commits: commits unavailable")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Refresh branches" })).not.toBeInTheDocument();
  });
});
