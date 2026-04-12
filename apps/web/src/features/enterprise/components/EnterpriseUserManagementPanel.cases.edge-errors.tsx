/* eslint-disable max-lines-per-function */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/errors";
import {
  createEnterpriseUserMock,
  createSearchResponse,
  removeEnterpriseUserMock,
  searchEnterpriseUsersMock,
  seedEnterpriseUserManagementPanelCaseDefaults,
  updateEnterpriseUserMock,
} from "./EnterpriseUserManagementPanel.cases.shared";
import { EnterpriseUserManagementPanel } from "./EnterpriseUserManagementPanel";

describe("EnterpriseUserManagementPanel", () => {
  beforeEach(() => {
    seedEnterpriseUserManagementPanelCaseDefaults();
  });
  it("shows load failures", async () => {
    searchEnterpriseUsersMock.mockRejectedValueOnce(new Error("Could not load users"));
    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ADMIN" />);
    expect(await screen.findByText("Could not load users")).toBeInTheDocument();
  });

  it("maps platform-admin and user-not-found mutation messages", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 77,
          email: "person@example.com",
          firstName: "Per",
          lastName: "Son",
          role: "STUDENT",
          isStaff: false,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );
    createEnterpriseUserMock.mockRejectedValueOnce(new ApiError("platform admin accounts cannot be managed", { status: 400 }));
    removeEnterpriseUserMock.mockRejectedValueOnce(new ApiError("user not found", { status: 404 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ADMIN" />);

    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "admin@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Platform admin accounts cannot be managed from enterprise users.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove user" }));
    expect(await screen.findByText("This account is no longer available for this enterprise.")).toBeInTheDocument();
  });

  it("supports role downgrade to student and normalizes missing active/role fields", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 55,
          email: "staffish@example.com",
          firstName: "Staff",
          lastName: "Ish",
          isStaff: true,
          active: undefined,
          role: undefined,
          membershipStatus: undefined,
        },
      ]),
    );
    updateEnterpriseUserMock.mockResolvedValueOnce({
      id: 55,
      email: "staffish@example.com",
      firstName: "Staff",
      lastName: "Ish",
      role: "STUDENT",
      isStaff: false,
      active: true,
      membershipStatus: "active",
    });

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    const studentButton = await screen.findByRole("button", { name: "Student" });
    fireEvent.click(studentButton);

    await waitFor(() => expect(updateEnterpriseUserMock).toHaveBeenCalledWith(55, { role: "STUDENT" }));
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows status-update failures and preserves custom ApiError messages", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 62,
          email: "inactive@example.com",
          firstName: "In",
          lastName: "Active",
          role: "STUDENT",
          isStaff: false,
          active: false,
          membershipStatus: "inactive",
        },
      ]),
    );
    updateEnterpriseUserMock.mockRejectedValueOnce(new ApiError("Reinstate failed upstream", { status: 418 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.click(await screen.findByRole("button", { name: "Reinstate" }));
    expect(await screen.findByText("Reinstate failed upstream")).toBeInTheDocument();
  });

  it("allows remove cancellation from confirmation modal", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 97,
          email: "cancel@example.com",
          firstName: "Can",
          lastName: "Cel",
          role: "STUDENT",
          isStaff: false,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ADMIN" />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Remove user" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove user" })).not.toBeInTheDocument());
    expect(removeEnterpriseUserMock).not.toHaveBeenCalled();
  });
});
