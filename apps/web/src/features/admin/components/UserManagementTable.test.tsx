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
  updateUserRoleMock.mockResolvedValue({ ...apiUser, role: "ADMIN", isStaff: true });
});

describe("UserManagementTable", () => {
  it("loads users from API and normalizes role", async () => {
    listUsersMock.mockResolvedValue([{ ...apiUser, role: undefined, isStaff: true } as any]);
    await renderTable();
    expect(screen.getByText(apiUser.email)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Staff")).toBeInTheDocument();
  });

  it("updates user role and shows confirmation", async () => {
    await renderTable();
    fireEvent.change(screen.getByDisplayValue("Student"), { target: { value: "ADMIN" } });
    await waitFor(() => expect(updateUserRoleMock).toHaveBeenCalledWith(apiUser.id, "ADMIN"));
    expect(screen.getByText(/Updated role to admin/i)).toBeInTheDocument();
  });

  it("toggles account status", async () => {
    updateUserMock.mockResolvedValue({ ...apiUser, active: false });
    await renderTable();
    fireEvent.click(screen.getByText("Active"));
    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith(apiUser.id, { active: false }));
    expect(screen.getByText(/Account suspended/i)).toBeInTheDocument();
  });
});
