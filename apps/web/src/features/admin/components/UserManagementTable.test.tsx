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
    expect(screen.getByText(/Account suspended/i)).toBeInTheDocument();
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
    expect(screen.getByText("user11@example.com")).toBeInTheDocument();
    expect(screen.getByText("user13@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
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
    expect(screen.getByText("user11@example.com")).toBeInTheDocument();
    expect(screen.getByText("user13@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
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
});
