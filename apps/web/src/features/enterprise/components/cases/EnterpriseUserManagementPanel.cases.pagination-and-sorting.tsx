/* eslint-disable max-lines-per-function */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/errors";
import {
  createSearchResponse,
  searchEnterpriseUsersMock,
  seedEnterpriseUserManagementPanelCaseDefaults,
  updateEnterpriseUserMock,
} from "./EnterpriseUserManagementPanel.cases.shared";
import { EnterpriseUserManagementPanel } from "../EnterpriseUserManagementPanel";

describe("EnterpriseUserManagementPanel", () => {
  beforeEach(() => {
    seedEnterpriseUserManagementPanelCaseDefaults();
  });
  it("updates role optimistically and reloads users", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 41,
          email: "member@example.com",
          firstName: "Member",
          lastName: "One",
          role: "STUDENT",
          isStaff: false,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );
    updateEnterpriseUserMock.mockResolvedValueOnce({
      id: 41,
      email: "member@example.com",
      firstName: "Member",
      lastName: "One",
      role: "STAFF",
      isStaff: true,
      active: true,
      membershipStatus: "active",
    });

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    const staffButton = await screen.findByRole("button", { name: "Staff" });
    fireEvent.click(staffButton);

    await waitFor(() => expect(updateEnterpriseUserMock).toHaveBeenCalledWith(41, { role: "STAFF" }));
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledTimes(2));
  });

  it("shows permission guidance when role update is forbidden", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 41,
          email: "member@example.com",
          firstName: "Member",
          lastName: "One",
          role: "STUDENT",
          isStaff: false,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );
    updateEnterpriseUserMock.mockRejectedValueOnce(new ApiError("Forbidden", { status: 403 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.click(await screen.findByRole("button", { name: "Staff" }));

    expect(await screen.findByText("You do not have permission to manage this account.")).toBeInTheDocument();
  });

  it("reinstates inactive users from the action column", async () => {
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
    updateEnterpriseUserMock.mockResolvedValueOnce({
      id: 62,
      email: "inactive@example.com",
      firstName: "In",
      lastName: "Active",
      role: "STUDENT",
      isStaff: false,
      active: true,
      membershipStatus: "active",
    });

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    fireEvent.click(await screen.findByRole("button", { name: "Reinstate" }));

    await waitFor(() => expect(updateEnterpriseUserMock).toHaveBeenCalledWith(62, { active: true }));
  });

  it("shows current account and platform-admin labels", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 99,
          email: "current@example.com",
          firstName: "Current",
          lastName: "User",
          role: "STAFF",
          isStaff: true,
          active: true,
          membershipStatus: "active",
        },
        {
          id: 1,
          email: "platform@example.com",
          firstName: "Platform",
          lastName: "Admin",
          role: "ADMIN",
          isStaff: true,
          active: true,
          membershipStatus: "inactive",
        },
      ]),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());
    expect(screen.getByText("Current account")).toBeInTheDocument();
    expect(screen.getByText("Platform admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("handles page jump interactions", async () => {
    const singleUser = [
      {
        id: 501,
        email: "page@example.com",
        firstName: "Page",
        lastName: "User",
        role: "STUDENT",
        isStaff: false,
        active: true,
        membershipStatus: "active",
      },
    ];
    searchEnterpriseUsersMock
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 1, pageSize: 10 }))
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 2, pageSize: 10 }))
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 3, pageSize: 10 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());

    const pageInput = await screen.findByLabelText("Go to enterprise users page number");
    fireEvent.change(pageInput, { target: { value: "2" } });
    fireEvent.blur(pageInput);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.change(pageInput, { target: { value: "3" } });
    fireEvent.submit(pageInput.closest("form") as HTMLFormElement);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 3 })));
  });

  it("handles previous/next pagination buttons and resets invalid page input", async () => {
    const singleUser = [
      {
        id: 701,
        email: "pager@example.com",
        firstName: "Pager",
        lastName: "User",
        role: "STUDENT",
        isStaff: false,
        active: true,
        membershipStatus: "active",
      },
    ];
    searchEnterpriseUsersMock
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 1, pageSize: 10 }))
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 2, pageSize: 10 }))
      .mockResolvedValueOnce(createSearchResponse(singleUser, { total: 21, totalPages: 3, page: 1, pageSize: 10 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());

    const pagination = screen.getByLabelText("Enterprise users pagination");
    fireEvent.click(within(pagination).getByRole("button", { name: "Next" }));
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));

    fireEvent.click(within(pagination).getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));

    const pageInput = screen.getByLabelText("Go to enterprise users page number") as HTMLInputElement;
    fireEvent.change(pageInput, { target: { value: "99" } });
    fireEvent.blur(pageInput);
    expect(pageInput.value).toBe("1");
  });

  it("shows empty-state search messaging when no users match", async () => {
    searchEnterpriseUsersMock
      .mockResolvedValueOnce(createSearchResponse([]))
      .mockResolvedValueOnce(createSearchResponse([], { query: "nobody" }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Search enterprise users"), { target: { value: "nobody" } });
    expect(await screen.findByText('No users match "nobody".')).toBeInTheDocument();
  });

  it("clamps out-of-range pages returned by the API and refetches", async () => {
    searchEnterpriseUsersMock
      .mockResolvedValueOnce(createSearchResponse([], { total: 15, totalPages: 2, page: 3, pageSize: 10 }))
      .mockResolvedValueOnce(createSearchResponse([], { total: 15, totalPages: 2, page: 2, pageSize: 10 }));

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);

    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalledTimes(2));
    expect(searchEnterpriseUsersMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
  });

  it("requests sorted results when sort selection changes", async () => {
    searchEnterpriseUsersMock.mockResolvedValue(
      createSearchResponse([
        {
          id: 88,
          email: "sort@example.com",
          firstName: "Sort",
          lastName: "User",
          role: "STUDENT",
          isStaff: false,
          active: true,
          membershipStatus: "active",
        },
      ]),
    );

    render(<EnterpriseUserManagementPanel currentUserId={99} currentUserRole="ENTERPRISE_ADMIN" />);
    await waitFor(() => expect(searchEnterpriseUsersMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Sort enterprise users"), { target: { value: "nameDesc" } });
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "name", sortDirection: "desc" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Sort enterprise users"), { target: { value: "joinDateAsc" } });
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "joinDate", sortDirection: "asc" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Sort enterprise users"), { target: { value: "joinDateDesc" } });
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "joinDate", sortDirection: "desc" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Sort enterprise users"), { target: { value: "nameAsc" } });
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "name", sortDirection: "asc" }),
      ),
    );
  });
});
