import { act, renderHook, waitFor } from "@testing-library/react";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteEnterpriseAdmin, updateEnterpriseUser } from "../api/client";
import { useEnterpriseUserActions } from "./useEnterpriseUserManagementState.actions";
import type { AdminUser, EnterpriseRecord } from "../types";
import type { EnterpriseUserSortValue } from "./useEnterpriseUserManagementState.shared";

vi.mock("../api/client", () => ({
  inviteEnterpriseAdmin: vi.fn(),
  updateEnterpriseUser: vi.fn(),
}));

const inviteEnterpriseAdminMock = vi.mocked(inviteEnterpriseAdmin);
const updateEnterpriseUserMock = vi.mocked(updateEnterpriseUser);

const enterprise: EnterpriseRecord = {
  id: "ent_1",
  name: "KCL",
  code: "KCL",
  createdAt: "2026-03-01T10:00:00.000Z",
  users: 5,
  admins: 1,
  enterpriseAdmins: 1,
  staff: 2,
  students: 2,
  modules: 1,
  teams: 1,
};

const userA: AdminUser = {
  id: 11,
  email: "student@example.com",
  firstName: "Student",
  lastName: "One",
  isStaff: false,
  role: "STUDENT",
  active: true,
};

type HarnessOptions = {
  selectedEnterprise: EnterpriseRecord | null;
  enterpriseUsers: AdminUser[];
  enterpriseUserSearchQuery?: string;
  enterpriseUserPage?: number;
  enterpriseUserPageInput?: string;
  enterpriseUserSortValue?: EnterpriseUserSortValue;
  effectiveEnterpriseUserTotalPages?: number;
  enterpriseAdminInviteEmail?: string;
  loadEnterpriseUsers?: ReturnType<typeof vi.fn>;
  showSuccessToast?: ReturnType<typeof vi.fn>;
};

function useActionsHarness(options: HarnessOptions) {
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseRecord | null>(options.selectedEnterprise);
  const [enterpriseUsers, setEnterpriseUsers] = useState<AdminUser[]>(options.enterpriseUsers);
  const [enterpriseUsersStatus, setEnterpriseUsersStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [enterpriseUsersMessage, setEnterpriseUsersMessage] = useState<string | null>(null);
  const [enterpriseUserActionState, setEnterpriseUserActionState] = useState<
    Record<number, "idle" | "loading" | "success" | "error">
  >({});
  const [enterpriseUserSearchQuery, setEnterpriseUserSearchQuery] = useState(
    options.enterpriseUserSearchQuery ?? ""
  );
  const [enterpriseUserPage, setEnterpriseUserPage] = useState(options.enterpriseUserPage ?? 1);
  const [enterpriseUserPageInput, setEnterpriseUserPageInput] = useState(options.enterpriseUserPageInput ?? "1");
  const [enterpriseUserSortValue, setEnterpriseUserSortValue] = useState<EnterpriseUserSortValue>(
    options.enterpriseUserSortValue ?? "default"
  );
  const [enterpriseUserTotal, setEnterpriseUserTotal] = useState(99);
  const [enterpriseUserTotalPages, setEnterpriseUserTotalPages] = useState(9);
  const [enterpriseAdminInviteEmail, setEnterpriseAdminInviteEmail] = useState(options.enterpriseAdminInviteEmail ?? "");
  const [enterpriseAdminInviteStatus, setEnterpriseAdminInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [enterpriseAdminInviteMessage, setEnterpriseAdminInviteMessage] = useState<string | null>(null);

  const actions = useEnterpriseUserActions({
    selectedEnterprise,
    enterpriseUsers,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    enterpriseUserPageInput,
    enterpriseUserSortValue,
    effectiveEnterpriseUserTotalPages: options.effectiveEnterpriseUserTotalPages ?? 9,
    enterpriseAdminInviteEmail,
    setSelectedEnterprise,
    setEnterpriseUsers: setEnterpriseUsers as Dispatch<SetStateAction<AdminUser[]>>,
    setEnterpriseUsersStatus: setEnterpriseUsersStatus,
    setEnterpriseUsersMessage,
    setEnterpriseUserActionState: setEnterpriseUserActionState as Dispatch<
      SetStateAction<Record<number, "idle" | "loading" | "success" | "error">>
    >,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    setEnterpriseUserSortValue,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseAdminInviteEmail,
    setEnterpriseAdminInviteStatus,
    setEnterpriseAdminInviteMessage,
    loadEnterpriseUsers: options.loadEnterpriseUsers ?? vi.fn().mockResolvedValue(undefined),
    showSuccessToast: options.showSuccessToast ?? vi.fn(),
  });

  return {
    selectedEnterprise,
    enterpriseUsers,
    enterpriseUsersStatus,
    enterpriseUsersMessage,
    enterpriseUserActionState,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    enterpriseUserPageInput,
    enterpriseUserSortValue,
    enterpriseUserTotal,
    enterpriseUserTotalPages,
    enterpriseAdminInviteEmail,
    setEnterpriseAdminInviteEmail,
    enterpriseAdminInviteStatus,
    enterpriseAdminInviteMessage,
    actions,
  };
}

describe("useEnterpriseUserActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens and resets enterprise accounts state", () => {
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: null,
        enterpriseUsers: [userA],
        enterpriseUserSearchQuery: "student",
        enterpriseUserPage: 4,
        enterpriseUserPageInput: "4",
        enterpriseUserSortValue: "joinDateDesc",
      })
    );

    act(() => {
      result.current.actions.openEnterpriseAccounts(enterprise);
    });

    expect(result.current.selectedEnterprise?.id).toBe("ent_1");
    expect(result.current.enterpriseUsers).toEqual([]);
    expect(result.current.enterpriseUsersStatus).toBe("idle");
    expect(result.current.enterpriseUserSearchQuery).toBe("");
    expect(result.current.enterpriseUserPage).toBe(1);
    expect(result.current.enterpriseUserPageInput).toBe("1");
    expect(result.current.enterpriseUserSortValue).toBe("default");
    expect(result.current.enterpriseUserTotal).toBe(0);
    expect(result.current.enterpriseUserTotalPages).toBe(0);
  });

  it("resets selected enterprise and list state", () => {
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        enterpriseUserSearchQuery: "foo",
        enterpriseUserPage: 3,
        enterpriseUserPageInput: "3",
      })
    );

    act(() => {
      result.current.actions.resetSelectedEnterprise();
    });

    expect(result.current.selectedEnterprise).toBeNull();
    expect(result.current.enterpriseUsers).toEqual([]);
    expect(result.current.enterpriseUserPage).toBe(1);
  });

  it("applies page input with validation and handles page-jump submit", () => {
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        enterpriseUserPage: 2,
        enterpriseUserPageInput: "2",
        effectiveEnterpriseUserTotalPages: 5,
      })
    );

    act(() => {
      result.current.actions.applyEnterpriseUserPageInput("bad");
    });
    expect(result.current.enterpriseUserPageInput).toBe("2");

    act(() => {
      result.current.actions.applyEnterpriseUserPageInput("4");
    });
    expect(result.current.enterpriseUserPage).toBe(4);

    const preventDefault = vi.fn();
    act(() => {
      result.current.actions.handleEnterpriseUserPageJump({
        preventDefault,
      } as unknown as FormEvent<HTMLFormElement>);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("clears selected enterprise only when deleted id matches", () => {
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
      })
    );

    act(() => {
      result.current.actions.clearSelectedEnterpriseIfDeleted("ent_2");
    });
    expect(result.current.selectedEnterprise?.id).toBe("ent_1");

    act(() => {
      result.current.actions.clearSelectedEnterpriseIfDeleted("ent_1");
    });
    expect(result.current.selectedEnterprise).toBeNull();
  });

  it("no-ops role and status updates when no enterprise is selected", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const showSuccessToast = vi.fn();
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: null,
        enterpriseUsers: [userA],
        loadEnterpriseUsers,
        showSuccessToast,
      })
    );

    await act(async () => {
      await result.current.actions.handleEnterpriseUserRoleChange(userA.id, "STAFF");
      await result.current.actions.handleEnterpriseUserStatusToggle(userA.id, false);
      await result.current.actions.submitEnterpriseAdminInvite({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(inviteEnterpriseAdminMock).not.toHaveBeenCalled();
    expect(updateEnterpriseUserMock).not.toHaveBeenCalled();
    expect(loadEnterpriseUsers).not.toHaveBeenCalled();
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it("updates role successfully with optimistic state and reloads", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const showSuccessToast = vi.fn();
    updateEnterpriseUserMock.mockResolvedValue({
      ...userA,
      role: "STAFF",
      isStaff: true,
      active: true,
    } as any);

    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        enterpriseUserSearchQuery: "stu",
        enterpriseUserPage: 2,
        loadEnterpriseUsers,
        showSuccessToast,
      })
    );

    await act(async () => {
      await result.current.actions.handleEnterpriseUserRoleChange(userA.id, "STAFF");
    });

    expect(updateEnterpriseUserMock).toHaveBeenCalledWith("ent_1", userA.id, { role: "STAFF" });
    expect(result.current.enterpriseUsers[0].role).toBe("STAFF");
    expect(result.current.enterpriseUsers[0].isStaff).toBe(true);
    expect(result.current.enterpriseUserActionState[userA.id]).toBe("idle");
    expect(showSuccessToast).toHaveBeenCalledWith("Updated role to staff.");
    await waitFor(() =>
      expect(loadEnterpriseUsers).toHaveBeenCalledWith("ent_1", "stu", 2, "default")
    );
  });

  it("rolls back role changes and sets message on failure", async () => {
    updateEnterpriseUserMock.mockRejectedValue(new Error("Role update failed."));

    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
      })
    );

    await act(async () => {
      await result.current.actions.handleEnterpriseUserRoleChange(userA.id, "STAFF");
    });

    expect(result.current.enterpriseUsers[0].role).toBe("STUDENT");
    expect(result.current.enterpriseUsersMessage).toBe("Role update failed.");
    expect(result.current.enterpriseUserActionState[userA.id]).toBe("idle");
  });

  it("updates account status and handles failure rollback", async () => {
    const loadEnterpriseUsers = vi.fn().mockResolvedValue(undefined);
    const showSuccessToast = vi.fn();
    updateEnterpriseUserMock
      .mockResolvedValueOnce({ ...userA, active: false } as any)
      .mockRejectedValueOnce(new Error("Status failed."));

    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        loadEnterpriseUsers,
        showSuccessToast,
      })
    );

    await act(async () => {
      await result.current.actions.handleEnterpriseUserStatusToggle(userA.id, false);
    });
    expect(updateEnterpriseUserMock).toHaveBeenNthCalledWith(1, "ent_1", userA.id, { active: false });
    expect(result.current.enterpriseUsers[0].active).toBe(false);
    expect(showSuccessToast).toHaveBeenCalledWith("Account suspended.");

    await act(async () => {
      await result.current.actions.handleEnterpriseUserStatusToggle(userA.id, true);
    });
    expect(result.current.enterpriseUsers[0].active).toBe(false);
    expect(result.current.enterpriseUsersMessage).toBe("Status failed.");
  });

  it("submits enterprise admin invites successfully", async () => {
    const showSuccessToast = vi.fn();
    inviteEnterpriseAdminMock.mockResolvedValueOnce({
      email: "invite@example.com",
      expiresAt: "2026-04-15T12:00:00.000Z",
    } as any);

    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        enterpriseAdminInviteEmail: "invite@example.com",
        showSuccessToast,
      })
    );

    await act(async () => {
      await result.current.actions.submitEnterpriseAdminInvite({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(inviteEnterpriseAdminMock).toHaveBeenCalledWith("ent_1", "invite@example.com");
    expect(result.current.enterpriseAdminInviteEmail).toBe("");
    expect(result.current.enterpriseAdminInviteStatus).toBe("success");
    expect(result.current.enterpriseAdminInviteMessage).toBe("Invite sent to invite@example.com.");
    expect(showSuccessToast).toHaveBeenCalledWith("Sent enterprise admin invite to invite@example.com.");
  });

  it("validates and handles invite submission failures", async () => {
    const { result } = renderHook(() =>
      useActionsHarness({
        selectedEnterprise: enterprise,
        enterpriseUsers: [userA],
        enterpriseAdminInviteEmail: "bad-email",
      })
    );

    await act(async () => {
      await result.current.actions.submitEnterpriseAdminInvite({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
    });
    expect(result.current.enterpriseAdminInviteStatus).toBe("error");
    expect(result.current.enterpriseAdminInviteMessage).toBe("Enter a valid email address.");
    expect(inviteEnterpriseAdminMock).not.toHaveBeenCalled();

    inviteEnterpriseAdminMock.mockRejectedValueOnce(new Error("Invite failed."));
    act(() => {
      result.current.setEnterpriseAdminInviteEmail("invite@example.com");
    });
    await act(async () => {
      await result.current.actions.submitEnterpriseAdminInvite({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
    });
    expect(result.current.enterpriseAdminInviteStatus).toBe("error");
    expect(result.current.enterpriseAdminInviteMessage).toBe("Invite failed.");
  });
});
