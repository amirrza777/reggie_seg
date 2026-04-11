import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { acceptGlobalAdminInvite, getGlobalAdminInviteState } from "../api/client";
import { AcceptGlobalAdminInviteForm } from "./AcceptGlobalAdminInviteForm";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("../api/client", () => ({
  acceptGlobalAdminInvite: vi.fn(),
  getGlobalAdminInviteState: vi.fn(),
}));

const acceptGlobalAdminInviteMock = acceptGlobalAdminInvite as MockedFunction<typeof acceptGlobalAdminInvite>;
const getGlobalAdminInviteStateMock = getGlobalAdminInviteState as MockedFunction<typeof getGlobalAdminInviteState>;

describe("AcceptGlobalAdminInviteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acceptGlobalAdminInviteMock.mockResolvedValue({ ok: true } as any);
    getGlobalAdminInviteStateMock.mockResolvedValue({ mode: "new_account" });
  });

  it("renders missing token view when token is absent", () => {
    render(<AcceptGlobalAdminInviteForm token={null} />);

    expect(screen.getByText("Invite link is missing or invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Log in" })).toHaveAttribute("href", "/login");
  });

  it("accepts invite and normalizes optional names", async () => {
    render(<AcceptGlobalAdminInviteForm token="tok_123" />);

    expect(await screen.findByLabelText("First Name (Optional)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First Name (Optional)"), { target: { value: "  Alex  " } });
    fireEvent.change(screen.getByLabelText("Last Name (Optional)"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    await waitFor(() =>
      expect(acceptGlobalAdminInviteMock).toHaveBeenCalledWith({
        token: "tok_123",
        newPassword: "Pass1234",
        firstName: "Alex",
        lastName: undefined,
      }),
    );

    expect(await screen.findByText("Global admin access activated.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/app-home");
  });

  it("renders existing-account invite flow and accepts without password fields", async () => {
    getGlobalAdminInviteStateMock.mockResolvedValueOnce({ mode: "existing_account" });

    render(<AcceptGlobalAdminInviteForm token="tok_existing" />);

    expect(await screen.findByText("This email already has an account. Continue to activate global admin access.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Password")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(acceptGlobalAdminInviteMock).toHaveBeenCalledWith({ token: "tok_existing" }),
    );
    expect(await screen.findByText("Global admin access activated.")).toBeInTheDocument();
  });

  it("shows login guidance when existing-account activation requires auth", async () => {
    getGlobalAdminInviteStateMock.mockResolvedValueOnce({ mode: "existing_account" });
    acceptGlobalAdminInviteMock.mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }));

    render(<AcceptGlobalAdminInviteForm token="tok_existing" />);

    expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Sign in with the invited email, then press Next.")).toBeInTheDocument();
  });

  it("shows clearer guidance for invalid or expired invite tokens", async () => {
    getGlobalAdminInviteStateMock.mockRejectedValueOnce(new ApiError("Invalid invite token", { status: 400 }));

    render(<AcceptGlobalAdminInviteForm token="tok_invalid" />);

    expect(
      await screen.findByText("This invite link is invalid, expired, or already used. Ask your administrator for a fresh invite link."),
    ).toBeInTheDocument();
  });
});
