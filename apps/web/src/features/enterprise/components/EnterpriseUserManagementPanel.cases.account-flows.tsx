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
} from "./EnterpriseUserManagementPanel.cases.shared";
import { EnterpriseUserManagementPanel } from "./EnterpriseUserManagementPanel";

describe("EnterpriseUserManagementPanel", () => {
  beforeEach(() => {
    seedEnterpriseUserManagementPanelCaseDefaults();
  });
  it("shows invite-managed action lock for enterprise-admin rows when current user is not a platform admin", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 41,
          email: "peer-admin@example.com",
          firstName: "Peer",
          lastName: "Admin",
          role: "ENTERPRISE_ADMIN",
          isStaff: true,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());
    expect(screen.getByText("Invite-managed role")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("allows platform admin users to remove enterprise-admin rows", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 41,
          email: "peer-admin@example.com",
          firstName: "Peer",
          lastName: "Admin",
          role: "ENTERPRISE_ADMIN",
          isStaff: true,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ADMIN" />);

    expect(await screen.findByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("shows explicit conflict guidance when account creation email belongs to another enterprise", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(createSearchResponse([]));
    createEnterpriseUserMock.mockRejectedValueOnce(
      new ApiError("This email is already used in another enterprise", { status: 409 }),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(screen.getByText("This email is already used in another enterprise.")).toBeInTheDocument(),
    );
  });

  it("maps enterprise-admin policy errors to invite-flow guidance during remove actions", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 41,
          email: "peer-admin@example.com",
          firstName: "Peer",
          lastName: "Admin",
          role: "ENTERPRISE_ADMIN",
          isStaff: true,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );
    removeEnterpriseUserMock.mockRejectedValueOnce(
      new ApiError("Enterprise admin accounts can only be managed by platform admins", { status: 403 }),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ADMIN" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove user" }));

    await waitFor(() =>
      expect(
        screen.getByText("Enterprise admin accounts are managed through platform-admin invite controls."),
      ).toBeInTheDocument(),
    );
  });

  it("maps enterprise-admin invite-flow policy errors during create actions", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(createSearchResponse([]));
    createEnterpriseUserMock.mockRejectedValueOnce(
      new ApiError("Enterprise admin permissions are managed by invite flow", { status: 403 }),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "enterprise.admin@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(
        screen.getByText("Enterprise admin accounts are managed through platform-admin invite controls."),
      ).toBeInTheDocument(),
    );
  });

  it("creates an account successfully and resets creation inputs", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(createSearchResponse([]));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "new.student@example.com" } });
    fireEvent.change(screen.getByLabelText("New account first name"), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText("New account last name"), { target: { value: "Student" } });
    fireEvent.change(screen.getByLabelText("New account role"), { target: { value: "STAFF" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(createEnterpriseUserMock).toHaveBeenCalledWith({
        email: "new.student@example.com",
        firstName: "New",
        lastName: "Student",
        role: "STAFF",
      }),
    );

    expect(await screen.findByText("Account created or reinstated.")).toBeInTheDocument();
    expect((screen.getByLabelText("New account email") as HTMLInputElement).value).toBe("");
  });

  it("shows validation message when create email is blank", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(createSearchResponse([]));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "   " } });
    fireEvent.submit(screen.getByLabelText("New account email").closest("form") as HTMLFormElement);

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(createEnterpriseUserMock).not.toHaveBeenCalled();
  });
});
