import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnterpriseManagementState } from "./useEnterpriseManagementState";
import { createEnterprise, deleteEnterprise, searchEnterprises } from "../api/client";
import { useEnterpriseUserManagementState } from "./useEnterpriseUserManagementState";

vi.mock("../api/client", () => ({
  searchEnterprises: vi.fn(),
  createEnterprise: vi.fn(),
  deleteEnterprise: vi.fn(),
}));

vi.mock("./useEnterpriseUserManagementState", () => ({
  useEnterpriseUserManagementState: vi.fn(),
}));

const searchEnterprisesMock = vi.mocked(searchEnterprises);
const createEnterpriseMock = vi.mocked(createEnterprise);
const deleteEnterpriseMock = vi.mocked(deleteEnterprise);
const useEnterpriseUserManagementStateMock = vi.mocked(useEnterpriseUserManagementState);

function makeUserState(overrides: Record<string, unknown> = {}) {
  return {
    clearSelectedEnterpriseIfDeleted: vi.fn(),
    selectedEnterprise: null,
    setSelectedEnterprise: vi.fn(),
    enterpriseUsers: [],
    enterpriseUsersStatus: "idle",
    enterpriseUsersMessage: null,
    enterpriseUserActionState: {},
    enterpriseUserSearchQuery: "",
    setEnterpriseUserSearchQuery: vi.fn(),
    enterpriseUserPage: 1,
    setEnterpriseUserPage: vi.fn(),
    enterpriseUserPageInput: "1",
    setEnterpriseUserPageInput: vi.fn(),
    enterpriseUserTotal: 0,
    enterpriseUserTotalPages: 0,
    effectiveEnterpriseUserTotalPages: 1,
    enterpriseUserStart: 0,
    enterpriseUserEnd: 0,
    resetSelectedEnterprise: vi.fn(),
    openEnterpriseAccounts: vi.fn(),
    handleEnterpriseUserRoleChange: vi.fn(),
    handleEnterpriseUserStatusToggle: vi.fn(),
    applyEnterpriseUserPageInput: vi.fn(),
    handleEnterpriseUserPageJump: vi.fn(),
    ...overrides,
  } as any;
}

function makeEnterprise(overrides: Record<string, unknown> = {}) {
  return {
    id: "ent_1",
    name: "King's College London",
    code: "KCL",
    createdAt: "2026-03-01T10:30:00.000Z",
    users: 12,
    admins: 1,
    enterpriseAdmins: 1,
    staff: 4,
    students: 6,
    modules: 2,
    teams: 3,
    ...overrides,
  };
}

function makeSearchResponse(items: Array<any>, total = items.length, page = 1, pageSize = 8) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    hasPreviousPage: page > 1,
    hasNextPage: page < Math.ceil(total / pageSize),
    query: null,
  };
}

function createSubmitEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>;
}

describe("useEnterpriseManagementState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    useEnterpriseUserManagementStateMock.mockReturnValue(makeUserState());
  });

  it("loads enterprises only for super-admin users", async () => {
    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([makeEnterprise()]));

    const { rerender } = renderHook(({ isSuperAdmin }) => useEnterpriseManagementState(isSuperAdmin), {
      initialProps: { isSuperAdmin: false },
    });

    expect(searchEnterprisesMock).not.toHaveBeenCalled();

    rerender({ isSuperAdmin: true });
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 8 })
    );
  });

  it("stores loaded enterprise results and handles load failures", async () => {
    searchEnterprisesMock.mockResolvedValueOnce(makeSearchResponse([makeEnterprise()], 1));

    const { result, rerender } = renderHook(({ isSuperAdmin }) => useEnterpriseManagementState(isSuperAdmin), {
      initialProps: { isSuperAdmin: true },
    });

    await waitFor(() => expect(result.current.enterpriseTableStatus).toBe("success"));
    expect(result.current.enterprises).toHaveLength(1);
    expect(result.current.enterpriseStart).toBe(1);
    expect(result.current.enterpriseEnd).toBe(1);

    searchEnterprisesMock.mockRejectedValueOnce(new Error("Could not fetch enterprises."));
    act(() => {
      result.current.setSearchQuery("new");
    });
    rerender({ isSuperAdmin: true });

    await waitFor(() => expect(result.current.enterpriseTableStatus).toBe("error"));
    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe("Could not fetch enterprises.");
    expect(result.current.enterprises).toEqual([]);
  });

  it("validates and creates enterprises, then resets modal inputs", async () => {
    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([], 0));
    createEnterpriseMock.mockResolvedValue(makeEnterprise({ id: "ent_2", name: "Acme", code: "ACM" }) as any);

    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleCreateEnterprise(createSubmitEvent());
    });
    expect(result.current.message).toBe("Enterprise name is required.");
    expect(createEnterpriseMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setCreateModalOpen(true);
      result.current.setNameInput("  Acme  ");
      result.current.setCodeInput("acm");
    });

    await act(async () => {
      await result.current.handleCreateEnterprise(createSubmitEvent());
    });

    expect(createEnterpriseMock).toHaveBeenCalledWith({ name: "Acme", code: "ACM" });
    expect(result.current.status).toBe("success");
    expect(result.current.createModalOpen).toBe(false);
    expect(result.current.nameInput).toBe("");
    expect(result.current.codeInput).toBe("");
    expect(result.current.toastMessage).toContain('Enterprise "Acme" created with code ACM.');
  });

  it("handles create and delete enterprise API failures", async () => {
    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([makeEnterprise()], 1));
    createEnterpriseMock.mockRejectedValueOnce(new Error("Create failed."));
    deleteEnterpriseMock.mockRejectedValueOnce(new Error("Delete failed."));

    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    act(() => {
      result.current.setNameInput("Acme");
    });
    await act(async () => {
      await result.current.handleCreateEnterprise(createSubmitEvent());
    });
    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe("Create failed.");

    act(() => {
      result.current.setPendingDeleteEnterprise(makeEnterprise());
    });
    await act(async () => {
      await result.current.handleDeleteEnterprise();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe("Delete failed.");
  });

  it("handles unknown create/delete errors and ignores delete without a pending enterprise", async () => {
    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([makeEnterprise()], 1));
    createEnterpriseMock.mockRejectedValueOnce("Create unknown failure");
    deleteEnterpriseMock.mockRejectedValueOnce("Delete unknown failure");

    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleDeleteEnterprise();
    });
    expect(deleteEnterpriseMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setNameInput("Acme");
    });
    await act(async () => {
      await result.current.handleCreateEnterprise(createSubmitEvent());
    });
    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe("Could not create enterprise.");

    act(() => {
      result.current.setPendingDeleteEnterprise(makeEnterprise());
    });
    await act(async () => {
      await result.current.handleDeleteEnterprise();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe("Could not delete enterprise.");
  });

  it("deletes enterprise, clears selected enterprise when needed, and reloads current page", async () => {
    const clearSelectedEnterpriseIfDeleted = vi.fn();
    useEnterpriseUserManagementStateMock.mockReturnValue(
      makeUserState({ clearSelectedEnterpriseIfDeleted })
    );

    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([makeEnterprise()], 1));
    deleteEnterpriseMock.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setPendingDeleteEnterprise(makeEnterprise({ id: "ent_1", name: "KCL" }));
    });

    await act(async () => {
      await result.current.handleDeleteEnterprise();
    });

    expect(deleteEnterpriseMock).toHaveBeenCalledWith("ent_1");
    expect(clearSelectedEnterpriseIfDeleted).toHaveBeenCalledWith("ent_1");
    expect(result.current.status).toBe("success");
    expect(result.current.pendingDeleteEnterprise).toBeNull();
    expect(result.current.deleteState.ent_1).toBe(false);
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalledTimes(2));
  });

  it("applies and validates page input, and resets page on normalized search changes", async () => {
    searchEnterprisesMock.mockImplementation(async ({ page = 1 } = {}) =>
      makeSearchResponse([makeEnterprise()], 40, page, 8)
    );
    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(result.current.enterpriseTotalPages).toBe(5));

    await act(async () => {
      result.current.setCurrentPage(3);
    });
    await waitFor(() => expect(result.current.currentPage).toBe(3));
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({
        q: undefined,
        page: 3,
        pageSize: 8,
      })
    );

    act(() => {
      result.current.applyPageInput("bad");
    });
    expect(result.current.pageInput).toBe("3");

    await act(async () => {
      result.current.applyPageInput("5");
    });
    await waitFor(() => expect(result.current.currentPage).toBe(5));
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({
        q: undefined,
        page: 5,
        pageSize: 8,
      })
    );

    const preventDefault = vi.fn();
    act(() => {
      result.current.setPageInput("2");
    });
    await act(async () => {
      result.current.handlePageJump({ preventDefault } as unknown as FormEvent<HTMLFormElement>);
    });
    expect(preventDefault).toHaveBeenCalled();
    await waitFor(() => expect(result.current.currentPage).toBe(2));
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({
        q: undefined,
        page: 2,
        pageSize: 8,
      })
    );

    await act(async () => {
      result.current.setCurrentPage(4);
    });
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({
        q: undefined,
        page: 4,
        pageSize: 8,
      })
    );

    await act(async () => {
      result.current.setSearchQuery("  acme ");
    });

    await waitFor(() => expect(result.current.currentPage).toBe(1));
    await waitFor(() =>
      expect(searchEnterprisesMock).toHaveBeenCalledWith({
        q: "acme",
        page: 1,
        pageSize: 8,
      })
    );
  });

  it("clears toast messages after 2.5 seconds", async () => {
    searchEnterprisesMock.mockResolvedValue(makeSearchResponse([], 0));
    createEnterpriseMock.mockResolvedValue(makeEnterprise({ id: "ent_3", name: "Toast", code: "TST" }) as any);

    const { result } = renderHook(() => useEnterpriseManagementState(true));
    await waitFor(() => expect(searchEnterprisesMock).toHaveBeenCalled());

    act(() => {
      result.current.setNameInput("Toast");
      result.current.setCodeInput("tst");
    });

    await act(async () => {
      await result.current.handleCreateEnterprise(createSubmitEvent());
    });
    expect(result.current.toastMessage).toContain("Toast");

    await waitFor(() => {
      expect(result.current.toastMessage).toBeNull();
    }, { timeout: 3500 });
  });
});
