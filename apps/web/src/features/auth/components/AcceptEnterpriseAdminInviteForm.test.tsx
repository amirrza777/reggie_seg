import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { acceptEnterpriseAdminInvite } from "../api/client";
import { AcceptEnterpriseAdminInviteForm } from "./AcceptEnterpriseAdminInviteForm";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("../api/client", () => ({
  acceptEnterpriseAdminInvite: vi.fn(),
}));

const acceptEnterpriseAdminInviteMock = acceptEnterpriseAdminInvite as MockedFunction<typeof acceptEnterpriseAdminInvite>;

describe("AcceptEnterpriseAdminInviteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acceptEnterpriseAdminInviteMock.mockResolvedValue({ ok: true } as any);
  });

  it("renders missing token view when token is absent", () => {
    render(<AcceptEnterpriseAdminInviteForm token={null} />);

    expect(screen.getByText("Invite link is missing or invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Log in" })).toHaveAttribute("href", "/login");
  });

  it("accepts invite and normalizes optional names", async () => {
    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);

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

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Invite expired")).toBeInTheDocument();
  });

  it("shows fallback message for non-error failures", async () => {
    acceptEnterpriseAdminInviteMock.mockRejectedValueOnce("bad");

    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Could not accept invite.")).toBeInTheDocument();
  });

  it("validates password confirmation before submit", async () => {
    render(<AcceptEnterpriseAdminInviteForm token="tok_123" />);

    fireEvent.change(screen.getByLabelText("Create Password"), { target: { value: "Pass1234" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Pass12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(acceptEnterpriseAdminInviteMock).not.toHaveBeenCalled();
  });
});
