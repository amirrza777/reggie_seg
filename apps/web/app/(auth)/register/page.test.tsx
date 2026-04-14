import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/components/RegisterForm", () => ({
  RegisterForm: () => <div data-testid="register-form" />,
}));

describe("RegisterPage", () => {
  it("renders register header, form, and login footer link", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Create an account" })).toBeInTheDocument();
    expect(screen.getByTestId("register-form")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
