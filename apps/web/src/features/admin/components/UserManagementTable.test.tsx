import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  searchUsers: vi.fn(),
  updateUser: vi.fn(),
  updateUserRole: vi.fn(),
}));

import { searchUsers, updateUser, updateUserRole } from "../api/client";
import { UserManagementTable } from "./UserManagementTable";

const searchUsersMock = searchUsers as MockedFunction<typeof searchUsers>;
const updateUserMock = updateUser as MockedFunction<typeof updateUser>;
const updateUserRoleMock = updateUserRole as MockedFunction<typeof updateUserRole>;

const apiUser = {
  id: 10,
  email: "student@test.com",
  firstName: "Tunjay",
  lastName: "Seyidali",
  isStaff: false,
  role: "STUDENT",
  active: true,
  enterprise: {
    id: "ent-1",
    name: "Assessment Enterprise",
    code: "ASSMT",
  },
};

const makeSearchResponse = (
  items: Array<any>,
  total: number,
  page = 1,
  pageSize = 10,
) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  hasPreviousPage: page > 1,
  hasNextPage: page < Math.ceil(total / pageSize),
  query: null,
  role: null,
  active: null,
});

const installSearchMock = (dataset: Array<any>) => {
  searchUsersMock.mockImplementation(async (params = {}) => {
    const q = (params.q ?? "").trim().toLowerCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const filtered = q
      ? dataset.filter((user) => {
          const searchable = [
            String(user.id),
            user.email,
            user.firstName,
            user.lastName,
            user.role,
            user.active ? "active" : "suspended",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(q);
        })
      : dataset;

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return makeSearchResponse(items, filtered.length, page, pageSize);
  });
};

const renderTable = async () => {
  render(<UserManagementTable />);
  await waitFor(() => expect(searchUsersMock).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  installSearchMock([apiUser]);
  updateUserMock.mockResolvedValue(apiUser);
  updateUserRoleMock.mockResolvedValue({ ...apiUser, role: "STAFF", isStaff: true });
});

describe("UserManagementTable", () => {
  it("loads users from API and normalizes role", async () => {
    installSearchMock([{ ...apiUser, role: undefined, isStaff: true }]);
    await renderTable();
    expect(screen.getByText(apiUser.email)).toBeInTheDocument();
    const staffButton = screen.getByRole("button", { name: /Staff/i });
    expect(staffButton).toBeDisabled();
  });

  it("normalizes missing role/active values for non-staff users", async () => {
    installSearchMock([{ ...apiUser, role: undefined, active: undefined, isStaff: false }]);
    await renderTable();

    expect(screen.getByText(apiUser.email)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Student/i })).toBeDisabled();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows the user's current enterprise in the account row", async () => {
    await renderTable();
    expect(screen.getByText("Assessment Enterprise")).toBeInTheDocument();
  });

  it("normalizes legacy unassigned enterprise labels", async () => {
    installSearchMock([
      {
        ...apiUser,
        id: 44,
        email: "staff4@example.com",
        enterprise: {
          id: "ent-unassigned",
          name: "Unassigned Accounts",
          code: "UNASSIGNED",
        },
      },
    ]);

    await renderTable();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.queryByText("Unassigned Accounts")).not.toBeInTheDocument();
  });

  it("updates user role and shows confirmation", async () => {
    await renderTable();
    fireEvent.click(screen.getByRole("button", { name: /Staff/i }));
    await waitFor(() => expect(updateUserRoleMock).toHaveBeenCalledWith(apiUser.id, "STAFF"));
    expect(screen.getByText(/Updated role to staff/i)).toBeInTheDocument();
  });

  it("toggles account status", async () => {
    updateUserMock.mockResolvedValue({ ...apiUser, active: false });
    await renderTable();
    fireEvent.click(screen.getByText("Active"));
    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith(apiUser.id, { active: false }));
    await waitFor(() => {
      expect(screen.getByText(/Account suspended/i)).toBeInTheDocument();
    });
  });

  it("filters visible users with search", async () => {
    installSearchMock([
      apiUser,
      {
        ...apiUser,
        id: 11,
        email: "admin@kcl.ac.uk",
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        isStaff: true,
      },
    ]);

    await renderTable();

    fireEvent.change(screen.getByRole("searchbox", { name: /search user accounts/i }), {
      target: { value: "admin" },
    });

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: "admin", page: 1, pageSize: 10 }),
    );
    expect(screen.getByText("admin@kcl.ac.uk")).toBeInTheDocument();
    expect(screen.queryByText("student@test.com")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1-1 of 1 account\./i)).toBeInTheDocument();
  });

  it("requests sorted users when sort selection changes", async () => {
    await renderTable();

    fireEvent.change(screen.getByRole("combobox", { name: /sort user accounts/i }), {
      target: { value: "joinDateDesc" },
    });

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({
        q: undefined,
        page: 1,
        pageSize: 10,
        sortBy: "joinDate",
        sortDirection: "desc",
      }),
    );
  });

  it("shows 10 users per page and supports pagination controls", async () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...apiUser,
      id: index + 1,
      email: `user${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: "Test",
    }));
    installSearchMock(users as any);

    await renderTable();

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user10@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user11@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1-10 of 13 accounts\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }),
    );
    await waitFor(() => {
      expect(screen.getByText("user11@example.com")).toBeInTheDocument();
      expect(screen.getByText("user13@example.com")).toBeInTheDocument();
      expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Showing 11-13 of 13 accounts\./i)).toBeInTheDocument();
  });

  it("jumps to a page when a valid page number is entered", async () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...apiUser,
      id: index + 1,
      email: `user${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: "Test",
    }));
    installSearchMock(users as any);

    await renderTable();

    const pageInput = screen.getByRole("spinbutton", { name: /go to page number/i });
    fireEvent.change(pageInput, {
      target: { value: "2" },
    });
    fireEvent.blur(pageInput);

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }),
    );
    await waitFor(() => {
      expect(screen.getByText("user11@example.com")).toBeInTheDocument();
      expect(screen.getByText("user13@example.com")).toBeInTheDocument();
      expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
    });
  });

  it("supports previous-page navigation and submit-based page jump", async () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...apiUser,
      id: index + 1,
      email: `user${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: "Test",
    }));
    installSearchMock(users as any);

    await renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 1, pageSize: 10 }),
    );

    const pageInput = screen.getByRole("spinbutton", { name: /go to page number/i });
    fireEvent.change(pageInput, { target: { value: "2" } });
    const pageJumpForm = pageInput.closest("form");
    expect(pageJumpForm).not.toBeNull();
    fireEvent.submit(pageJumpForm!);
    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }),
    );
  });

  it("restores current page input when an invalid page is entered", async () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...apiUser,
      id: index + 1,
      email: `user${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: "Test",
    }));
    installSearchMock(users as any);

    await renderTable();
    const pageInput = screen.getByRole("spinbutton", { name: /go to page number/i });
    fireEvent.change(pageInput, { target: { value: "999" } });
    fireEvent.blur(pageInput);

    expect(pageInput).toHaveValue(1);
    expect(searchUsersMock).toHaveBeenCalledTimes(1);
  });

  it("shows enterprise admin as a locked role chip", async () => {
    installSearchMock([
      {
        ...apiUser,
        id: 20,
        email: "ea@test.com",
        role: "ENTERPRISE_ADMIN",
        isStaff: true,
      },
    ] as any);

    await renderTable();

    expect(screen.getByText("Enterprise admin", { selector: ".role-chip--locked" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /student/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /staff/i })).not.toBeInTheDocument();
  });

  it("shows admin role chip and locks status control for super-admin email", async () => {
    installSearchMock([
      {
        ...apiUser,
        id: 1,
        email: "admin@kcl.ac.uk",
        role: "ADMIN",
        isStaff: true,
      },
    ] as any);

    await renderTable();

    expect(screen.getByText("Admin", { selector: ".role-chip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /student/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /staff/i })).not.toBeInTheDocument();
    const lockedStatusChip = document.querySelector(".status-chip--disabled");
    expect(lockedStatusChip).not.toBeNull();
    expect(lockedStatusChip).toHaveTextContent("Active");
  });

  it("shows empty-state messages for no users and filtered no-match searches", async () => {
    installSearchMock([]);

    await renderTable();
    expect(screen.getByText("No user accounts found.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search user accounts/i }), {
      target: { value: "missing" },
    });

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: "missing", page: 1, pageSize: 10 }),
    );
    expect(screen.getByText('No user accounts match "missing".')).toBeInTheDocument();
  });

  it("shows API load errors in an error alert", async () => {
    searchUsersMock.mockRejectedValueOnce(new Error("Users API failed."));
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText("Users API failed.")).toBeInTheDocument();
    });
  });

  it("rolls back optimistic role and status updates when API calls fail", async () => {
    updateUserRoleMock.mockRejectedValueOnce(new Error("Role failed."));
    updateUserMock.mockRejectedValueOnce(new Error("Status failed."));

    await renderTable();

    fireEvent.click(screen.getByRole("button", { name: /Staff/i }));
    await waitFor(() => expect(screen.getByText("Role failed.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Student/i })).toBeDisabled();

    fireEvent.click(screen.getByText("Active"));
    await waitFor(() => expect(screen.getByText("Status failed.")).toBeInTheDocument());
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("uses fallback messages for non-Error rejections", async () => {
    updateUserRoleMock.mockRejectedValueOnce("role-failed");
    updateUserMock.mockRejectedValueOnce("status-failed");

    await renderTable();
    fireEvent.click(screen.getByRole("button", { name: /Staff/i }));
    await waitFor(() => expect(screen.getByText("Could not update role.")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Active"));
    await waitFor(() => expect(screen.getByText("Could not update account status.")).toBeInTheDocument());
  });

  it("shows the fallback load error for non-Error failures", async () => {
    searchUsersMock.mockRejectedValueOnce("search-failed");
    render(<UserManagementTable />);

    await waitFor(() => {
      expect(screen.getByText("Could not load users.")).toBeInTheDocument();
    });
  });

  it("handles server page-overflow responses by resetting to the last page", async () => {
    searchUsersMock
      .mockResolvedValueOnce({
        items: [],
        total: 13,
        page: 3,
        pageSize: 10,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
        query: null,
        role: null,
        active: null,
      } as Awaited<ReturnType<typeof searchUsers>>)
      .mockResolvedValueOnce(
        makeSearchResponse(
          [
            { ...apiUser, id: 11, email: "user11@example.com" },
            { ...apiUser, id: 12, email: "user12@example.com" },
            { ...apiUser, id: 13, email: "user13@example.com" },
          ],
          13,
          2,
          10,
        ),
      );

    render(<UserManagementTable />);

    await waitFor(() => expect(searchUsersMock).toHaveBeenCalledTimes(2));
    expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 });
    expect(screen.getByText("user11@example.com")).toBeInTheDocument();
  });

  it("shows activation confirmation when toggling a suspended account", async () => {
    installSearchMock([{ ...apiUser, id: 50, email: "suspended@test.com", active: false }]);
    updateUserMock.mockResolvedValue({ ...apiUser, id: 50, email: "suspended@test.com", active: true });

    await renderTable();

    fireEvent.click(screen.getByText("Suspended"));
    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith(50, { active: true }));
    expect(screen.getByText("Account activated.")).toBeInTheDocument();
  });
});
