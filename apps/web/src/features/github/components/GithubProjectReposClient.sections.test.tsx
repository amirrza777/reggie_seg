import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  GithubProjectReposClientStatusMessages,
  GithubProjectReposClientTabNav,
  GithubProjectReposMyCodeActivitySection,
  GithubProjectReposTeamCodeActivitySection,
} from "./GithubProjectReposClient.sections";

vi.mock("./GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({ link, chartMode }: { link: { id: number }; chartMode: string }) => (
    <div data-testid={`repo-link-${link.id}`}>{chartMode}</div>
  ),
}));

vi.mock("./GithubProjectReposConfigurationsTab", () => ({
  GithubProjectReposConfigurationsTab: () => <div data-testid="config-tab" />,
}));

vi.mock("./GithubProjectReposRepositoriesTab", () => ({
  GithubProjectReposRepositoriesTab: () => <div data-testid="repositories-tab" />,
}));

describe("GithubProjectReposClient sections", () => {
  it("renders status messages and switches tabs", () => {
    const onChange = vi.fn();
    render(
      <>
        <GithubProjectReposClientStatusMessages info="Connected" error="Broken" />
        <GithubProjectReposClientTabNav activeTab="teamCodeActivity" onChange={onChange} />
      </>,
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Broken")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "My code activity" }));
    expect(onChange).toHaveBeenCalledWith("my-code-activity");
  });

  it("renders the my-code section empty states and linked cards", () => {
    const { rerender } = render(
      <GithubProjectReposMyCodeActivitySection
        loading={false}
        connection={null}
        links={[]}
        coverageByLinkId={{}}
        latestSnapshotByLinkId={{}}
      />,
    );
    expect(screen.getByText(/connect github to view your personal activity analytics/i)).toBeInTheDocument();

    rerender(
      <GithubProjectReposMyCodeActivitySection
        loading={false}
        connection={{ connected: true, account: { login: "alim" } as any }}
        links={[{ id: 1 } as any]}
        coverageByLinkId={{ 1: null }}
        latestSnapshotByLinkId={{ 1: null }}
      />,
    );
    expect(screen.getByTestId("repo-link-1")).toHaveTextContent("personal");

    rerender(
      <GithubProjectReposMyCodeActivitySection
        loading={false}
        connection={{ connected: true, account: { login: "alim" } as any }}
        links={[]}
        coverageByLinkId={{}}
        latestSnapshotByLinkId={{}}
      />,
    );
    expect(screen.getByText(/link a repository first to view personal code activity/i)).toBeInTheDocument();
  });

  it("renders loading state for my-code section", () => {
    render(
      <GithubProjectReposMyCodeActivitySection
        loading
        connection={{ connected: true, account: { login: "alim" } as any }}
        links={[]}
        coverageByLinkId={{}}
        latestSnapshotByLinkId={{}}
      />,
    );

    expect(screen.getByText("Loading personal analytics...")).toBeInTheDocument();
  });

  it("shows config tab only when the connection is missing or app install is required", () => {
    const props = {
      loading: false,
      busy: false,
      linking: false,
      onInstallGithubApp: vi.fn(),
      onDisconnect: vi.fn(),
      onConnect: vi.fn(),
      repositoriesTabProps: {} as any,
    };

    const { rerender } = render(
      <GithubProjectReposTeamCodeActivitySection
        {...props}
        connection={null}
        needsGithubAppInstall={false}
      />,
    );
    expect(screen.getByTestId("config-tab")).toBeInTheDocument();
    expect(screen.getByTestId("repositories-tab")).toBeInTheDocument();

    rerender(
      <GithubProjectReposTeamCodeActivitySection
        {...props}
        connection={{ connected: true, account: { login: "alim" } as any }}
        needsGithubAppInstall={false}
      />,
    );
    expect(screen.queryByTestId("config-tab")).not.toBeInTheDocument();

    rerender(
      <GithubProjectReposTeamCodeActivitySection
        {...props}
        workspaceReadOnly
        connection={null}
        needsGithubAppInstall
      />,
    );
    expect(screen.queryByTestId("config-tab")).not.toBeInTheDocument();
  });
});
