import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  listUsers: vi.fn(),
  searchUsers: vi.fn(),
  updateUserRole: vi.fn(),
  getAdminSummary: vi.fn(),
}));

import { getAdminSummary, listUsers, searchUsers, updateUserRole } from "../api/client";
import { AdminWorkspaceSummary } from "./AdminWorkspaceSummary";

const listUsersMock = listUsers as MockedFunction<typeof listUsers>;
const searchUsersMock = searchUsers as MockedFunction<typeof searchUsers>;
const updateUserRoleMock = updateUserRole as MockedFunction<typeof updateUserRole>;
const getAdminSummaryMock = getAdminSummary as MockedFunction<typeof getAdminSummary>;
type AdminUserSearchItem = Awaited<ReturnType<typeof searchUsers>>["items"][number];

const makeSearchResponse = (items: AdminUserSearchItem[], total: number, page = 1, pageSize = 100) => ({
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

const demoUsers: AdminUserSearchItem[] = Array.from({ length: 150 }, (_, index) => ({
  id: index + 1,
  email: `staff${index + 1}@example.com`,
  firstName: `Staff${index + 1}`,
  lastName: "Member",
  isStaff: true,
  role: "STAFF",
  active: true,
}));

describe("AdminWorkspaceSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSummaryMock.mockResolvedValue({
      users: 150,
      modules: 12,
      teams: 6,
      meetings: 4,
    });
    listUsersMock.mockResolvedValue(demoUsers);
    updateUserRoleMock.mockImplementation(async (userId, role) => ({
      ...demoUsers.find((user) => user.id === userId)!,
      role,
      isStaff: role !== "STUDENT",
    }));
    searchUsersMock.mockImplementation(async (params = {}) => {
      const q = (params.q ?? "").toLowerCase().trim();
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 100;
      const filtered = q
        ? demoUsers.filter((user) => `${user.email} ${user.firstName} ${user.lastName}`.toLowerCase().includes(q))
        : demoUsers;
      const start = (page - 1) * pageSize;
      return makeSearchResponse(filtered.slice(start, start + pageSize), filtered.length, page, pageSize);
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

  it("paginates staff directory in the invite admin modal", async () => {
    const user = userEvent.setup();
    render(<AdminWorkspaceSummary />);

    await user.click(screen.getByRole("button", { name: /Invite admin/i }));

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 100 }),
    );
    await screen.findByText("Showing 1-100 of 150 staff accounts.");

    const modal = screen.getByRole("dialog", { name: /Invite admin/i });
    await user.click(within(modal).getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(searchUsersMock).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 100 }),
    );
    await screen.findByText("Showing 101-150 of 150 staff accounts.");
  });
});
