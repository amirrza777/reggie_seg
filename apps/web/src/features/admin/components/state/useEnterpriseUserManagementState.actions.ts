import { useCallback, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { parsePageInput } from "@/shared/lib/pagination";
import { inviteEnterpriseAdmin, updateEnterpriseUser } from "../../api/client";
import type { AdminUser, EnterpriseRecord, UserRole } from "../../types";
import {
  DEFAULT_ENTERPRISE_USER_SORT_VALUE,
  type EnterpriseUserSortValue,
  type EnterpriseUserActions,
  type EnterpriseUserLoaders,
  normalizeUser,
  type RequestState,
  resolveUnknownError,
} from "./useEnterpriseUserManagementState.shared";

type EnterpriseUserRowUpdater = {
  setEnterpriseUserRow: (userId: number, update: (user: AdminUser) => AdminUser) => void;
};

type EnterpriseUserUpdateOptions = {
  selectedEnterprise: EnterpriseRecord;
  userId: number;
  enterpriseUsers: AdminUser[];
  enterpriseUserSearchQuery: string;
  enterpriseUserPage: number;
  enterpriseUserSortValue: EnterpriseUserSortValue;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUserActionState: Dispatch<SetStateAction<Record<number, RequestState>>>;
  setEnterpriseUserRow: EnterpriseUserRowUpdater["setEnterpriseUserRow"];
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
  showSuccessToast: (message: string) => void;
  payload: { role?: UserRole; active?: boolean };
  optimisticUpdate: (user: AdminUser) => AdminUser;
  successMessage: string;
  errorMessage: string;
};

type EnterpriseUserPagingActions = {
  applyEnterpriseUserPageInput: (value: string) => void;
  handleEnterpriseUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
};

type EnterpriseUserActionsOptions = {
  selectedEnterprise: EnterpriseRecord | null;
  enterpriseUsers: AdminUser[];
  enterpriseUserSearchQuery: string;
  enterpriseUserPage: number;
  enterpriseUserPageInput: string;
  enterpriseUserSortValue: EnterpriseUserSortValue;
  effectiveEnterpriseUserTotalPages: number;
  enterpriseAdminInviteEmail: string;
  setSelectedEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUserActionState: Dispatch<SetStateAction<Record<number, RequestState>>>;
  setEnterpriseUserSearchQuery: Dispatch<SetStateAction<string>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  setEnterpriseUserSortValue: Dispatch<SetStateAction<EnterpriseUserSortValue>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseAdminInviteEmail: Dispatch<SetStateAction<string>>;
  setEnterpriseAdminInviteStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseAdminInviteMessage: Dispatch<SetStateAction<string | null>>;
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
  showSuccessToast: (message: string) => void;
};

type EnterpriseUserUpdateHandlerOptions = Pick<
  EnterpriseUserActionsOptions,
  | "selectedEnterprise"
  | "enterpriseUsers"
  | "enterpriseUserSearchQuery"
  | "enterpriseUserPage"
  | "enterpriseUserSortValue"
  | "setEnterpriseUsers"
  | "setEnterpriseUsersMessage"
  | "setEnterpriseUserActionState"
  | "loadEnterpriseUsers"
  | "showSuccessToast"
> & {
  setEnterpriseUserRow: EnterpriseUserRowUpdater["setEnterpriseUserRow"];
};

type EnterpriseUserResetStateOptions = Pick<
  EnterpriseUserActionsOptions,
  | "setEnterpriseUsers"
  | "setEnterpriseUsersStatus"
  | "setEnterpriseUserTotal"
  | "setEnterpriseUserTotalPages"
  | "setEnterpriseUsersMessage"
  | "setEnterpriseUserSearchQuery"
  | "setEnterpriseUserPage"
  | "setEnterpriseUserPageInput"
  | "setEnterpriseUserSortValue"
  | "setEnterpriseUserActionState"
  | "setEnterpriseAdminInviteEmail"
  | "setEnterpriseAdminInviteStatus"
  | "setEnterpriseAdminInviteMessage"
>;

type EnterpriseAdminInviteActionOptions = Pick<
  EnterpriseUserActionsOptions,
  | "selectedEnterprise"
  | "enterpriseAdminInviteEmail"
  | "setEnterpriseAdminInviteEmail"
  | "setEnterpriseAdminInviteStatus"
  | "setEnterpriseAdminInviteMessage"
  | "showSuccessToast"
>;

function useEnterpriseUserPagingActions(options: {
  enterpriseUserPage: number;
  enterpriseUserPageInput: string;
  effectiveEnterpriseUserTotalPages: number;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
}): EnterpriseUserPagingActions {
  const applyEnterpriseUserPageInput = useCallback((value: string) => {
    const parsedPage = parsePageInput(value, options.effectiveEnterpriseUserTotalPages);
    if (parsedPage === null) {
      options.setEnterpriseUserPageInput(String(options.enterpriseUserPage));
      return;
    }
    options.setEnterpriseUserPage(parsedPage);
  }, [options]);
  const handleEnterpriseUserPageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyEnterpriseUserPageInput(options.enterpriseUserPageInput);
  }, [applyEnterpriseUserPageInput, options.enterpriseUserPageInput]);
  return { applyEnterpriseUserPageInput, handleEnterpriseUserPageJump };
}

async function runEnterpriseUserUpdate(options: EnterpriseUserUpdateOptions) {
  const previousUsers = options.enterpriseUsers.map((user) => ({ ...user }));
  options.setEnterpriseUserActionState((prev) => ({ ...prev, [options.userId]: "loading" }));
  options.setEnterpriseUsersMessage(null);
  options.setEnterpriseUserRow(options.userId, options.optimisticUpdate);
  try {
    const updated = await updateEnterpriseUser(options.selectedEnterprise.id, options.userId, options.payload);
    options.setEnterpriseUserRow(options.userId, () => normalizeUser(updated));
    options.showSuccessToast(options.successMessage);
    void options.loadEnterpriseUsers(
      options.selectedEnterprise.id,
      options.enterpriseUserSearchQuery,
      options.enterpriseUserPage,
      options.enterpriseUserSortValue,
    );
  } catch (err) {
    options.setEnterpriseUsers(previousUsers);
    options.setEnterpriseUsersMessage(resolveUnknownError(err, options.errorMessage));
  } finally {
    options.setEnterpriseUserActionState((prev) => ({ ...prev, [options.userId]: "idle" }));
  }
}

function useEnterpriseUserRowUpdater(setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>) {
  return useCallback((userId: number, update: (user: AdminUser) => AdminUser) => {
    setEnterpriseUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  }, [setEnterpriseUsers]);
}

function useEnterpriseUserListReset(options: EnterpriseUserResetStateOptions) {
  return useCallback(() => {
    options.setEnterpriseUsers([]);
    options.setEnterpriseUsersStatus("idle");
    options.setEnterpriseUserTotal(0);
    options.setEnterpriseUserTotalPages(0);
    options.setEnterpriseUsersMessage(null);
    options.setEnterpriseUserSearchQuery("");
    options.setEnterpriseUserPage(1);
    options.setEnterpriseUserPageInput("1");
    options.setEnterpriseUserSortValue(DEFAULT_ENTERPRISE_USER_SORT_VALUE);
    options.setEnterpriseUserActionState({});
    options.setEnterpriseAdminInviteEmail("");
    options.setEnterpriseAdminInviteStatus("idle");
    options.setEnterpriseAdminInviteMessage(null);
  }, [options]);
}

function useSelectedEnterpriseActions(options: {
  setSelectedEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
  resetEnterpriseUserListState: () => void;
}) {
  const resetSelectedEnterprise = useCallback(() => {
    options.resetEnterpriseUserListState();
    options.setSelectedEnterprise(null);
  }, [options]);
  const openEnterpriseAccounts = useCallback((enterprise: EnterpriseRecord) => {
    options.resetEnterpriseUserListState();
    options.setSelectedEnterprise(enterprise);
  }, [options]);
  return { resetSelectedEnterprise, openEnterpriseAccounts };
}

function resolveEnterpriseUserUpdateBase(options: EnterpriseUserUpdateHandlerOptions, userId: number) {
  if (!options.selectedEnterprise) {
    return null;
  }
  return {
    selectedEnterprise: options.selectedEnterprise,
    userId,
    enterpriseUsers: options.enterpriseUsers,
    enterpriseUserSearchQuery: options.enterpriseUserSearchQuery,
    enterpriseUserPage: options.enterpriseUserPage,
    enterpriseUserSortValue: options.enterpriseUserSortValue,
    setEnterpriseUsers: options.setEnterpriseUsers,
    setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
    setEnterpriseUserActionState: options.setEnterpriseUserActionState,
    setEnterpriseUserRow: options.setEnterpriseUserRow,
    loadEnterpriseUsers: options.loadEnterpriseUsers,
    showSuccessToast: options.showSuccessToast,
  };
}

function useEnterpriseUserUpdateHandlers(options: EnterpriseUserUpdateHandlerOptions) {
  const handleEnterpriseUserRoleChange = useCallback(async (userId: number, role: UserRole) => {
    const baseOptions = resolveEnterpriseUserUpdateBase(options, userId);
    if (!baseOptions) {
      return;
    }
    await runEnterpriseUserUpdate({
      ...baseOptions,
      payload: { role },
      optimisticUpdate: (user) => ({ ...user, role, isStaff: role !== "STUDENT" }),
      successMessage: `Updated role to ${role.toLowerCase().replace(/_/g, " ")}.`,
      errorMessage: "Could not update role.",
    });
  }, [options]);
  const handleEnterpriseUserStatusToggle = useCallback(async (userId: number, nextStatus: boolean) => {
    const baseOptions = resolveEnterpriseUserUpdateBase(options, userId);
    if (!baseOptions) {
      return;
    }
    await runEnterpriseUserUpdate({
      ...baseOptions,
      payload: { active: nextStatus },
      optimisticUpdate: (user) => ({ ...user, active: nextStatus }),
      successMessage: nextStatus ? "Account activated." : "Account suspended.",
      errorMessage: "Could not update account status.",
    });
  }, [options]);
  return { handleEnterpriseUserRoleChange, handleEnterpriseUserStatusToggle };
}

function useClearSelectedEnterpriseIfDeleted(selectedEnterpriseId: string | undefined, resetSelectedEnterprise: () => void) {
  return useCallback((enterpriseId: string) => {
    if (selectedEnterpriseId !== enterpriseId) {
      return;
    }
    resetSelectedEnterprise();
  }, [selectedEnterpriseId, resetSelectedEnterprise]);
}

function validateInviteEmail(value: string): string | null {
  if (!value) {
    return "Invite email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

function useEnterpriseAdminInviteAction(options: EnterpriseAdminInviteActionOptions) {
  return useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!options.selectedEnterprise) {
      return;
    }

    const email = options.enterpriseAdminInviteEmail.trim().toLowerCase();
    const validationError = validateInviteEmail(email);
    if (validationError) {
      options.setEnterpriseAdminInviteStatus("error");
      options.setEnterpriseAdminInviteMessage(validationError);
      return;
    }

    options.setEnterpriseAdminInviteStatus("loading");
    options.setEnterpriseAdminInviteMessage(null);
    try {
      const result = await inviteEnterpriseAdmin(options.selectedEnterprise.id, email);
      options.setEnterpriseAdminInviteEmail("");
      options.setEnterpriseAdminInviteStatus("success");
      options.setEnterpriseAdminInviteMessage(`Invite sent to ${result.email}.`);
      options.showSuccessToast(`Sent enterprise admin invite to ${result.email}.`);
    } catch (err) {
      options.setEnterpriseAdminInviteStatus("error");
      options.setEnterpriseAdminInviteMessage(resolveUnknownError(err, "Could not send enterprise admin invite."));
    }
  }, [options]);
}

export function useEnterpriseUserActions(options: EnterpriseUserActionsOptions): EnterpriseUserActions {
  const setEnterpriseUserRow = useEnterpriseUserRowUpdater(options.setEnterpriseUsers);
  const resetEnterpriseUserListState = useEnterpriseUserListReset(options);
  const selectedEnterpriseActions = useSelectedEnterpriseActions({ setSelectedEnterprise: options.setSelectedEnterprise, resetEnterpriseUserListState });
  const updateHandlers = useEnterpriseUserUpdateHandlers({ ...options, setEnterpriseUserRow });
  const submitEnterpriseAdminInvite = useEnterpriseAdminInviteAction(options);
  const pagingActions = useEnterpriseUserPagingActions(options);
  const clearSelectedEnterpriseIfDeleted = useClearSelectedEnterpriseIfDeleted(options.selectedEnterprise?.id, selectedEnterpriseActions.resetSelectedEnterprise);
  return {
    resetSelectedEnterprise: selectedEnterpriseActions.resetSelectedEnterprise,
    openEnterpriseAccounts: selectedEnterpriseActions.openEnterpriseAccounts,
    handleEnterpriseUserRoleChange: updateHandlers.handleEnterpriseUserRoleChange,
    handleEnterpriseUserStatusToggle: updateHandlers.handleEnterpriseUserStatusToggle,
    submitEnterpriseAdminInvite,
    applyEnterpriseUserPageInput: pagingActions.applyEnterpriseUserPageInput,
    handleEnterpriseUserPageJump: pagingActions.handleEnterpriseUserPageJump,
    clearSelectedEnterpriseIfDeleted,
  };
}
