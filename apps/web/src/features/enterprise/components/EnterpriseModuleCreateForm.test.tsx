import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../api/client", () => ({
  createEnterpriseModule: vi.fn(),
  deleteEnterpriseModule: vi.fn(),
  getEnterpriseModuleAccessSelection: vi.fn(),
  getEnterpriseModuleJoinCode: vi.fn(),
  searchEnterpriseModuleAccessUsers: vi.fn(),
  updateEnterpriseModule: vi.fn(),
}));

import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  getEnterpriseModuleJoinCode,
  searchEnterpriseModuleAccessUsers,
  updateEnterpriseModule,
} from "../api/client";
import { EnterpriseModuleCreateForm } from "./EnterpriseModuleCreateForm";

const createEnterpriseModuleMock = createEnterpriseModule as MockedFunction<typeof createEnterpriseModule>;
const deleteEnterpriseModuleMock = deleteEnterpriseModule as MockedFunction<typeof deleteEnterpriseModule>;
const getEnterpriseModuleAccessSelectionMock = getEnterpriseModuleAccessSelection as MockedFunction<
  typeof getEnterpriseModuleAccessSelection
>;
const getEnterpriseModuleJoinCodeMock = getEnterpriseModuleJoinCode as MockedFunction<typeof getEnterpriseModuleJoinCode>;
const searchEnterpriseModuleAccessUsersMock = searchEnterpriseModuleAccessUsers as MockedFunction<
  typeof searchEnterpriseModuleAccessUsers
>;
const updateEnterpriseModuleMock = updateEnterpriseModule as MockedFunction<typeof updateEnterpriseModule>;

const staffOwner = { id: 11, email: "lead@x.com", firstName: "Staff", lastName: "Owner", active: true };
const taStudent = { id: 12, email: "ta@student.com", firstName: "TA", lastName: "Student", active: true };
const enrolledStudent = { id: 31, email: "student@x.com", firstName: "Enrolled", lastName: "Student", active: true };

function makeSearchResponse(scope: "staff" | "all" | "students", items: Array<typeof staffOwner>, page = 1, pageSize = 20) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
    query: null,
    scope,
  };
}

const installSearchMock = () => {
  searchEnterpriseModuleAccessUsersMock.mockImplementation(async (params = {}) => {
    const scope = params.scope ?? "all";
    const q = (params.q ?? "").trim().toLowerCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const dataset =
      scope === "staff"
        ? [staffOwner]
        : scope === "students"
          ? [enrolledStudent]
          : [staffOwner, taStudent, enrolledStudent];

    const filtered = q
      ? dataset.filter((user) => `${user.firstName} ${user.lastName} ${user.email} ${user.id}`.toLowerCase().includes(q))
      : dataset;

    const start = (page - 1) * pageSize;
    return makeSearchResponse(scope, filtered.slice(start, start + pageSize), page, pageSize);
  });
};

describe("EnterpriseModuleCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockReset();
    refresh.mockReset();
    createEnterpriseModuleMock.mockResolvedValue({
      id: 99,
      joinCode: "ABCD2345",
      name: "Created module",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      studentCount: 0,
      leaderCount: 0,
      teachingAssistantCount: 0,
    });
    deleteEnterpriseModuleMock.mockResolvedValue({
      moduleId: 77,
      deleted: true,
    });
    getEnterpriseModuleAccessSelectionMock.mockResolvedValue({
      module: {
        id: 77,
        name: "Existing module",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        studentCount: 1,
        leaderCount: 1,
        teachingAssistantCount: 1,
      },
      leaderIds: [11],
      taIds: [12],
      studentIds: [31],
    });
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({
      moduleId: 77,
      joinCode: "ABCD2345",
    });
    updateEnterpriseModuleMock.mockResolvedValue({
      id: 77,
      name: "Updated module",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      studentCount: 1,
      leaderCount: 1,
      teachingAssistantCount: 1,
    });
    installSearchMock();
  });

  it("loads access lists from backend search and applies search queries server-side", async () => {
    render(<EnterpriseModuleCreateForm mode="create" />);

    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 1,
        pageSize: 20,
      }),
    );

    fireEvent.change(screen.getByLabelText(/search staff/i), { target: { value: "owner" } });

    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: "owner",
        page: 1,
        pageSize: 20,
      }),
    );
  });

  it("submits selected user ids from backend-loaded lists", async () => {
    render(<EnterpriseModuleCreateForm mode="create" />);

    await waitFor(() =>
      expect(within(screen.getByRole("group", { name: /module leaders/i })).getByRole("checkbox", { name: /staff owner/i })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/module name/i), { target: { value: "Backend Search Module" } });
    expect(screen.getByRole("button", { name: /create module/i })).toBeDisabled();

    const leadersGroup = screen.getByRole("group", { name: /module leaders/i });

    fireEvent.click(within(leadersGroup).getByRole("checkbox", { name: /staff owner/i }));
    expect(screen.getByRole("button", { name: /create module/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /create module/i }));

    await waitFor(() =>
      expect(createEnterpriseModuleMock).toHaveBeenCalledWith({
        name: "Backend Search Module",
        leaderIds: [11],
      }),
    );
    expect(push).toHaveBeenCalledWith("/enterprise/modules/99/edit?created=1&joinCode=ABCD2345");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the join code card in edit mode", async () => {
    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} createdJoinCode="ZXCV6789" />);

    expect(await screen.findByText(/students can now join with this code/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/module join code/i)).toHaveTextContent("ABCD2345");
    expect(getEnterpriseModuleJoinCodeMock).toHaveBeenCalledWith(77);
  });

  it("deletes a module only after confirmation checkbox is selected", async () => {
    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} />);

    const deleteButton = await screen.findByRole("button", { name: /delete module/i });
    const confirmation = screen.getByLabelText(/i understand this action cannot be undone/i);

    expect(deleteButton).toBeDisabled();

    fireEvent.click(confirmation);
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);

    await waitFor(() => expect(deleteEnterpriseModuleMock).toHaveBeenCalledWith(77));
    expect(push).toHaveBeenCalledWith("/enterprise/modules");
    expect(refresh).toHaveBeenCalled();
  });

  it("blocks edit form when requester is not a module owner or leader", async () => {
    getEnterpriseModuleAccessSelectionMock.mockRejectedValueOnce(new Error("Forbidden"));

    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} />);

    await screen.findByText(/only module owners\/leaders can edit this module/i);
    expect(screen.queryByRole("button", { name: /save module/i })).not.toBeInTheDocument();
  });
});
