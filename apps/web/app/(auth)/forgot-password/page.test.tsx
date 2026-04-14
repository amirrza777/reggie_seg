import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

vi.mock("@/features/auth/components/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));

describe("ForgotPasswordPage", () => {
  it("renders reset header and forgot-password form", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reset Password" })).toBeInTheDocument();
    expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
    expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
  });
});
