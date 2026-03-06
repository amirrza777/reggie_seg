import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  updateUserRole: vi.fn(),
}));

import { listUsers, updateUser, updateUserRole } from "../api/client";
import { UserManagementTable } from "./UserManagementTable";

const listUsersMock = listUsers as MockedFunction<typeof listUsers>;
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

const renderTable = async () => {
  render(<UserManagementTable />);
  await waitFor(() => expect(listUsersMock).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  listUsersMock.mockResolvedValue([apiUser]);
  updateUserMock.mockResolvedValue(apiUser);
  updateUserRoleMock.mockResolvedValue({ ...apiUser, role: "STAFF", isStaff: true });
});

describe("UserManagementTable", () => {
  it("loads users from API and normalizes role", async () => {
    listUsersMock.mockResolvedValue([{ ...apiUser, role: undefined, isStaff: true } as any]);
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
    listUsersMock.mockResolvedValue([
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

    expect(screen.getByText("admin@kcl.ac.uk")).toBeInTheDocument();
    expect(screen.queryByText("student@test.com")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1-1 of 1 account \(filtered from 2\)\./i)).toBeInTheDocument();
  });

  it("shows 10 users per page and supports pagination controls", async () => {
    const users = Array.from({ length: 13 }, (_, index) => ({
      ...apiUser,
      id: index + 1,
      email: `user${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: "Test",
    }));
    listUsersMock.mockResolvedValue(users as any);

    await renderTable();

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user10@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user11@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1-10 of 13 accounts\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

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
    listUsersMock.mockResolvedValue(users as any);

    await renderTable();

    const pageInput = screen.getByRole("spinbutton", { name: /go to page number/i });
    fireEvent.change(pageInput, {
      target: { value: "2" },
    });
    fireEvent.blur(pageInput);

    expect(screen.getByText("user11@example.com")).toBeInTheDocument();
    expect(screen.getByText("user13@example.com")).toBeInTheDocument();
    expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
  });

  it("shows enterprise admin as a locked role chip", async () => {
    listUsersMock.mockResolvedValue([
      {
        ...apiUser,
        id: 20,
        email: "ea@test.com",
        role: "ENTERPRISE_ADMIN",
        isStaff: true,
      } as any,
    ]);

    await renderTable();

    expect(screen.getByText("Enterprise admin", { selector: ".role-chip--locked" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /student/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /staff/i })).not.toBeInTheDocument();
  });
});
