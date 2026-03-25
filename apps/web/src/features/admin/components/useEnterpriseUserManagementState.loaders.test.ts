import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchEnterpriseUsers } from "../api/client";
import { useEnterpriseUserLoaders } from "./useEnterpriseUserManagementState.loaders";

vi.mock("../api/client", () => ({
  searchEnterpriseUsers: vi.fn(),
}));

const searchEnterpriseUsersMock = vi.mocked(searchEnterpriseUsers);

function createOptions() {
  return {
    latestEnterpriseUsersRequestRef: { current: 0 },
    setEnterpriseUsers: vi.fn(),
    setEnterpriseUsersMessage: vi.fn(),
    setEnterpriseUsersStatus: vi.fn(),
    setEnterpriseUserTotal: vi.fn(),
    setEnterpriseUserTotalPages: vi.fn(),
    setEnterpriseUserPage: vi.fn(),
  };
}

describe("useEnterpriseUserLoaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads users successfully and normalizes fields", async () => {
    const options = createOptions();
    searchEnterpriseUsersMock.mockResolvedValue({
      items: [
        {
          id: 7,
          email: "learner@example.com",
          firstName: "Learner",
          lastName: "One",
          isStaff: false,
          role: null,
          active: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      query: null,
      role: null,
      active: null,
    });

    const { result } = renderHook(() => useEnterpriseUserLoaders(options));

    await act(async () => {
      await result.current.loadEnterpriseUsers("enterprise-1", " learner ", 1);
    });

    expect(searchEnterpriseUsersMock).toHaveBeenCalledWith("enterprise-1", {
      q: "learner",
      page: 1,
      pageSize: 10,
    });
    expect(options.setEnterpriseUsersStatus).toHaveBeenCalledWith("loading");
    expect(options.setEnterpriseUsersStatus).toHaveBeenCalledWith("success");
    expect(options.setEnterpriseUsers).toHaveBeenCalledWith([
      {
        id: 7,
        email: "learner@example.com",
        firstName: "Learner",
        lastName: "One",
        isStaff: false,
        role: "STUDENT",
        active: true,
      },
    ]);
    expect(options.setEnterpriseUsersMessage).not.toHaveBeenCalledWith("No user accounts found in this enterprise.");
  });

  it("adjusts page when response page is out of range", async () => {
    const options = createOptions();
    searchEnterpriseUsersMock.mockResolvedValue({
      items: [],
      total: 5,
      page: 5,
      pageSize: 10,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
      query: null,
      role: null,
      active: null,
    });

    const { result } = renderHook(() => useEnterpriseUserLoaders(options));

    await act(async () => {
      await result.current.loadEnterpriseUsers("enterprise-2", "", 5);
    });

    expect(options.setEnterpriseUserPage).toHaveBeenCalledWith(2);
    expect(options.setEnterpriseUsers).not.toHaveBeenCalled();
  });

  it("sets an empty-state message for empty results", async () => {
    const options = createOptions();
    searchEnterpriseUsersMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
      query: null,
      role: null,
      active: null,
    });

    const { result } = renderHook(() => useEnterpriseUserLoaders(options));

    await act(async () => {
      await result.current.loadEnterpriseUsers("enterprise-3", "", 1);
    });

    expect(options.setEnterpriseUsersMessage).toHaveBeenCalledWith("No user accounts found in this enterprise.");
  });

  it("applies error state when loading fails", async () => {
    const options = createOptions();
    searchEnterpriseUsersMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useEnterpriseUserLoaders(options));

    await act(async () => {
      await result.current.loadEnterpriseUsers("enterprise-4", "abc", 2);
    });

    expect(options.setEnterpriseUsers).toHaveBeenCalledWith([]);
    expect(options.setEnterpriseUserTotal).toHaveBeenCalledWith(0);
    expect(options.setEnterpriseUserTotalPages).toHaveBeenCalledWith(0);
    expect(options.setEnterpriseUsersStatus).toHaveBeenCalledWith("error");
    expect(options.setEnterpriseUsersMessage).toHaveBeenCalledWith("network down");
  });
});
