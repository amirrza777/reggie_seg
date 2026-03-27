import { useCallback, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { parsePageInput } from "@/shared/lib/pagination";
import { updateEnterpriseUser } from "../api/client";
import type { AdminUser, EnterpriseRecord, UserRole } from "../types";
import {
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
  effectiveEnterpriseUserTotalPages: number;
  setSelectedEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUserActionState: Dispatch<SetStateAction<Record<number, RequestState>>>;
  setEnterpriseUserSearchQuery: Dispatch<SetStateAction<string>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
  showSuccessToast: (message: string) => void;
};

function useEnterpriseUserPagingActions(options: {
  enterpriseUserPage: number;
  enterpriseUserPageInput: string;
  effectiveEnterpriseUserTotalPages: number;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
}): EnterpriseUserPagingActions {
  const {
    enterpriseUserPage,
    enterpriseUserPageInput,
    effectiveEnterpriseUserTotalPages,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
  } = options;

  const applyEnterpriseUserPageInput = useCallback((value: string) => {
    const parsedPage = parsePageInput(value, effectiveEnterpriseUserTotalPages);
    if (parsedPage === null) {
      setEnterpriseUserPageInput(String(enterpriseUserPage));
      return;
    }
    setEnterpriseUserPage(parsedPage);
  }, [effectiveEnterpriseUserTotalPages, enterpriseUserPage, setEnterpriseUserPage, setEnterpriseUserPageInput]);

  const handleEnterpriseUserPageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyEnterpriseUserPageInput(enterpriseUserPageInput);
  }, [applyEnterpriseUserPageInput, enterpriseUserPageInput]);

  return {
    applyEnterpriseUserPageInput,
    handleEnterpriseUserPageJump,
  };
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
    );
  } catch (err) {
    options.setEnterpriseUsers(previousUsers);
    options.setEnterpriseUsersMessage(resolveUnknownError(err, options.errorMessage));
  } finally {
    options.setEnterpriseUserActionState((prev) => ({ ...prev, [options.userId]: "idle" }));
  }
}

export function useEnterpriseUserActions(options: EnterpriseUserActionsOptions): EnterpriseUserActions {
  const {
    selectedEnterprise,
    enterpriseUsers,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    enterpriseUserPageInput,
    effectiveEnterpriseUserTotalPages,
    setSelectedEnterprise,
    setEnterpriseUsers,
    setEnterpriseUsersStatus,
    setEnterpriseUsersMessage,
    setEnterpriseUserActionState,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    loadEnterpriseUsers,
    showSuccessToast,
  } = options;

  const setEnterpriseUserRow = useCallback((userId: number, update: (user: AdminUser) => AdminUser) => {
    setEnterpriseUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  }, [setEnterpriseUsers]);

  const resetEnterpriseUserListState = useCallback(() => {
    setEnterpriseUsers([]);
    setEnterpriseUsersStatus("idle");
    setEnterpriseUserTotal(0);
    setEnterpriseUserTotalPages(0);
    setEnterpriseUsersMessage(null);
    setEnterpriseUserSearchQuery("");
    setEnterpriseUserPage(1);
    setEnterpriseUserPageInput("1");
    setEnterpriseUserActionState({});
  }, [
    setEnterpriseUserActionState,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
  ]);

  const resetSelectedEnterprise = useCallback(() => {
    resetEnterpriseUserListState();
    setSelectedEnterprise(null);
  }, [setSelectedEnterprise, resetEnterpriseUserListState]);

  const openEnterpriseAccounts = useCallback((enterprise: EnterpriseRecord) => {
    resetEnterpriseUserListState();
    setSelectedEnterprise(enterprise);
  }, [setSelectedEnterprise, resetEnterpriseUserListState]);

  const handleEnterpriseUserRoleChange = useCallback(async (userId: number, role: UserRole) => {
    if (!selectedEnterprise) return;
    await runEnterpriseUserUpdate({
      selectedEnterprise,
      userId,
      enterpriseUsers,
      enterpriseUserSearchQuery,
      enterpriseUserPage,
      setEnterpriseUsers,
      setEnterpriseUsersMessage,
      setEnterpriseUserActionState,
      setEnterpriseUserRow,
      loadEnterpriseUsers,
      showSuccessToast,
      payload: { role },
      optimisticUpdate: (user) => ({ ...user, role, isStaff: role !== "STUDENT" }),
      successMessage: `Updated role to ${role.toLowerCase()}.`,
      errorMessage: "Could not update role.",
    });
  }, [
    enterpriseUserPage,
    enterpriseUserSearchQuery,
    enterpriseUsers,
    loadEnterpriseUsers,
    selectedEnterprise,
    setEnterpriseUserActionState,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    showSuccessToast,
    setEnterpriseUserRow,
  ]);

  const handleEnterpriseUserStatusToggle = useCallback(async (userId: number, nextStatus: boolean) => {
    if (!selectedEnterprise) return;
    await runEnterpriseUserUpdate({
      selectedEnterprise,
      userId,
      enterpriseUsers,
      enterpriseUserSearchQuery,
      enterpriseUserPage,
      setEnterpriseUsers,
      setEnterpriseUsersMessage,
      setEnterpriseUserActionState,
      setEnterpriseUserRow,
      loadEnterpriseUsers,
      showSuccessToast,
      payload: { active: nextStatus },
      optimisticUpdate: (user) => ({ ...user, active: nextStatus }),
      successMessage: nextStatus ? "Account activated." : "Account suspended.",
      errorMessage: "Could not update account status.",
    });
  }, [
    enterpriseUserPage,
    enterpriseUserSearchQuery,
    enterpriseUsers,
    loadEnterpriseUsers,
    selectedEnterprise,
    setEnterpriseUserActionState,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    showSuccessToast,
    setEnterpriseUserRow,
  ]);

  const pagingActions = useEnterpriseUserPagingActions({
    enterpriseUserPage,
    enterpriseUserPageInput,
    effectiveEnterpriseUserTotalPages,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
  });

  const clearSelectedEnterpriseIfDeleted = useCallback((enterpriseId: string) => {
    if (selectedEnterprise?.id !== enterpriseId) return;
    resetSelectedEnterprise();
  }, [selectedEnterprise?.id, resetSelectedEnterprise]);

  return {
    resetSelectedEnterprise,
    openEnterpriseAccounts,
    handleEnterpriseUserRoleChange,
    handleEnterpriseUserStatusToggle,
    applyEnterpriseUserPageInput: pagingActions.applyEnterpriseUserPageInput,
    handleEnterpriseUserPageJump: pagingActions.handleEnterpriseUserPageJump,
    clearSelectedEnterpriseIfDeleted,
  };
}
