import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { acceptEnterpriseAdminInvite, getEnterpriseAdminInviteState } from "../../api/client";
import { AcceptEnterpriseAdminInviteForm } from "./AcceptEnterpriseAdminInviteForm";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("../../api/client", () => ({
  acceptEnterpriseAdminInvite: vi.fn(),
  getEnterpriseAdminInviteState: vi.fn(),
}));

const acceptEnterpriseAdminInviteMock = acceptEnterpriseAdminInvite as MockedFunction<typeof acceptEnterpriseAdminInvite>;
const getEnterpriseAdminInviteStateMock = getEnterpriseAdminInviteState as MockedFunction<typeof getEnterpriseAdminInviteState>;

describe("AcceptEnterpriseAdminInviteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acceptEnterpriseAdminInviteMock.mockResolvedValue({ ok: true } as any);
    getEnterpriseAdminInviteStateMock.mockResolvedValue({ mode: "new_account" });
  });

  it("renders missing token view when token is absent", () => {
    render(<AcceptEnterpriseAdminInviteForm token={null} />);

    expect(screen.getByText("Invite link is missing or invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Log in" })).toHaveAttribute("href", "/login");
  });

  it("accepts invite and normalizes optional names", async () => {
    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);

    expect(await screen.findByLabelText("First Name (Optional)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First Name (Optional)"), { target: { value: "  Alex  " } });
    fireEvent.change(screen.getByLabelText("Last Name (Optional)"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    await waitFor(() =>
      expect(acceptEnterpriseAdminInviteMock).toHaveBeenCalledWith({
        token: "tok_123",
        newPassword: "Pass1234",
        firstName: "Alex",
        lastName: undefined,
      }),
    );

    expect(await screen.findByText("Enterprise admin access activated.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/app-home");
  });

  it("shows API error messages", async () => {
    acceptEnterpriseAdminInviteMock.mockRejectedValueOnce(new Error("Invite expired"));

    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);
    expect(await screen.findByLabelText("Create Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Invite expired")).toBeInTheDocument();
  });

  it("shows fallback message for non-error failures", async () => {
    acceptEnterpriseAdminInviteMock.mockRejectedValueOnce("bad");

    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);
    expect(await screen.findByLabelText("Create Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Could not accept invite.")).toBeInTheDocument();
  });

  it("validates password confirmation before submit", async () => {
    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);
    expect(await screen.findByLabelText("Create Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(acceptEnterpriseAdminInviteMock).not.toHaveBeenCalled();
  });

  it("requires a non-empty password before submit", async () => {
    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);
    expect(await screen.findByLabelText("Create Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(acceptEnterpriseAdminInviteMock).not.toHaveBeenCalled();
  });

  it("renders existing-account invite flow and accepts without password fields", async () => {
    getEnterpriseAdminInviteStateMock.mockResolvedValueOnce({ mode: "existing_account" });

    render(<AcceptEnterpriseAdminInviteForm token="tok_existing" />);

    expect(await screen.findByText("This email already has an account. Continue to activate enterprise admin access.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Password")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(acceptEnterpriseAdminInviteMock).toHaveBeenCalledWith({ token: "tok_existing" }),
    );
    expect(await screen.findByText("Enterprise admin access activated.")).toBeInTheDocument();
  });

  it("shows login guidance when existing-account activation requires auth", async () => {
    getEnterpriseAdminInviteStateMock.mockResolvedValueOnce({ mode: "existing_account" });
    acceptEnterpriseAdminInviteMock.mockRejectedValueOnce(new ApiError("Unauthorized", { status: 401 }));

    render(<AcceptEnterpriseAdminInviteForm token="tok_existing" />);

    expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Sign in with the invited email, then press Next.")).toBeInTheDocument();
  });

  it("shows invite validation errors when state lookup fails", async () => {
    getEnterpriseAdminInviteStateMock.mockRejectedValueOnce("bad-state");

    render(<AcceptEnterpriseAdminInviteForm token="tok_invalid" />);

    expect(await screen.findByText("Could not validate invite.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Log in" })).toHaveAttribute("href", "/login");
  });

  it("shows clearer guidance for invalid or expired invite tokens", async () => {
    getEnterpriseAdminInviteStateMock.mockRejectedValueOnce(new ApiError("Invalid invite token", { status: 400 }));

    render(<AcceptEnterpriseAdminInviteForm token="tok_invalid" />);

    expect(
      await screen.findByText("This invite link is invalid, expired, or already used. Ask your administrator for a fresh invite link."),
    ).toBeInTheDocument();
  });
});
