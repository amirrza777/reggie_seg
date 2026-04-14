import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConnectedAccountsSection } from "./page.profile-settings.connected-accounts";

vi.mock("@/shared/ui/skeletons/Skeleton", () => ({
  Skeleton: () => <span data-testid="inline-skeleton" />,
}));

const baseProps = {
  trelloProfile: null,
  trelloLinkLoading: false,
  onTrelloConnect: vi.fn(),
  githubLoading: false,
  githubConnection: null,
  githubBusy: false,
  onGithubConnect: vi.fn(),
  onGithubDisconnect: vi.fn(),
};

describe("ConnectedAccountsSection", () => {
  it("shows link actions for disconnected accounts", () => {
    render(<ConnectedAccountsSection {...baseProps} />);

    expect(screen.getAllByText("Not linked")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Link Trello account" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect GitHub" }));

    expect(baseProps.onTrelloConnect).toHaveBeenCalled();
    expect(baseProps.onGithubConnect).toHaveBeenCalled();
  });

  it("renders loading and connected states for Trello and GitHub", () => {
    const { rerender } = render(
      <ConnectedAccountsSection
        {...baseProps}
        githubLoading
        trelloProfile={{ trelloMemberId: "abc", fullName: "Ayan Mamun", username: "ayan" } as any}
      />,
    );

    expect(screen.getByText("Ayan Mamun")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change account" })).toBeInTheDocument();
    expect(screen.getByTestId("inline-skeleton")).toBeInTheDocument();

    rerender(
      <ConnectedAccountsSection
        {...baseProps}
        githubConnection={{ connected: true, account: { login: "ayan-dev" } as any }}
      />,
    );
    expect(screen.getByText("@ayan-dev")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect GitHub" }));
    expect(baseProps.onGithubDisconnect).toHaveBeenCalled();
  });

  it("shows generic GitHub connected label when account login is missing", () => {
    render(
      <ConnectedAccountsSection
        {...baseProps}
        githubConnection={{ connected: true, account: null }}
      />,
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
