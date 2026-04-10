import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  getAdminSummary: vi.fn(),
  inviteCurrentEnterpriseAdmin: vi.fn(),
}));

import { getAdminSummary, inviteCurrentEnterpriseAdmin } from "../api/client";
import { AdminWorkspaceSummary } from "./AdminWorkspaceSummary";

const getAdminSummaryMock = getAdminSummary as MockedFunction<typeof getAdminSummary>;
const inviteCurrentEnterpriseAdminMock = inviteCurrentEnterpriseAdmin as MockedFunction<typeof inviteCurrentEnterpriseAdmin>;

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
    await user.type(within(modal).getByLabelText(/enterprise admin invite email/i), " Invite@Example.com ");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    await waitFor(() => expect(inviteCurrentEnterpriseAdminMock).toHaveBeenCalledWith("invite@example.com"));
    expect(screen.getByText("Invite sent to invite@example.com.")).toBeInTheDocument();
  });

  it("validates email before sending admin invite", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));

    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.type(within(modal).getByLabelText(/enterprise admin invite email/i), "invalid-email");
    await user.click(within(modal).getByRole("button", { name: /Send invite/i }));

    expect(inviteCurrentEnterpriseAdminMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });
});
