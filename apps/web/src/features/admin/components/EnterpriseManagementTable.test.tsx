import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  searchEnterprises: vi.fn(),
  createEnterprise: vi.fn(),
  deleteEnterprise: vi.fn(),
  searchEnterpriseUsers: vi.fn(),
  updateEnterpriseUser: vi.fn(),
}));

import {
  createEnterprise,
  searchEnterprises,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../api/client";
import { EnterpriseManagementTable } from "./EnterpriseManagementTable";

const searchEnterprisesMock = searchEnterprises as MockedFunction<typeof searchEnterprises>;
const createEnterpriseMock = createEnterprise as MockedFunction<typeof createEnterprise>;
const searchEnterpriseUsersMock = searchEnterpriseUsers as MockedFunction<typeof searchEnterpriseUsers>;
const updateEnterpriseUserMock = updateEnterpriseUser as MockedFunction<typeof updateEnterpriseUser>;

const enterprise = {
  id: "ent_1",
  name: "King's College London",
  code: "KCL",
  createdAt: "2026-03-01T10:30:00.000Z",
  users: 3,
  admins: 1,
  enterpriseAdmins: 0,
  staff: 1,
  students: 1,
  modules: 2,
  teams: 4,
};

const enterpriseUser = {
  id: 42,
  email: "student@example.com",
  firstName: "Reggie",
  lastName: "Seg",
  isStaff: false,
  role: "STUDENT",
  active: true,
};

const makeSearchResponse = (items: Array<any>, total: number, page = 1, pageSize = 8) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  hasPreviousPage: page > 1,
  hasNextPage: page < Math.ceil(total / pageSize),
  query: null,
});

const makeUserSearchResponse = (items: Array<any>, total: number, page = 1, pageSize = 10) => ({
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

const installEnterpriseSearchMock = (dataset: Array<any>) => {
  searchEnterprisesMock.mockImplementation(async (params = {}) => {
    const q = (params.q ?? "").trim().toLowerCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 8;

    const filtered = q
      ? dataset.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q))
      : dataset;

    const start = (page - 1) * pageSize;
    return makeSearchResponse(filtered.slice(start, start + pageSize), filtered.length, page, pageSize);
  });
};

const installEnterpriseUserSearchMock = (dataset: Array<any>) => {
  searchEnterpriseUsersMock.mockImplementation(async (_enterpriseId, params = {}) => {
    const q = (params.q ?? "").trim().toLowerCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const filtered = q
      ? dataset.filter((user) => `${user.firstName} ${user.lastName} ${user.email} ${user.role} ${user.id}`.toLowerCase().includes(q))
      : dataset;

    const start = (page - 1) * pageSize;
    return makeUserSearchResponse(filtered.slice(start, start + pageSize), filtered.length, page, pageSize);
  });
};

describe("EnterpriseManagementTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installEnterpriseSearchMock([enterprise]);
    createEnterpriseMock.mockResolvedValue(enterprise);
    installEnterpriseUserSearchMock([enterpriseUser]);
    updateEnterpriseUserMock.mockResolvedValue({ ...enterpriseUser, role: "STAFF", isStaff: true });
  });

  it("does not render when user is not super admin", () => {
    render(<EnterpriseManagementTable isSuperAdmin={false} />);
    expect(screen.queryByText("Enterprises")).not.toBeInTheDocument();
  });

  it("loads enterprises for super admin", async () => {
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 8 }));
    expect(screen.getByText("King's College London")).toBeInTheDocument();
  });

  it("creates an enterprise from the create modal", async () => {
    createEnterpriseMock.mockResolvedValue({
      ...enterprise,
      id: "ent_2",
      code: "KCL2",
      name: "King's College London 2",
    });

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    const dialog = screen.getByRole("dialog", { name: /create enterprise/i });
    fireEvent.change(within(dialog).getByLabelText(/enterprise name/i), {
      target: { value: "King's College London 2" },
    });
    fireEvent.change(within(dialog).getByLabelText(/enterprise code/i), { target: { value: "kcl2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /create enterprise/i }));

    await waitFor(() =>
      expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "King's College London 2", code: "KCL2" }),
    );
    expect(screen.getByText(/created with code KCL2/i)).toBeInTheDocument();
  });

  it("opens enterprise accounts and updates role", async () => {
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /manage accounts/i }));
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 1, pageSize: 10 }),
    );

    fireEvent.click(await screen.findByRole("button", { name: /staff/i }));
    await waitFor(() => expect(updateEnterpriseUserMock).toHaveBeenCalledWith("ent_1", 42, { role: "STAFF" }));
    expect(screen.getByText(/updated role to staff/i)).toBeInTheDocument();
  });

  it("dismisses success popup after 2.5 seconds", async () => {
    createEnterpriseMock.mockResolvedValue({
      ...enterprise,
      id: "ent_2",
      code: "KCL2",
      name: "King's College London 2",
    });

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    const dialog = screen.getByRole("dialog", { name: /create enterprise/i });
    fireEvent.change(within(dialog).getByLabelText(/enterprise name/i), {
      target: { value: "King's College London 2" },
    });
    fireEvent.change(within(dialog).getByLabelText(/enterprise code/i), { target: { value: "kcl2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /create enterprise/i }));

    await waitFor(() =>
      expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "King's College London 2", code: "KCL2" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/created with code KCL2/i);
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3600 });
  });
});
