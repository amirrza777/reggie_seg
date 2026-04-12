import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchParams } from "next/navigation";
import AcceptGlobalAdminInvitePage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/components/invites/AcceptGlobalAdminInviteForm", () => ({
  AcceptGlobalAdminInviteForm: ({ token }: { token: string | null }) => (
    <div data-testid="accept-global-invite-form" data-token={token ?? ""} />
  ),
}));

const useSearchParamsMock = vi.mocked(useSearchParams);

describe("AcceptGlobalAdminInvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes extracted 64-char hex invite token to the form", () => {
    const token = "a".repeat(64);
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "token" ? `prefix-${token}-suffix` : null),
    } as any);

    render(<AcceptGlobalAdminInvitePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Accept Global Admin Invite" })).toBeInTheDocument();
    expect(screen.getByTestId("accept-global-invite-form")).toHaveAttribute("data-token", token);
  });

  it("passes raw token value when no 64-char match is found", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "token" ? "short-token" : null),
    } as any);

    render(<AcceptGlobalAdminInvitePage />);

    expect(screen.getByTestId("accept-global-invite-form")).toHaveAttribute("data-token", "short-token");
  });

  it("passes null token when search param is missing", () => {
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    } as any);

    render(<AcceptGlobalAdminInvitePage />);

    expect(screen.getByTestId("accept-global-invite-form")).toHaveAttribute("data-token", "");
  });
});
