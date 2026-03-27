import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/components/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders auth heading, login form, and footer links", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Team Feedback" })).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  });
});
