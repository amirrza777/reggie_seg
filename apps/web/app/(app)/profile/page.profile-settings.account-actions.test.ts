import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, leaveEnterprise } from "@/features/auth/api/client";
import { useProfileAccountActions } from "./page.profile-settings.account-actions";

vi.mock("@/features/auth/api/client", () => ({
  deleteAccount: vi.fn(),
  leaveEnterprise: vi.fn(),
}));

const deleteAccountMock = vi.mocked(deleteAccount);
const leaveEnterpriseMock = vi.mocked(leaveEnterprise);

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

const profile = {
  id: 1,
  firstName: "Ayan",
  lastName: "Mamun",
  email: "ayan@example.com",
  role: "ENTERPRISE_ADMIN",
  isStaff: true,
  isEnterpriseAdmin: true,
  isUnassigned: false,
  enterpriseName: "Reggie",
} as any;

describe("useProfileAccountActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAccountMock.mockResolvedValue(undefined as never);
    leaveEnterpriseMock.mockResolvedValue(undefined as never);
  });

  it("validates and handles delete-account flow outcomes", async () => {
    const setUser = vi.fn();
    const { result } = renderHook(() =>
      useProfileAccountActions({
        profile,
        setUser,
        router,
        leaveEnterpriseConfirmPhrase: "LEAVE",
      }),
    );

    await act(async () => {
      await result.current.handleDeleteAccount();
    });
    expect(result.current.deleteError).toBe("Password is required.");
    expect(deleteAccountMock).not.toHaveBeenCalled();

    act(() => {
      result.current.openDeleteModal();
      result.current.setDeletePassword("secret");
    });
    await act(async () => {
      await result.current.handleDeleteAccount();
    });
    expect(deleteAccountMock).toHaveBeenCalledWith({ password: "secret" });
    expect(setUser).toHaveBeenCalledWith(null);
    expect(router.push).toHaveBeenCalledWith("/login");
    expect(result.current.deleteModalOpen).toBe(false);

    deleteAccountMock.mockRejectedValueOnce("bad" as never);
    act(() => {
      result.current.openDeleteModal();
      result.current.setDeletePassword("x");
    });
    await act(async () => {
      await result.current.handleDeleteAccount();
    });
    expect(result.current.deleteError).toBe("Failed to delete account.");
  });

  it("handles leave-enterprise validation, success, and error branches", async () => {
    const setUser = vi.fn();
    const { result } = renderHook(() =>
      useProfileAccountActions({
        profile,
        setUser,
        router,
        leaveEnterpriseConfirmPhrase: "LEAVE",
      }),
    );

    act(() => {
      result.current.openLeaveModal();
      result.current.setLeavePhrase("wrong");
    });
    await act(async () => {
      await result.current.handleLeaveEnterprise();
    });
    expect(result.current.leaveError).toBe("Type LEAVE to confirm.");
    expect(leaveEnterpriseMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setLeavePhrase("leave");
    });
    await act(async () => {
      await result.current.handleLeaveEnterprise();
    });
    expect(leaveEnterpriseMock).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "STUDENT",
        isStaff: false,
        isEnterpriseAdmin: false,
        isUnassigned: true,
        enterpriseName: "Not assigned",
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/dashboard");
    expect(router.refresh).toHaveBeenCalled();

    leaveEnterpriseMock.mockRejectedValueOnce(new Error("leave failed"));
    act(() => {
      result.current.openLeaveModal();
      result.current.setLeavePhrase("LEAVE");
    });
    await act(async () => {
      await result.current.handleLeaveEnterprise();
    });
    expect(result.current.leaveError).toBe("leave failed");
  });

  it("returns early when leave-enterprise is triggered without a profile", async () => {
    const setUser = vi.fn();
    const { result } = renderHook(() =>
      useProfileAccountActions({
        profile: null,
        setUser,
        router,
        leaveEnterpriseConfirmPhrase: "LEAVE",
      }),
    );

    await act(async () => {
      await result.current.handleLeaveEnterprise();
    });
    expect(leaveEnterpriseMock).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it("opens and closes delete/leave modals and blocks close while busy", async () => {
    const setUser = vi.fn();
    const { result } = renderHook(() =>
      useProfileAccountActions({
        profile,
        setUser,
        router,
        leaveEnterpriseConfirmPhrase: "LEAVE",
      }),
    );

    act(() => {
      result.current.openDeleteModal();
    });
    expect(result.current.deleteModalOpen).toBe(true);
    act(() => {
      result.current.closeDeleteModal();
    });
    expect(result.current.deleteModalOpen).toBe(false);

    deleteAccountMock.mockImplementationOnce(
      () => new Promise(() => {
        // keep pending to verify close guard while busy
      }) as never,
    );
    act(() => {
      result.current.openDeleteModal();
      result.current.setDeletePassword("secret");
    });
    await act(async () => {
      void result.current.handleDeleteAccount();
    });
    act(() => {
      result.current.closeDeleteModal();
    });
    expect(result.current.deleteModalOpen).toBe(true);

    act(() => {
      result.current.openLeaveModal();
    });
    expect(result.current.leaveModalOpen).toBe(true);
    act(() => {
      result.current.closeLeaveModal();
    });
    expect(result.current.leaveModalOpen).toBe(false);

    leaveEnterpriseMock.mockImplementationOnce(
      () => new Promise(() => {
        // keep pending to verify close guard while busy
      }) as never,
    );
    act(() => {
      result.current.openLeaveModal();
      result.current.setLeavePhrase("LEAVE");
    });
    await act(async () => {
      void result.current.handleLeaveEnterprise();
    });
    act(() => {
      result.current.closeLeaveModal();
    });
    expect(result.current.leaveModalOpen).toBe(true);
  });
});
