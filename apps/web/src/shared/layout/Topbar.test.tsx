import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/notifications/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

import { Topbar } from "./Topbar";

describe("Topbar", () => {
  it("renders linked title, leading slot, nav, and actions", () => {
    render(
      <Topbar
        leading={<div>Leading</div>}
        title="Workspace"
        titleHref="/dashboard"
        nav={<nav>Nav</nav>}
        actions={<button type="button">Action</button>}
      />,
    );

    expect(screen.getByText("Leading")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Nav")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });

  it("renders plain title text when no href is provided", () => {
    render(<Topbar title="Simple Title" />);
    expect(screen.getByRole("heading", { level: 1, name: "Simple Title" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Simple Title" })).not.toBeInTheDocument();
  });

  it("renders branded Team Feedback title with link aria label and icon", () => {
    const { container } = render(<Topbar title="Team Feedback" titleHref="/home" />);

    const link = screen.getByRole("link", { name: "Team Feedback" });
    expect(link).toHaveAttribute("href", "/home");
    expect(link).toHaveClass("topbar__title-link");

    const brandIcon = container.querySelector(".topbar__title-icon");
    expect(brandIcon).toHaveAttribute("src", "/team-feedback-mark-32.png");
  });

  it("renders without a title heading when title is omitted", () => {
    render(<Topbar actions={<button type="button">Custom action</button>} />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom action" })).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
