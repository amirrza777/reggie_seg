import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchEnterpriseModuleAccessUsers } from "../../api/client";
import { useEnterpriseModuleAccessBuckets } from "./useEnterpriseModuleAccessBuckets";

vi.mock("../../api/client", () => ({
  searchEnterpriseModuleAccessUsers: vi.fn(),
}));

const searchEnterpriseModuleAccessUsersMock = vi.mocked(searchEnterpriseModuleAccessUsers);

function makeResponse(scope: "staff" | "all" | "students", page = 1, totalPages = 2) {
  return {
    items: [
      {
        id: 101 + page,
        email: `${scope}${page}@example.com`,
        firstName: scope,
        lastName: "User",
        active: true,
      },
    ],
    total: totalPages * 20,
    page,
    pageSize: 20,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    query: null,
    scope,
  };
}

describe("useEnterpriseModuleAccessBuckets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only the staff bucket in create mode", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff" } = {}) =>
      makeResponse(scope)
    );

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "create",
        isEditMode: false,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );

    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 1,
        pageSize: 20,
      })
    );

    expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.staffStatus).toBe("success"));
    expect(result.current.taStatus).toBe("idle");
    expect(result.current.studentStatus).toBe("idle");
  });

  it("loads all buckets in edit mode when editing is allowed", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff" } = {}) =>
      makeResponse(scope)
    );

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "edit",
        isEditMode: true,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );

    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff_and_students",
        q: undefined,
        page: 1,
        pageSize: 20,
      })
    );
    expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
      scope: "students",
      q: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
      scope: "staff",
      q: undefined,
      page: 1,
      pageSize: 20,
    });

    await waitFor(() => expect(result.current.taStatus).toBe("success"));
    await waitFor(() => expect(result.current.studentStatus).toBe("success"));
  });

  it("does not load users while access is loading or edit permission is missing", () => {
    renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "edit",
        isEditMode: true,
        isLoadingAccess: true,
        canEditModule: true,
      })
    );
    renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "edit",
        isEditMode: true,
        isLoadingAccess: false,
        canEditModule: false,
      })
    );

    expect(searchEnterpriseModuleAccessUsersMock).not.toHaveBeenCalled();
  });

  it("handles out-of-range pages by clamping to API total pages", async () => {
    searchEnterpriseModuleAccessUsersMock.mockResolvedValue(makeResponse("staff", 5, 2) as any);

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "create",
        isEditMode: false,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );

    await waitFor(() => expect(result.current.staffPage).toBe(2));
  });

  it("handles request failures per bucket", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff" } = {}) => {
      if (scope === "staff") throw new Error("Staff load failed.");
      return makeResponse(scope);
    });

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "edit",
        isEditMode: true,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );

    await waitFor(() => expect(result.current.staffStatus).toBe("error"));
    expect(result.current.staffMessage).toBe("Staff load failed.");
    expect(result.current.staffUsers).toEqual([]);
    expect(result.current.staffTotal).toBe(0);
    expect(result.current.staffTotalPages).toBe(0);
  });

  it("applies page input validation and keeps page inputs in sync", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff", page = 1 } = {}) =>
      makeResponse(scope, page, 4)
    );

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "create",
        isEditMode: false,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );

    await waitFor(() => expect(result.current.staffTotalPages).toBe(4));

    await act(async () => {
      result.current.setStaffPage(3);
      result.current.setStaffPageInput("3");
    });
    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 3,
        pageSize: 20,
      })
    );

    act(() => {
      result.current.applyPageInput("staff", "not-a-number");
    });
    expect(result.current.staffPageInput).toBe("3");

    await act(async () => {
      result.current.applyPageInput("staff", "4");
    });
    await waitFor(() => expect(result.current.staffPage).toBe(4));
    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 4,
        pageSize: 20,
      })
    );
    expect(result.current.staffPageInput).toBe("4");
  });

  it("passes excludeEnrolledInModule when access-toggle is enabled", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff" } = {}) =>
      makeResponse(scope)
    );

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "edit",
        isEditMode: true,
        isLoadingAccess: false,
        canEditModule: true,
        moduleIdForAccessSearchExclude: 77,
      })
    );

    await waitFor(() => expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalled());
    searchEnterpriseModuleAccessUsersMock.mockClear();

    act(() => {
      result.current.setStaffSearchOnlyWithoutModuleAccess(true);
    });

    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 1,
        pageSize: 20,
        excludeEnrolledInModule: 77,
      })
    );
  });

  it("resets page to 1 on normalized search query changes", async () => {
    searchEnterpriseModuleAccessUsersMock.mockImplementation(async ({ scope = "staff", page = 1 } = {}) =>
      makeResponse(scope, page, 4)
    );

    const { result } = renderHook(() =>
      useEnterpriseModuleAccessBuckets({
        mode: "create",
        isEditMode: false,
        isLoadingAccess: false,
        canEditModule: true,
      })
    );
    await waitFor(() => expect(result.current.staffTotalPages).toBe(4));

    await act(async () => {
      result.current.setStaffPage(4);
    });
    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: undefined,
        page: 4,
        pageSize: 20,
      })
    );

    await act(async () => {
      result.current.setStaffSearchQuery("alpha");
    });

    await waitFor(() => expect(result.current.staffPage).toBe(1));
    await waitFor(() =>
      expect(searchEnterpriseModuleAccessUsersMock).toHaveBeenCalledWith({
        scope: "staff",
        q: "alpha",
        page: 1,
        pageSize: 20,
      })
    );
  });
});
