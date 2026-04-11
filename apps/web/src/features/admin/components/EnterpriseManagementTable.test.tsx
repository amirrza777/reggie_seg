import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  searchEnterprises: vi.fn(),
  createEnterprise: vi.fn(),
  deleteEnterprise: vi.fn(),
  searchEnterpriseUsers: vi.fn(),
  inviteEnterpriseAdmin: vi.fn(),
  updateEnterpriseUser: vi.fn(),
}));

import {
  createEnterprise,
  deleteEnterprise,
  inviteEnterpriseAdmin,
  searchEnterprises,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../api/client";
import { EnterpriseManagementTable } from "./EnterpriseManagementTable";

const searchEnterprisesMock = searchEnterprises as MockedFunction<typeof searchEnterprises>;
const createEnterpriseMock = createEnterprise as MockedFunction<typeof createEnterprise>;
const deleteEnterpriseMock = deleteEnterprise as MockedFunction<typeof deleteEnterprise>;
const inviteEnterpriseAdminMock = inviteEnterpriseAdmin as MockedFunction<typeof inviteEnterpriseAdmin>;
const searchEnterpriseUsersMock = searchEnterpriseUsers as MockedFunction<typeof searchEnterpriseUsers>;
const updateEnterpriseUserMock = updateEnterpriseUser as MockedFunction<typeof updateEnterpriseUser>;
type EnterpriseSearchItem = Awaited<ReturnType<typeof searchEnterprises>>["items"][number];
type EnterpriseUserSearchItem = Awaited<ReturnType<typeof searchEnterpriseUsers>>["items"][number];

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

const makeSearchResponse = (items: EnterpriseSearchItem[], total: number, page = 1, pageSize = 8) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  hasPreviousPage: page > 1,
  hasNextPage: page < Math.ceil(total / pageSize),
  query: null,
});

const makeUserSearchResponse = (items: EnterpriseUserSearchItem[], total: number, page = 1, pageSize = 10) => ({
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

const installEnterpriseSearchMock = (dataset: EnterpriseSearchItem[]) => {
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

const installEnterpriseUserSearchMock = (dataset: EnterpriseUserSearchItem[]) => {
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

const createEnterpriseFromModal = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  code: string,
  inviteEmail?: string,
) => {
  await user.click(screen.getByRole("button", { name: /^Create$/i }));

  const dialog = screen.getByRole("dialog", { name: /create enterprise/i });
  const nameInput = within(dialog).getByLabelText(/enterprise name/i);
  const codeInput = within(dialog).getByLabelText(/enterprise code/i);
  const inviteEmailInput = within(dialog).getByLabelText(/invite enterprise admin email/i);

  await user.clear(nameInput);
  await user.type(nameInput, name);
  await user.clear(codeInput);
  await user.type(codeInput, code);
  await user.clear(inviteEmailInput);
  if (inviteEmail) {
    await user.type(inviteEmailInput, inviteEmail);
  }
  await user.click(within(dialog).getByRole("button", { name: /create enterprise/i }));
};

describe("EnterpriseManagementTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installEnterpriseSearchMock([enterprise]);
    createEnterpriseMock.mockResolvedValue(enterprise);
    deleteEnterpriseMock.mockResolvedValue({ success: true });
    installEnterpriseUserSearchMock([enterpriseUser]);
    inviteEnterpriseAdminMock.mockResolvedValue({
      email: "invite@example.com",
      expiresAt: "2026-04-15T12:00:00.000Z",
    } as any);
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
    const user = userEvent.setup();
    createEnterpriseMock.mockResolvedValue({
      ...enterprise,
      id: "ent_2",
      code: "KCL2",
      name: "King's College London 2",
    });

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await createEnterpriseFromModal(user, "King's College London 2", "kcl2");

    await waitFor(() =>
      expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "King's College London 2", code: "KCL2" }),
    );
    expect(screen.getByText(/created with code KCL2/i)).toBeInTheDocument();
  });

  it("creates an enterprise and sends optional invite from the create modal", async () => {
    const user = userEvent.setup();
    createEnterpriseMock.mockResolvedValue({
      ...enterprise,
      id: "ent_3",
      code: "ACM",
      name: "Acme",
    });

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await createEnterpriseFromModal(user, "Acme", "acm", "owner@acme.com");

    await waitFor(() =>
      expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "Acme", code: "ACM" }),
    );
    await waitFor(() =>
      expect(inviteEnterpriseAdminMock).toHaveBeenCalledWith("ent_3", "owner@acme.com"),
    );
    expect(screen.getByText(/created and invite sent to owner@acme.com/i)).toBeInTheDocument();
  });

  it("opens enterprise accounts and updates role", async () => {
    const user = userEvent.setup();
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());
    await screen.findByText("King's College London");

    await user.click(await screen.findByRole("button", { name: /manage accounts/i }));
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 1, pageSize: 10 }),
    );

    await user.click(await screen.findByRole("button", { name: /staff/i }));
    await waitFor(() => expect(updateEnterpriseUserMock).toHaveBeenCalledWith("ent_1", 42, { role: "STAFF" }));
    expect(screen.getByText(/updated role to staff/i)).toBeInTheDocument();
  });

  it("sends enterprise admin invite without exposing role promotion button", async () => {
    const user = userEvent.setup();
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /manage accounts/i }));
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 1, pageSize: 10 }),
    );

    const inviteInput = screen.getByLabelText(/enterprise admin invite email/i);
    await user.type(inviteInput, "invite@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() => expect(inviteEnterpriseAdminMock).toHaveBeenCalledWith("ent_1", "invite@example.com"));
    expect(screen.getByText(/sent enterprise admin invite to invite@example.com/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enterprise admin/i })).not.toBeInTheDocument();
  });

  it("requests sorted enterprise users when sort selection changes", async () => {
    const user = userEvent.setup();
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /manage accounts/i }));

    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 1, pageSize: 10 }),
    );

    await user.selectOptions(screen.getByRole("combobox", { name: /sort enterprise users/i }), "joinDateDesc");
    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", {
        q: undefined,
        page: 1,
        pageSize: 10,
        sortBy: "joinDate",
        sortDirection: "desc",
      }),
    );
  });

  it("dismisses success popup after 2.5 seconds", async () => {
    const user = userEvent.setup();
    createEnterpriseMock.mockResolvedValue({
      ...enterprise,
      id: "ent_2",
      code: "KCL2",
      name: "King's College London 2",
    });

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await createEnterpriseFromModal(user, "King's College London 2", "kcl2");

    await waitFor(() =>
      expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "King's College London 2", code: "KCL2" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/created with code KCL2/i);
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 4500 });
  }, 12000);

  it("supports delete confirmation cancel and confirm actions", async () => {
    const user = userEvent.setup();
    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(screen.getByRole("dialog", { name: /delete enterprise/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(screen.queryByRole("dialog", { name: /delete enterprise/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));
    await user.click(screen.getByRole("button", { name: /Delete enterprise/i }));

    await waitFor(() => {
      expect(deleteEnterpriseMock).toHaveBeenCalledWith("ent_1");
    });
  });

  it("triggers account modal close, status toggle, and page-input blur handlers", async () => {
    const user = userEvent.setup();
    const pagedUsers = Array.from({ length: 11 }, (_, index) => ({
      ...enterpriseUser,
      id: 100 + index,
      email: `user${index}@example.com`,
      firstName: `User${index}`,
      lastName: "Test",
      role: "STUDENT",
      active: true,
    }));
    installEnterpriseUserSearchMock(pagedUsers);

    render(<EnterpriseManagementTable isSuperAdmin />);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /manage accounts/i }));

    await waitFor(() =>
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 1, pageSize: 10 }),
    );

    const firstUserEmail = screen.getByText("user0@example.com");
    const firstUserRow = firstUserEmail.closest(".table__row");
    expect(firstUserRow).not.toBeNull();

    const activeButton = within(firstUserRow as HTMLElement).getByRole("button", { name: /active/i });
    await user.click(activeButton);
    await waitFor(() => {
      expect(updateEnterpriseUserMock).toHaveBeenCalledWith("ent_1", 100, { active: false });
    });

    const pageInput = screen.getByRole("spinbutton", { name: /go to enterprise user page number/i });
    await user.clear(pageInput);
    await user.type(pageInput, "2");
    await user.tab();
    await waitFor(() => {
      expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("ent_1", { q: undefined, page: 2, pageSize: 10 });
    });

    await user.click(screen.getByLabelText("Close"));
    expect(screen.queryByRole("dialog", { name: /accounts/i })).not.toBeInTheDocument();
  });
});
