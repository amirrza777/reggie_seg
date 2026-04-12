import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/archive/api/client", () => ({
  archiveItem: vi.fn(() => Promise.resolve()),
  unarchiveItem: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: () => ({
    user: { id: 999, email: "editor@x.com", firstName: "Ed", lastName: "Itor", role: "ENTERPRISE_ADMIN" as const },
    setUser: vi.fn(),
    refresh: vi.fn(),
    loading: false,
  }),
}));

vi.mock("../api/client", () => ({
  createEnterpriseModule: vi.fn(),
  deleteEnterpriseModule: vi.fn(),
  getEnterpriseModuleAccessSelection: vi.fn(),
  getModuleMeetingSettings: vi.fn(),
  searchEnterpriseModuleAccessUsers: vi.fn(),
  updateModuleMeetingSettings: vi.fn(),
  updateEnterpriseModule: vi.fn(),
}));

import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  getModuleMeetingSettings,
  searchEnterpriseModuleAccessUsers,
  updateModuleMeetingSettings,
  updateEnterpriseModule,
} from "../api/client";
import { archiveItem, unarchiveItem } from "@/features/archive/api/client";
import { EnterpriseModuleCreateForm } from "./EnterpriseModuleCreateForm";
import React from "react";

const createEnterpriseModuleMock = createEnterpriseModule as MockedFunction<typeof createEnterpriseModule>;
const deleteEnterpriseModuleMock = deleteEnterpriseModule as MockedFunction<typeof deleteEnterpriseModule>;
const getEnterpriseModuleAccessSelectionMock = getEnterpriseModuleAccessSelection as MockedFunction<
  typeof getEnterpriseModuleAccessSelection
>;
const searchEnterpriseModuleAccessUsersMock = searchEnterpriseModuleAccessUsers as MockedFunction<
  typeof searchEnterpriseModuleAccessUsers
>;
const getModuleMeetingSettingsMock = getModuleMeetingSettings as MockedFunction<typeof getModuleMeetingSettings>;
const updateModuleMeetingSettingsMock = updateModuleMeetingSettings as MockedFunction<typeof updateModuleMeetingSettings>;
const updateEnterpriseModuleMock = updateEnterpriseModule as MockedFunction<typeof updateEnterpriseModule>;
const archiveItemMock = archiveItem as MockedFunction<typeof archiveItem>;
const unarchiveItemMock = unarchiveItem as MockedFunction<typeof unarchiveItem>;

const staffOwner = { id: 11, email: "lead@x.com", firstName: "Staff", lastName: "Owner", active: true };
const taStudent = { id: 12, email: "ta@student.com", firstName: "TA", lastName: "Student", active: true };
const enrolledStudent = { id: 31, email: "student@x.com", firstName: "Enrolled", lastName: "Student", active: true };

function makeSearchResponse(
  scope: "staff" | "all" | "students" | "staff_and_students",
  items: Array<typeof staffOwner>,
  page = 1,
  pageSize = 20,
) {
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
          : scope === "staff_and_students"
            ? [staffOwner, taStudent, enrolledStudent]
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
      code: "4CCS2DBS",
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
        code: "4CCS2DBS",
        name: "Existing module",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        archivedAt: null,
        studentCount: 1,
        leaderCount: 1,
        teachingAssistantCount: 1,
      },
      leaderIds: [11],
      taIds: [12],
      studentIds: [31],
    });
    getModuleMeetingSettingsMock.mockResolvedValue({
      absenceThreshold: 2,
      minutesEditWindowDays: 7,
      attendanceEditWindowDays: 7,
      allowAnyoneToEditMeetings: false,
      allowAnyoneToRecordAttendance: false,
      allowAnyoneToWriteMinutes: false,
    });
    updateModuleMeetingSettingsMock.mockResolvedValue({
      absenceThreshold: 2,
      minutesEditWindowDays: 7,
      attendanceEditWindowDays: 7,
      allowAnyoneToEditMeetings: false,
      allowAnyoneToRecordAttendance: false,
      allowAnyoneToWriteMinutes: false,
    });
    updateEnterpriseModuleMock.mockResolvedValue({
      id: 77,
      code: "4CCS2DBS",
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

    fireEvent.change(screen.getByLabelText(/module owners\/leaders/i), { target: { value: "owner" } });

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
    fireEvent.change(screen.getByLabelText(/module code/i), { target: { value: "4ccs2dbs" } });
    expect(screen.getByRole("button", { name: /create module/i })).toBeDisabled();

    const leadersGroup = screen.getByRole("group", { name: /module leaders/i });

    fireEvent.click(within(leadersGroup).getByRole("checkbox", { name: /staff owner/i }));
    expect(screen.getByRole("button", { name: /create module/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /create module/i }));

    await waitFor(() =>
      expect(createEnterpriseModuleMock).toHaveBeenCalledWith({
        name: "Backend Search Module",
        code: "4CCS2DBS",
        leaderIds: [11],
      }),
    );
    expect(push).toHaveBeenCalledWith("/enterprise/modules/99/edit?created=1");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the module joining code field in edit mode", async () => {
    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} joinCode="ZXCV6789" created />);

    expect(await screen.findByText(/module joining code/i)).toBeInTheDocument();
    expect(screen.getByText(/students can self-enroll using the join code/i)).toBeInTheDocument();
    expect(screen.getByText(/module created\. students can now join with this code/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /copy join code zxcv6789/i })).toHaveTextContent("ZXCV6789");
  });

  it("archives only after confirmation checkbox is selected", async () => {
    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} />);

    const archiveButton = await screen.findByRole("button", { name: /^archive module$/i, hidden: true });
    const confirmation = screen.getByLabelText(/read-only for all users\. it can be unarchived if needed/i, { hidden: true });

    expect(archiveButton).toBeDisabled();

    fireEvent.click(confirmation);
    expect(archiveButton).toBeEnabled();

    fireEvent.click(archiveButton);

    await waitFor(() => expect(archiveItemMock).toHaveBeenCalledWith("modules", 77));
    expect(refresh).toHaveBeenCalled();
  });

  it("unarchives only after confirmation when module is archived", async () => {
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce({
      module: {
        id: 77,
        code: "4CCS2DBS",
        name: "Existing module",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        archivedAt: "2026-03-10T12:00:00.000Z",
        studentCount: 1,
        leaderCount: 1,
        teachingAssistantCount: 1,
      },
      leaderIds: [11],
      taIds: [12],
      studentIds: [31],
    });
    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} />);

    const unarchiveButton = await screen.findByRole("button", { name: /^unarchive module$/i });
    const confirmation = screen.getByLabelText(/allow people with permission to edit the module again/i);

    expect(unarchiveButton).toBeDisabled();
    fireEvent.click(confirmation);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^unarchive module$/i, hidden: true })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /^unarchive module$/i, hidden: true }));

    await waitFor(() => expect(unarchiveItemMock).toHaveBeenCalledWith("modules", 77));
    expect(refresh).toHaveBeenCalled();
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

  it("shows create failure messages from module creation errors", async () => {
    createEnterpriseModuleMock.mockRejectedValueOnce(new Error("Create failed"));
    render(<EnterpriseModuleCreateForm mode="create" />);

    await waitFor(() =>
      expect(
        within(screen.getByRole("group", { name: /module leaders/i })).getByRole("checkbox", { name: /staff owner/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/module name/i), { target: { value: "Broken Module" } });
    fireEvent.change(screen.getByLabelText(/module code/i), { target: { value: "BRK1" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /staff owner/i }));
    fireEvent.click(screen.getByRole("button", { name: /create module/i }));

    expect(await screen.findByText("Create failed")).toBeInTheDocument();
  });

  it("handles pagination callbacks and no-results messaging across access sections in edit mode", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async (params = {}) => {
      const scope = params.scope ?? "all";
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const query = (params.q ?? "").trim();
      const isFiltered = query.length > 0;

      const itemsByScope = {
        staff: [staffOwner],
        staff_and_students: [taStudent],
        students: [enrolledStudent],
        all: [staffOwner],
      } as const;
      const items = isFiltered ? [] : [...(itemsByScope[scope] ?? itemsByScope.all)];
      const total = isFiltered ? 0 : 40;
      const totalPages = isFiltered ? 0 : 2;

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: totalPages > 0 && page < totalPages,
        query: query || null,
        scope,
      };
    });

    render(<EnterpriseModuleCreateForm mode="edit" moduleId={77} />);

    const assertSearchCall = async (scope: string, page: number) => {
      await waitFor(() =>
        expect(
          searchEnterpriseModuleAccessUsersMock.mock.calls.some(
            ([params]) => params?.scope === scope && params?.page === page,
          ),
        ).toBe(true),
      );
    };

    await screen.findByLabelText("Go to staff page");
    await screen.findByLabelText("Go to teaching assistant page");
    await screen.findByLabelText("Go to student page");

    const staffPagination = screen.getByLabelText("Module owners/leaders search pagination");
    fireEvent.click(within(staffPagination).getByRole("button", { name: "Next" }));
    await assertSearchCall("staff", 2);
    fireEvent.click(within(staffPagination).getByRole("button", { name: "Previous" }));
    await assertSearchCall("staff", 1);
    const staffPageInput = screen.getByLabelText("Go to staff page");
    fireEvent.change(staffPageInput, { target: { value: "2" } });
    fireEvent.blur(staffPageInput);
    await assertSearchCall("staff", 2);
    fireEvent.change(staffPageInput, { target: { value: "1" } });
    fireEvent.keyDown(staffPageInput, { key: "Enter" });
    await assertSearchCall("staff", 1);

    const taPagination = screen.getByLabelText("Teaching assistants search pagination");
    fireEvent.click(within(taPagination).getByRole("button", { name: "Next" }));
    await assertSearchCall("staff_and_students", 2);
    fireEvent.click(within(taPagination).getByRole("button", { name: "Previous" }));
    await assertSearchCall("staff_and_students", 1);
    const taPageInput = screen.getByLabelText("Go to teaching assistant page");
    fireEvent.change(taPageInput, { target: { value: "2" } });
    fireEvent.blur(taPageInput);
    await assertSearchCall("staff_and_students", 2);
    fireEvent.change(taPageInput, { target: { value: "1" } });
    fireEvent.keyDown(taPageInput, { key: "Enter" });
    await assertSearchCall("staff_and_students", 1);

    const studentPagination = screen.getByLabelText("Students search pagination");
    fireEvent.click(within(studentPagination).getByRole("button", { name: "Next" }));
    await assertSearchCall("students", 2);
    fireEvent.click(within(studentPagination).getByRole("button", { name: "Previous" }));
    await assertSearchCall("students", 1);
    const studentPageInput = screen.getByLabelText("Go to student page");
    fireEvent.change(studentPageInput, { target: { value: "2" } });
    fireEvent.blur(studentPageInput);
    await assertSearchCall("students", 2);
    fireEvent.change(studentPageInput, { target: { value: "1" } });
    fireEvent.keyDown(studentPageInput, { key: "Enter" });
    await assertSearchCall("students", 1);

    fireEvent.change(screen.getByLabelText(/search staff/i), { target: { value: "nobody-staff" } });
    expect(await screen.findByText('No staff match "nobody-staff".')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search teaching assistant accounts/i), { target: { value: "nobody-ta" } });
    expect(await screen.findByText('No accounts match "nobody-ta".')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search students/i), { target: { value: "nobody-student" } });
    expect(await screen.findByText('No students match "nobody-student".')).toBeInTheDocument();
  }, 15000);
});
