import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { ApiError } from "@/shared/api/errors";

vi.mock("../api/client", () => ({
  getAdminSummary: vi.fn(),
  inviteCurrentEnterpriseAdmin: vi.fn(),
  inviteGlobalAdmin: vi.fn(),
}));

vi.mock("./AuditLogModal", () => ({
  AuditLogModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="audit-log-modal">
        <button onClick={onClose}>Close audit log</button>
      </div>
    ) : null,
}));

import { getAdminSummary, inviteCurrentEnterpriseAdmin, inviteGlobalAdmin } from "../api/client";
import { AdminWorkspaceSummary } from "./AdminWorkspaceSummary";

const getAdminSummaryMock = getAdminSummary as MockedFunction<typeof getAdminSummary>;
const inviteCurrentEnterpriseAdminMock = inviteCurrentEnterpriseAdmin as MockedFunction<typeof inviteCurrentEnterpriseAdmin>;
const inviteGlobalAdminMock = inviteGlobalAdmin as MockedFunction<typeof inviteGlobalAdmin>;

describe("AdminWorkspaceSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSummaryMock.mockResolvedValue({
      users: 150,
      modules: 12,
      teams: 6,
      meetings: 4,
    });
    inviteCurrentEnterpriseAdminMock.mockResolvedValue({
      email: "invite@example.com",
      expiresAt: "2026-04-15T00:00:00.000Z",
    });
    inviteGlobalAdminMock.mockResolvedValue({
      email: "global@example.com",
      expiresAt: "2026-04-15T00:00:00.000Z",
    });
  });

  it("renders overview stats and actions", async () => {
    render(<AdminWorkspaceSummary />);
    expect(screen.getByText(/Workspace snapshot/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite admin/i })).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Modules")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    await waitFor(() => expect(getAdminSummaryMock).toHaveBeenCalled());
  });

  it("sends an admin invite by email from the modal", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));

    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.type(within(modal).getByLabelText(/admin invite email/i), " Invite@Example.com ");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    await waitFor(() => expect(inviteCurrentEnterpriseAdminMock).toHaveBeenCalledWith("invite@example.com"));
    expect(screen.getByText("Enterprise admin invite sent to invite@example.com.")).toBeInTheDocument();
  });

  it("validates email before sending admin invite", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));

    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.type(within(modal).getByLabelText(/admin invite email/i), "invalid-email");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    expect(inviteCurrentEnterpriseAdminMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("shows required-email message when invite input is blank", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    expect(inviteCurrentEnterpriseAdminMock).not.toHaveBeenCalled();
    expect(screen.getByText("Invite email is required.")).toBeInTheDocument();
  });

  it("renders summary load failures and invite fallback error messaging", async () => {
    const user = userEvent.setup();
    getAdminSummaryMock.mockRejectedValueOnce(new Error("summary unavailable"));
    inviteCurrentEnterpriseAdminMock.mockRejectedValueOnce("not-an-error");

    render(<AdminWorkspaceSummary />);

    expect(await screen.findByText("summary unavailable")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.type(within(modal).getByLabelText(/admin invite email/i), "invite@example.com");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    expect(await screen.findByText("Could not send enterprise admin invite.")).toBeInTheDocument();
  });

  it("sends a global-admin invite when global access level is selected", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    const modal = screen.getByRole("dialog", { name: /Invite admin/i });

    await user.selectOptions(within(modal).getByLabelText(/access level/i), "global_admin");
    await user.type(within(modal).getByLabelText(/admin invite email/i), " Global@Example.com ");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    await waitFor(() => expect(inviteGlobalAdminMock).toHaveBeenCalledWith("global@example.com"));
    expect(screen.getByText("Global admin invite sent to global@example.com.")).toBeInTheDocument();
  });

  it("shows a clearer global-invite permission error for non-super-admin users", async () => {
    const user = userEvent.setup();
    inviteGlobalAdminMock.mockRejectedValueOnce(new ApiError("Forbidden", { status: 403 }));
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.selectOptions(within(modal).getByLabelText(/access level/i), "global_admin");
    await user.type(within(modal).getByLabelText(/admin invite email/i), "global@example.com");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    expect(await screen.findByText("Only the super admin can send global admin invites.")).toBeInTheDocument();
  });

  it("supports closing invite modal and opening/closing the audit log", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    expect(screen.getByRole("dialog", { name: /Invite admin/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: /Invite admin/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));
    await user.click(screen.getByRole("dialog", { name: /Invite admin/i }));
    expect(screen.queryByRole("dialog", { name: /Invite admin/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Audit log/i }));
    expect(screen.getByTestId("audit-log-modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Close audit log/i }));
    expect(screen.queryByTestId("audit-log-modal")).not.toBeInTheDocument();
  });
});
