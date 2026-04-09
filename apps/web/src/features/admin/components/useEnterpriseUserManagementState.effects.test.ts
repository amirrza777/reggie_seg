import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { normalizeSearchQuery } from "@/shared/lib/search";
import type { EnterpriseRecord } from "../types";
import { useEnterpriseUserEffects } from "./useEnterpriseUserManagementState.effects";

const enterprise: EnterpriseRecord = {
  id: "ent_1",
  name: "Test Enterprise",
  code: "TEST",
  createdAt: "2026-04-08T00:00:00.000Z",
  users: 0,
  admins: 0,
  enterpriseAdmins: 0,
  staff: 0,
  students: 0,
  modules: 0,
  teams: 0,
};

function useEffectsHarness(loadEnterpriseUsers: ReturnType<typeof vi.fn>) {
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseRecord | null>(enterprise);
  const [enterpriseUserSearchQuery, setEnterpriseUserSearchQuery] = useState("");
  const [enterpriseUserPage, setEnterpriseUserPage] = useState(1);
  const [enterpriseUserPageInput, setEnterpriseUserPageInput] = useState("1");
  const [enterpriseUserSortValue, setEnterpriseUserSortValue] = useState<"default" | "joinDateDesc">("default");
  const [unrelatedTick, setUnrelatedTick] = useState(0);

  useEnterpriseUserEffects({
    selectedEnterprise,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    enterpriseUserSortValue,
    normalizedEnterpriseUserSearch: normalizeSearchQuery(enterpriseUserSearchQuery),
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    loadEnterpriseUsers,
  });

  return {
    selectedEnterprise,
    enterpriseUserPageInput,
    unrelatedTick,
    setSelectedEnterprise,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserPage,
    setEnterpriseUserSortValue,
    setUnrelatedTick,
  };
}

describe("useEnterpriseUserEffects", () => {
  it("does not refetch on unrelated rerenders", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useEffectsHarness(loadEnterpriseUsers));

    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledTimes(1));
    expect(loadEnterpriseUsers).toHaveBeenLastCalledWith("ent_1", "", 1, "default");

    act(() => {
      result.current.setUnrelatedTick((previous) => previous + 1);
    });

    expect(result.current.unrelatedTick).toBe(1);
    expect(loadEnterpriseUsers).toHaveBeenCalledTimes(1);
  });

  it("refetches when dependencies change and skips when enterprise is cleared", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useEffectsHarness(loadEnterpriseUsers));

    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setEnterpriseUserSearchQuery("alice");
    });
    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "alice", 1, "default"));

    act(() => {
      result.current.setEnterpriseUserPage(2);
    });
    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "alice", 2, "default"));

    const callCountBeforeClear = loadEnterpriseUsers.mock.calls.length;
    act(() => {
      result.current.setSelectedEnterprise(null);
    });
    expect(result.current.selectedEnterprise).toBeNull();
    expect(loadEnterpriseUsers).toHaveBeenCalledTimes(callCountBeforeClear);
  });

  it("syncs page input with current page", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useEffectsHarness(loadEnterpriseUsers));

    expect(result.current.enterpriseUserPageInput).toBe("1");

    act(() => {
      result.current.setEnterpriseUserPage(3);
    });

    await waitFor(() => expect(result.current.enterpriseUserPageInput).toBe("3"));
  });

  it("resets page and refetches when sort changes", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useEffectsHarness(loadEnterpriseUsers));

    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "", 1, "default"));

    act(() => {
      result.current.setEnterpriseUserPage(2);
    });
    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "", 2, "default"));

    act(() => {
      result.current.setEnterpriseUserSortValue("joinDateDesc");
    });
    await waitFor(() => expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "", 1, "joinDateDesc"));
  });
});
