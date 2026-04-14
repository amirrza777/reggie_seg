import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import HelpLayout from "./layout";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/layout/AppShell", () => ({
  AppShell: ({ topbar, children }: { topbar: ReactNode; children: ReactNode }) => (
    <div data-testid="app-shell">
      <div data-testid="topbar-slot">{topbar}</div>
      <div data-testid="app-shell-children">{children}</div>
    </div>
  ),
}));

vi.mock("@/shared/layout/Topbar", () => ({
  Topbar: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="topbar">
      {actions}
    </div>
  ),
}));

vi.mock("@/features/auth/components/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock("./HelpNavGate", () => ({
  HelpNavGate: () => <div data-testid="help-nav-gate" />,
}));

vi.mock("./HelpSectionScroll", () => ({
  HelpSectionScroll: () => <div data-testid="help-section-scroll" />,
}));

vi.mock("@/shared/layout/Footer", () => ({
  Footer: () => <footer data-testid="help-footer" />,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("HelpLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows suspended account notice", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ suspended: true, active: true } as any);

    const layout = await HelpLayout({ children: <div>child</div> });
    render(layout);

    expect(screen.getByText("Account suspended")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  });

  it("renders help shell for active users", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ suspended: false, active: true } as any);

    const layout = await HelpLayout({ children: <div data-testid="help-child">content</div> });
    render(layout);

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.getByTestId("help-nav-gate")).toBeInTheDocument();
    expect(screen.getByTestId("help-section-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("help-footer")).toBeInTheDocument();
    expect(screen.getByTestId("help-child")).toBeInTheDocument();
  });
});
