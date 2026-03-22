import { normalizeSearchQuery } from "@/shared/lib/search";
import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { searchEnterpriseUsers, updateEnterpriseUser } from "../api/client";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";

const ENTERPRISE_USERS_PER_PAGE = 10;

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

type UseEnterpriseUserManagementStateArgs = {
  showSuccessToast: (message: string) => void;
};

type EnterpriseUsersSearchResponse = Awaited<ReturnType<typeof searchEnterpriseUsers>>;

type EnterpriseUserState = ReturnType<typeof useEnterpriseUserState>;

type EnterpriseUserRowUpdater = {
  setEnterpriseUserRow: (userId: number, update: (user: AdminUser) => AdminUser) => void;
};

type EnterpriseUserSetters = {
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUserActionState: Dispatch<SetStateAction<Record<number, RequestState>>>;
  setEnterpriseUserSearchQuery: Dispatch<SetStateAction<string>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setSelectedEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
};

type EnterpriseUserLoaders = {
  loadEnterpriseUsers: (enterpriseId: string, query: string, page: number) => Promise<void>;
};

type EnterpriseUserActions = {
  resetSelectedEnterprise: () => void;
  openEnterpriseAccounts: (enterprise: EnterpriseRecord) => void;
  handleEnterpriseUserRoleChange: (userId: number, role: UserRole) => Promise<void>;
  handleEnterpriseUserStatusToggle: (userId: number, nextStatus: boolean) => Promise<void>;
  applyEnterpriseUserPageInput: (value: string) => void;
  handleEnterpriseUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
  clearSelectedEnterpriseIfDeleted: (enterpriseId: string) => void;
};

export function useEnterpriseUserManagementState({ showSuccessToast }: UseEnterpriseUserManagementStateArgs) {
  const state = useEnterpriseUserState();
  const setEnterpriseUserRow = useEnterpriseUserRowUpdater(state.setEnterpriseUsers);
  const loaders = useEnterpriseUserLoaders(state);
  const userActions = useEnterpriseUserActions({
    state,
    loaders,
    setEnterpriseUserRow,
    showSuccessToast,
  });
  useEnterpriseUserEffects(state, loaders.loadEnterpriseUsers);
  return buildEnterpriseUserManagementResult({
    state,
    userActions,
  });
}

function useEnterpriseUserState() {
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseRecord | null>(null);
  const [enterpriseUsers, setEnterpriseUsers] = useState<AdminUser[]>([]);
  const [enterpriseUsersStatus, setEnterpriseUsersStatus] = useState<RequestState>("idle");
  const [enterpriseUsersMessage, setEnterpriseUsersMessage] = useState<string | null>(null);
  const [enterpriseUserActionState, setEnterpriseUserActionState] = useState<Record<number, RequestState>>({});
  const [enterpriseUserSearchQuery, setEnterpriseUserSearchQuery] = useState("");
  const [enterpriseUserPage, setEnterpriseUserPage] = useState(1);
  const [enterpriseUserPageInput, setEnterpriseUserPageInput] = useState("1");
  const [enterpriseUserTotal, setEnterpriseUserTotal] = useState(0);
  const [enterpriseUserTotalPages, setEnterpriseUserTotalPages] = useState(0);
  const latestEnterpriseUsersRequestRef = useRef(0);

  return {
    selectedEnterprise,
    setSelectedEnterprise,
    enterpriseUsers,
    setEnterpriseUsers,
    enterpriseUsersStatus,
    setEnterpriseUsersStatus,
    enterpriseUsersMessage,
    setEnterpriseUsersMessage,
    enterpriseUserActionState,
    setEnterpriseUserActionState,
    enterpriseUserSearchQuery,
    setEnterpriseUserSearchQuery,
    enterpriseUserPage,
    setEnterpriseUserPage,
    enterpriseUserPageInput,
    setEnterpriseUserPageInput,
    enterpriseUserTotal,
    setEnterpriseUserTotal,
    enterpriseUserTotalPages,
    setEnterpriseUserTotalPages,
    normalizedEnterpriseUserSearch: normalizeSearchQuery(enterpriseUserSearchQuery),
    effectiveEnterpriseUserTotalPages: Math.max(1, enterpriseUserTotalPages),
    enterpriseUserStart: enterpriseUserTotal === 0 ? 0 : (enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + 1,
    enterpriseUserEnd:
      enterpriseUserTotal === 0
        ? 0
        : Math.min((enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + enterpriseUsers.length, enterpriseUserTotal),
    latestEnterpriseUsersRequestRef,
  };
}

function useEnterpriseUserRowUpdater(setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>) {
  return useCallback((userId: number, update: (user: AdminUser) => AdminUser) => {
    setEnterpriseUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  }, [setEnterpriseUsers]);
}

function beginEnterpriseUsersLoad(
  setEnterpriseUsersStatus: EnterpriseUserSetters["setEnterpriseUsersStatus"],
  setEnterpriseUsersMessage: EnterpriseUserSetters["setEnterpriseUsersMessage"]
) {
  setEnterpriseUsersStatus("loading");
  setEnterpriseUsersMessage(null);
}

function applyEnterpriseUsersLoadResponse(options: {
  response: EnterpriseUsersSearchResponse;
  setEnterpriseUsers: EnterpriseUserSetters["setEnterpriseUsers"];
  setEnterpriseUsersMessage: EnterpriseUserSetters["setEnterpriseUsersMessage"];
  setEnterpriseUsersStatus: EnterpriseUserSetters["setEnterpriseUsersStatus"];
  setEnterpriseUserTotal: EnterpriseUserSetters["setEnterpriseUserTotal"];
  setEnterpriseUserTotalPages: EnterpriseUserSetters["setEnterpriseUserTotalPages"];
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
}): boolean {
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
    return false;
  }

  setEnterpriseUsers(response.items.map(normalizeUser));
  setEnterpriseUserTotal(response.total);
  setEnterpriseUserTotalPages(response.totalPages);
  setEnterpriseUsersStatus("success");
  if (response.total === 0) setEnterpriseUsersMessage("No user accounts found in this enterprise.");
  return true;
}

function applyEnterpriseUsersLoadError(
  err: unknown,
  setEnterpriseUsers: EnterpriseUserSetters["setEnterpriseUsers"],
  setEnterpriseUsersMessage: EnterpriseUserSetters["setEnterpriseUsersMessage"],
  setEnterpriseUsersStatus: EnterpriseUserSetters["setEnterpriseUsersStatus"],
  setEnterpriseUserTotal: EnterpriseUserSetters["setEnterpriseUserTotal"],
  setEnterpriseUserTotalPages: EnterpriseUserSetters["setEnterpriseUserTotalPages"]
) {
  setEnterpriseUsers([]);
  setEnterpriseUserTotal(0);
  setEnterpriseUserTotalPages(0);
  setEnterpriseUsersStatus("error");
  setEnterpriseUsersMessage(resolveUnknownError(err, "Could not load enterprise users."));
}

async function loadEnterpriseUsersPage(options: {
  enterpriseId: string;
  query: string;
  page: number;
  latestEnterpriseUsersRequestRef: EnterpriseUserState["latestEnterpriseUsersRequestRef"];
  requestId: number;
  setEnterpriseUsers: EnterpriseUserSetters["setEnterpriseUsers"];
  setEnterpriseUsersMessage: EnterpriseUserSetters["setEnterpriseUsersMessage"];
  setEnterpriseUsersStatus: EnterpriseUserSetters["setEnterpriseUsersStatus"];
  setEnterpriseUserTotal: EnterpriseUserSetters["setEnterpriseUserTotal"];
  setEnterpriseUserTotalPages: EnterpriseUserSetters["setEnterpriseUserTotalPages"];
  setEnterpriseUserPage: EnterpriseUserSetters["setEnterpriseUserPage"];
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
    applyEnterpriseUsersLoadError(
      err,
      options.setEnterpriseUsers,
      options.setEnterpriseUsersMessage,
      options.setEnterpriseUsersStatus,
      options.setEnterpriseUserTotal,
      options.setEnterpriseUserTotalPages
    );
  }
}

function useLoadEnterpriseUsersCallback(options: {
  latestEnterpriseUsersRequestRef: EnterpriseUserState["latestEnterpriseUsersRequestRef"];
  setEnterpriseUsers: EnterpriseUserSetters["setEnterpriseUsers"];
  setEnterpriseUsersMessage: EnterpriseUserSetters["setEnterpriseUsersMessage"];
  setEnterpriseUsersStatus: EnterpriseUserSetters["setEnterpriseUsersStatus"];
  setEnterpriseUserTotal: EnterpriseUserSetters["setEnterpriseUserTotal"];
  setEnterpriseUserTotalPages: EnterpriseUserSetters["setEnterpriseUserTotalPages"];
  setEnterpriseUserPage: EnterpriseUserSetters["setEnterpriseUserPage"];
}) {
  const {
    latestEnterpriseUsersRequestRef,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUserPage,
  } = options;

  return useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestRef.current + 1;
    latestEnterpriseUsersRequestRef.current = requestId;
    await loadEnterpriseUsersPage({
      enterpriseId,
      query,
      page,
      latestEnterpriseUsersRequestRef,
      requestId,
      setEnterpriseUsers,
      setEnterpriseUsersMessage,
      setEnterpriseUsersStatus,
      setEnterpriseUserTotal,
      setEnterpriseUserTotalPages,
      setEnterpriseUserPage,
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
}

function useEnterpriseUserLoaders(state: EnterpriseUserState): EnterpriseUserLoaders {
  const loadEnterpriseUsers = useLoadEnterpriseUsersCallback({
    latestEnterpriseUsersRequestRef: state.latestEnterpriseUsersRequestRef,
    setEnterpriseUsers: state.setEnterpriseUsers,
    setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
    setEnterpriseUsersStatus: state.setEnterpriseUsersStatus,
    setEnterpriseUserTotal: state.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: state.setEnterpriseUserTotalPages,
    setEnterpriseUserPage: state.setEnterpriseUserPage,
  });
  return { loadEnterpriseUsers };
}

function useEnterpriseUserActions(options: {
  state: EnterpriseUserState;
  loaders: EnterpriseUserLoaders;
  setEnterpriseUserRow: EnterpriseUserRowUpdater["setEnterpriseUserRow"];
  showSuccessToast: (message: string) => void;
}): EnterpriseUserActions {
  const setters = toEnterpriseUserSetters(options.state);
  const resetSelectedEnterprise = useResetSelectedEnterprise(setters);
  const openEnterpriseAccounts = useOpenEnterpriseAccounts(setters, options.state.setSelectedEnterprise);
  const handleEnterpriseUserRoleChange = useEnterpriseUserRoleChangeHandler(
    options.state,
    options.loaders.loadEnterpriseUsers,
    options.setEnterpriseUserRow,
    options.showSuccessToast,
  );
  const handleEnterpriseUserStatusToggle = useEnterpriseUserStatusToggleHandler(
    options.state,
    options.loaders.loadEnterpriseUsers,
    options.setEnterpriseUserRow,
    options.showSuccessToast,
  );
  const pagingActions = useEnterpriseUserPagingActions(options.state);
  const clearSelectedEnterpriseIfDeleted = useClearSelectedEnterpriseIfDeleted(options.state.selectedEnterprise, resetSelectedEnterprise);

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

function toEnterpriseUserSetters(state: EnterpriseUserState): EnterpriseUserSetters {
  return {
    setEnterpriseUsers: state.setEnterpriseUsers,
    setEnterpriseUsersStatus: state.setEnterpriseUsersStatus,
    setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
    setEnterpriseUserActionState: state.setEnterpriseUserActionState,
    setEnterpriseUserSearchQuery: state.setEnterpriseUserSearchQuery,
    setEnterpriseUserPage: state.setEnterpriseUserPage,
    setEnterpriseUserPageInput: state.setEnterpriseUserPageInput,
    setEnterpriseUserTotal: state.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: state.setEnterpriseUserTotalPages,
    setSelectedEnterprise: state.setSelectedEnterprise,
  };
}

function useResetSelectedEnterprise(setters: EnterpriseUserSetters) {
  const {
    setEnterpriseUsers,
    setEnterpriseUsersStatus,
    setEnterpriseUsersMessage,
    setEnterpriseUserActionState,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setSelectedEnterprise,
  } = setters;

  return useCallback(() => {
    setEnterpriseUsers([]);
    setEnterpriseUsersStatus("idle");
    setEnterpriseUserTotal(0);
    setEnterpriseUserTotalPages(0);
    setEnterpriseUsersMessage(null);
    setEnterpriseUserSearchQuery("");
    setEnterpriseUserPage(1);
    setEnterpriseUserPageInput("1");
    setEnterpriseUserActionState({});
    setSelectedEnterprise(null);
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
    setSelectedEnterprise,
  ]);
}

function useOpenEnterpriseAccounts(
  setters: EnterpriseUserSetters,
  setSelectedEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>
) {
  const {
    setEnterpriseUsers,
    setEnterpriseUsersStatus,
    setEnterpriseUsersMessage,
    setEnterpriseUserActionState,
    setEnterpriseUserSearchQuery,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
  } = setters;

  return useCallback((enterprise: EnterpriseRecord) => {
    setEnterpriseUsers([]);
    setEnterpriseUsersStatus("idle");
    setEnterpriseUserTotal(0);
    setEnterpriseUserTotalPages(0);
    setEnterpriseUsersMessage(null);
    setEnterpriseUserSearchQuery("");
    setEnterpriseUserPage(1);
    setEnterpriseUserPageInput("1");
    setEnterpriseUserActionState({});
    setSelectedEnterprise(enterprise);
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
    setSelectedEnterprise,
  ]);
}

function useEnterpriseUserRoleChangeHandler(
  state: EnterpriseUserState,
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"],
  setEnterpriseUserRow: EnterpriseUserRowUpdater["setEnterpriseUserRow"],
  showSuccessToast: (message: string) => void,
) {
  return useCallback(async (userId: number, role: UserRole) => {
    if (!state.selectedEnterprise) return;
    await runEnterpriseUserUpdate({
      selectedEnterprise: state.selectedEnterprise,
      userId,
      enterpriseUsers: state.enterpriseUsers,
      enterpriseUserSearchQuery: state.enterpriseUserSearchQuery,
      enterpriseUserPage: state.enterpriseUserPage,
      setEnterpriseUsers: state.setEnterpriseUsers,
      setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
      setEnterpriseUserActionState: state.setEnterpriseUserActionState,
      setEnterpriseUserRow,
      loadEnterpriseUsers,
      showSuccessToast,
      payload: { role },
      optimisticUpdate: (user) => ({ ...user, role, isStaff: role !== "STUDENT" }),
      successMessage: `Updated role to ${role.toLowerCase()}.`,
      errorMessage: "Could not update role.",
    });
  }, [
    loadEnterpriseUsers,
    setEnterpriseUserRow,
    showSuccessToast,
    state.enterpriseUserPage,
    state.enterpriseUserSearchQuery,
    state.enterpriseUsers,
    state.selectedEnterprise,
    state.setEnterpriseUserActionState,
    state.setEnterpriseUsers,
    state.setEnterpriseUsersMessage,
  ]);
}

function useEnterpriseUserStatusToggleHandler(
  state: EnterpriseUserState,
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"],
  setEnterpriseUserRow: EnterpriseUserRowUpdater["setEnterpriseUserRow"],
  showSuccessToast: (message: string) => void,
) {
  return useCallback(async (userId: number, nextStatus: boolean) => {
    if (!state.selectedEnterprise) return;
    await runEnterpriseUserUpdate({
      selectedEnterprise: state.selectedEnterprise,
      userId,
      enterpriseUsers: state.enterpriseUsers,
      enterpriseUserSearchQuery: state.enterpriseUserSearchQuery,
      enterpriseUserPage: state.enterpriseUserPage,
      setEnterpriseUsers: state.setEnterpriseUsers,
      setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
      setEnterpriseUserActionState: state.setEnterpriseUserActionState,
      setEnterpriseUserRow,
      loadEnterpriseUsers,
      showSuccessToast,
      payload: { active: nextStatus },
      optimisticUpdate: (user) => ({ ...user, active: nextStatus }),
      successMessage: nextStatus ? "Account activated." : "Account suspended.",
      errorMessage: "Could not update account status.",
    });
  }, [
    loadEnterpriseUsers,
    setEnterpriseUserRow,
    showSuccessToast,
    state.enterpriseUserPage,
    state.enterpriseUserSearchQuery,
    state.enterpriseUsers,
    state.selectedEnterprise,
    state.setEnterpriseUserActionState,
    state.setEnterpriseUsers,
    state.setEnterpriseUsersMessage,
  ]);
}

async function runEnterpriseUserUpdate(options: {
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
}) {
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
      options.enterpriseUserPage
    );
  } catch (err) {
    options.setEnterpriseUsers(previousUsers);
    options.setEnterpriseUsersMessage(resolveUnknownError(err, options.errorMessage));
  } finally {
    options.setEnterpriseUserActionState((prev) => ({ ...prev, [options.userId]: "idle" }));
  }
}

function useEnterpriseUserPagingActions(state: EnterpriseUserState) {
  const enterpriseUserPage = state.enterpriseUserPage;
  const enterpriseUserPageInput = state.enterpriseUserPageInput;
  const effectiveEnterpriseUserTotalPages = state.effectiveEnterpriseUserTotalPages;
  const setEnterpriseUserPage = state.setEnterpriseUserPage;
  const setEnterpriseUserPageInput = state.setEnterpriseUserPageInput;

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

function useClearSelectedEnterpriseIfDeleted(
  selectedEnterprise: EnterpriseRecord | null,
  resetSelectedEnterprise: () => void
) {
  return useCallback((enterpriseId: string) => {
    if (selectedEnterprise?.id !== enterpriseId) return;
    resetSelectedEnterprise();
  }, [resetSelectedEnterprise, selectedEnterprise?.id]);
}

function useEnterpriseUserEffects(
  state: EnterpriseUserState,
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"]
) {
  const selectedEnterprise = state.selectedEnterprise;
  const enterpriseUserSearchQuery = state.enterpriseUserSearchQuery;
  const enterpriseUserPage = state.enterpriseUserPage;
  const normalizedEnterpriseUserSearch = state.normalizedEnterpriseUserSearch;
  const setEnterpriseUserPage = state.setEnterpriseUserPage;
  const setEnterpriseUserPageInput = state.setEnterpriseUserPageInput;

  useEffect(() => {
    if (!selectedEnterprise) return;
    void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
  }, [enterpriseUserPage, enterpriseUserSearchQuery, selectedEnterprise, loadEnterpriseUsers]);

  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterprise?.id, setEnterpriseUserPage]);

  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage, setEnterpriseUserPageInput]);
}

function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function buildEnterpriseUserManagementResult(options: {
  state: EnterpriseUserState;
  userActions: EnterpriseUserActions;
}) {
  const stateFields = {
    selectedEnterprise: options.state.selectedEnterprise,
    setSelectedEnterprise: options.state.setSelectedEnterprise,
    enterpriseUsers: options.state.enterpriseUsers,
    enterpriseUsersStatus: options.state.enterpriseUsersStatus,
    enterpriseUsersMessage: options.state.enterpriseUsersMessage,
    enterpriseUserActionState: options.state.enterpriseUserActionState,
    enterpriseUserSearchQuery: options.state.enterpriseUserSearchQuery,
    setEnterpriseUserSearchQuery: options.state.setEnterpriseUserSearchQuery,
  };
  const pagingFields = {
    enterpriseUserPage: options.state.enterpriseUserPage,
    setEnterpriseUserPage: options.state.setEnterpriseUserPage,
    enterpriseUserPageInput: options.state.enterpriseUserPageInput,
    setEnterpriseUserPageInput: options.state.setEnterpriseUserPageInput,
    enterpriseUserTotal: options.state.enterpriseUserTotal,
    enterpriseUserTotalPages: options.state.enterpriseUserTotalPages,
    effectiveEnterpriseUserTotalPages: options.state.effectiveEnterpriseUserTotalPages,
    enterpriseUserStart: options.state.enterpriseUserStart,
    enterpriseUserEnd: options.state.enterpriseUserEnd,
  };

  return {
    ...stateFields,
    ...pagingFields,
    ...options.userActions,
  };
}
