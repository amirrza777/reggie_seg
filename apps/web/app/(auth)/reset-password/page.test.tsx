import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchParams } from "next/navigation";
import ResetPasswordPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/components/ResetPasswordForm", () => ({
  ResetPasswordForm: ({ token }: { token: string | null }) => <div data-testid="reset-password-form" data-token={token ?? ""} />,
}));

const useSearchParamsMock = vi.mocked(useSearchParams);

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts and passes a 64-character hex token when embedded in raw query value", () => {
    const token = "a".repeat(64);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "token" ? `prefix-${token}-suffix` : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Set a New Password" })).toBeInTheDocument();
    expect(screen.getByTestId("reset-password-form")).toHaveAttribute("data-token", token);
  });

  it("passes through raw token when no 64-character hex value exists", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "token" ? "short-token" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    expect(screen.getByTestId("reset-password-form")).toHaveAttribute("data-token", "short-token");
  });

  it("passes null token when token parameter is absent", () => {
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordPage />);

    expect(screen.getByTestId("reset-password-form")).toHaveAttribute("data-token", "");
  });
});
