import { useCallback, useEffect, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from "react";
import { searchEnterpriseUsers, updateEnterpriseUser } from "../api/client";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../types";

export type RequestState = "idle" | "loading" | "success" | "error";

export const ENTERPRISE_USERS_PER_PAGE = 10;

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

type EnterpriseUsersSearchResponse = Awaited<ReturnType<typeof searchEnterpriseUsers>>;

type EnterpriseUserRowUpdater = {
  setEnterpriseUserRow: (userId: number, update: (user: AdminUser) => AdminUser) => void;
};

type EnterpriseUserLoadersOptions = {
  latestEnterpriseUsersRequestRef: MutableRefObject<number>;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
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

export type EnterpriseUserLoaders = {
  loadEnterpriseUsers: (enterpriseId: string, query: string, page: number) => Promise<void>;
};

type EnterpriseUserPagingActions = {
  applyEnterpriseUserPageInput: (value: string) => void;
  handleEnterpriseUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
};

export type EnterpriseUserActions = EnterpriseUserPagingActions & {
  resetSelectedEnterprise: () => void;
  openEnterpriseAccounts: (enterprise: EnterpriseRecord) => void;
  handleEnterpriseUserRoleChange: (userId: number, role: UserRole) => Promise<void>;
  handleEnterpriseUserStatusToggle: (userId: number, nextStatus: boolean) => Promise<void>;
  clearSelectedEnterpriseIfDeleted: (enterpriseId: string) => void;
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

type EnterpriseUserEffectsOptions = {
  selectedEnterprise: EnterpriseRecord | null;
  enterpriseUserSearchQuery: string;
  enterpriseUserPage: number;
  normalizedEnterpriseUserSearch: string;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
};

function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function beginEnterpriseUsersLoad(
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>,
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>,
) {
  setEnterpriseUsersStatus("loading");
  setEnterpriseUsersMessage(null);
}

function applyEnterpriseUsersLoadResponse(options: {
  response: EnterpriseUsersSearchResponse;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
}) {
  const {
    response,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUserPage,
  } = options;

  if (response.totalPages > 0 && response.page > response.totalPages) {
    setEnterpriseUserPage(response.totalPages);
    return;
  }

  setEnterpriseUsers(response.items.map(normalizeUser));
  setEnterpriseUserTotal(response.total);
  setEnterpriseUserTotalPages(response.totalPages);
  setEnterpriseUsersStatus("success");
  if (response.total === 0) setEnterpriseUsersMessage("No user accounts found in this enterprise.");
}

function applyEnterpriseUsersLoadError(options: {
  err: unknown;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
}) {
  const {
    err,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
  } = options;

  setEnterpriseUsers([]);
  setEnterpriseUserTotal(0);
  setEnterpriseUserTotalPages(0);
  setEnterpriseUsersStatus("error");
  setEnterpriseUsersMessage(resolveUnknownError(err, "Could not load enterprise users."));
}

async function loadEnterpriseUsersPage(options: EnterpriseUserLoadersOptions & {
  enterpriseId: string;
  query: string;
  page: number;
  requestId: number;
}) {
  beginEnterpriseUsersLoad(options.setEnterpriseUsersStatus, options.setEnterpriseUsersMessage);

  try {
    const response = await searchEnterpriseUsers(options.enterpriseId, {
      q: options.query.trim() || undefined,
      page: options.page,
      pageSize: ENTERPRISE_USERS_PER_PAGE,
    });
    if (options.latestEnterpriseUsersRequestRef.current !== options.requestId) return;
    applyEnterpriseUsersLoadResponse({
      response,
      setEnterpriseUsers: options.setEnterpriseUsers,
      setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
      setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
      setEnterpriseUserTotal: options.setEnterpriseUserTotal,
      setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
      setEnterpriseUserPage: options.setEnterpriseUserPage,
    });
  } catch (err) {
    if (options.latestEnterpriseUsersRequestRef.current !== options.requestId) return;
    applyEnterpriseUsersLoadError({
      err,
      setEnterpriseUsers: options.setEnterpriseUsers,
      setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
      setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
      setEnterpriseUserTotal: options.setEnterpriseUserTotal,
      setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
    });
  }
}

export function useEnterpriseUserLoaders(options: EnterpriseUserLoadersOptions): EnterpriseUserLoaders {
  const {
    latestEnterpriseUsersRequestRef,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUserPage,
  } = options;

  const loadEnterpriseUsers = useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestRef.current + 1;
    latestEnterpriseUsersRequestRef.current = requestId;
    await loadEnterpriseUsersPage({
      latestEnterpriseUsersRequestRef,
      setEnterpriseUsers,
      setEnterpriseUsersMessage,
      setEnterpriseUsersStatus,
      setEnterpriseUserTotal,
      setEnterpriseUserTotalPages,
      setEnterpriseUserPage,
      enterpriseId,
      query,
      page,
      requestId,
    });
  }, [
    latestEnterpriseUsersRequestRef,
    setEnterpriseUserPage,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
  ]);

  return { loadEnterpriseUsers };
}

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
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseUserTotalPages) {
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

export function useEnterpriseUserEffects(options: EnterpriseUserEffectsOptions) {
  const {
    selectedEnterprise,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    normalizedEnterpriseUserSearch,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    loadEnterpriseUsers,
  } = options;

  useEffect(() => {
    if (!selectedEnterprise) return;
    void loadEnterpriseUsers(
      selectedEnterprise.id,
      enterpriseUserSearchQuery,
      enterpriseUserPage,
    );
  }, [
    enterpriseUserPage,
    enterpriseUserSearchQuery,
    loadEnterpriseUsers,
    selectedEnterprise,
  ]);

  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterprise?.id, setEnterpriseUserPage]);

  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage, setEnterpriseUserPageInput]);
}
