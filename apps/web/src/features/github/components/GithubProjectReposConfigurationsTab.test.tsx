import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposConfigurationsTab } from "./GithubProjectReposConfigurationsTab";

const styles = {
  panel: {},
  sectionHeader: {},
  sectionKicker: {},
} as const;

describe("GithubProjectReposConfigurationsTab", () => {
  it("shows connect state and calls onConnect when no account is connected", () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);

    render(
      <GithubProjectReposConfigurationsTab
        styles={styles}
        loading={false}
        busy={false}
        connection={{ connected: false, account: null }}
        needsGithubAppInstall={false}
        onInstallGithubApp={vi.fn()}
        onDisconnect={vi.fn().mockResolvedValue(undefined)}
        onConnect={onConnect}
      />
    );

    expect(screen.getByText("No GitHub account connected.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect GitHub" }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("shows install + disconnect actions when connected and app install is needed", () => {
    const onInstallGithubApp = vi.fn();
    const onDisconnect = vi.fn().mockResolvedValue(undefined);

    render(
      <GithubProjectReposConfigurationsTab
        styles={styles}
        loading={false}
        busy={false}
        connection={{
          connected: true,
          account: {
            userId: 1,
            login: "adxmir",
            email: null,
            scopes: null,
            tokenType: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            tokenLastRefreshedAt: null,
            createdAt: "",
            updatedAt: "",
          },
        }}
        needsGithubAppInstall
        onInstallGithubApp={onInstallGithubApp}
        onDisconnect={onDisconnect}
        onConnect={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("Connected as @adxmir")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install GitHub App" }));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onInstallGithubApp).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});

