import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const useUserMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/components/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: () => useUserMock(),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("redirects authenticated users to their default workspace", () => {
    useUserMock.mockReturnValue({
      loading: false,
      user: { role: "STUDENT" },
    });

    render(<LoginPage />);

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("renders auth heading, login form, and footer links", () => {
    replace.mockReset();
    useUserMock.mockReturnValue({ loading: false, user: null });
    render(<LoginPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Team Feedback" })).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(replace).not.toHaveBeenCalled();
  });
});
