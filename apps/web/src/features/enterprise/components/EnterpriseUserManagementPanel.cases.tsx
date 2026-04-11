import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { ApiError } from "@/shared/api/errors";
import {
  createEnterpriseUser,
  removeEnterpriseUser,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../api/client";
import { EnterpriseUserManagementPanel } from "./EnterpriseUserManagementPanel";

vi.mock("../api/client", () => ({
  createEnterpriseUser: vi.fn(),
  removeEnterpriseUser: vi.fn(),
  searchEnterpriseUsers: vi.fn(),
  updateEnterpriseUser: vi.fn(),
}));

vi.mock("@/shared/ui/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const searchEnterpriseUsersMock = searchEnterpriseUsers as MockedFunction<typeof searchEnterpriseUsers>;
const createEnterpriseUserMock = createEnterpriseUser as MockedFunction<typeof createEnterpriseUser>;
const updateEnterpriseUserMock = updateEnterpriseUser as MockedFunction<typeof updateEnterpriseUser>;
const removeEnterpriseUserMock = removeEnterpriseUser as MockedFunction<typeof removeEnterpriseUser>;

function createSearchResponse(
  items: Array<Record<string, unknown>>,
  overrides: Partial<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    query: string | null;
  }> = {},
) {
  const total = overrides.total ?? items.length;
  const pageSize = overrides.pageSize ?? 10;
  const page = overrides.page ?? 1;
  const computedTotalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: overrides.totalPages ?? computedTotalPages,
    hasPreviousPage: overrides.hasPreviousPage ?? page > 1,
    hasNextPage: overrides.hasNextPage ?? (overrides.totalPages ?? computedTotalPages) > page,
    query: overrides.query ?? null,
  };
}

describe("EnterpriseUserManagementPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createEnterpriseUserMock.mockResolvedValue({
      id: 700,
      email: "created@example.com",
      firstName: "Created",
      lastName: "User",
      role: "STUDENT",
      isStaff: false,
      active: true,
      membershipStatus: "active",
    });
    updateEnterpriseUserMock.mockResolvedValue({
      id: 41,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      isStaff: true,
      active: false,
      membershipStatus: "inactive",
    });
    removeEnterpriseUserMock.mockResolvedValue({
      id: 41,
      email: "peer-admin@example.com",
      firstName: "Peer",
      lastName: "Admin",
      role: "STUDENT",
      isStaff: false,
      active: true,
      membershipStatus: "left",
    });
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
