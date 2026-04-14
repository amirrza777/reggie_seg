"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { ConfirmationModal } from "@/shared/ui/modal/ConfirmationModal";
import {
  getEffectiveTotalPages,
  getPaginationEnd,
  getPaginationStart,
} from "@/shared/lib/pagination";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Card } from "@/shared/ui/Card";
import { deleteUser, searchUsers } from "../api/client";
import type { AdminUser, AdminUserRecord } from "../types";
import { buildUserManagementRows } from "./rows/userManagementRows";
import { usePageJumpHandlers, useUserActions } from "./UserManagementTable.actions";
import {
  UserManagementTableBody,
  UserManagementToolbar,
} from "./UserManagementTable.sections";

type RequestState = "idle" | "loading" | "success" | "error";
type UserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";

type UserSearchResponse = Awaited<ReturnType<typeof searchUsers>>;

type UserManagementState = ReturnType<typeof useUserManagementState>;

type UserSearchHandlers = {
  setUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setTableStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setTotalUsers: Dispatch<SetStateAction<number>>;
  setTotalPages: Dispatch<SetStateAction<number>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
};

const USERS_PER_PAGE = 10;
const DEFAULT_USER_SORT_VALUE: UserSortValue = "default";

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

function resolveUnknownError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function applyUserSearchSuccess(response: UserSearchResponse, handlers: UserSearchHandlers) {
  handlers.setUsers(response.items.map(normalizeUser));
  handlers.setTotalUsers(response.total);
  handlers.setTotalPages(response.totalPages);
  handlers.setTableStatus("success");
}

function applyUserSearchError(
  err: unknown,
  handlers: Pick<UserSearchHandlers, "setUsers" | "setTotalUsers" | "setTotalPages" | "setTableStatus" | "setMessage">,
) {
  handlers.setUsers([]);
  handlers.setTotalUsers(0);
  handlers.setTotalPages(0);
  handlers.setTableStatus("error");
  handlers.setMessage(resolveUnknownError(err, "Could not load users."));
}

function resolveUserSortParams(sortValue: UserSortValue) {
  if (sortValue === "joinDateDesc") {
    return { sortBy: "joinDate" as const, sortDirection: "desc" as const };
  }
  if (sortValue === "joinDateAsc") {
    return { sortBy: "joinDate" as const, sortDirection: "asc" as const };
  }
  if (sortValue === "nameAsc") {
    return { sortBy: "name" as const, sortDirection: "asc" as const };
  }
  if (sortValue === "nameDesc") {
    return { sortBy: "name" as const, sortDirection: "desc" as const };
  }
  return {};
}

function buildUserSearchParams(query: string, page: number, sortValue: UserSortValue) {
  return {
    q: query.trim() || undefined,
    page,
    pageSize: USERS_PER_PAGE,
    ...resolveUserSortParams(sortValue),
  };
}

function shouldIgnoreStaleUserRequest(
  latestRequestIdRef: MutableRefObject<number>,
  requestId: number,
) {
  return latestRequestIdRef.current !== requestId;
}

function resolveOverflowPage(response: UserSearchResponse) {
  if (response.totalPages > 0 && response.page > response.totalPages) {
    return response.totalPages;
  }
  return null;
}

async function runUserLoadRequest(options: {
  latestRequestIdRef: MutableRefObject<number>;
  requestId: number;
  query: string;
  page: number;
  sortValue: UserSortValue;
  handlers: UserSearchHandlers;
}) {
  options.handlers.setTableStatus("loading");
  try {
    const response = await searchUsers(
      buildUserSearchParams(options.query, options.page, options.sortValue),
    );
    if (shouldIgnoreStaleUserRequest(options.latestRequestIdRef, options.requestId)) {
      return;
    }
    const overflowPage = resolveOverflowPage(response);
    if (overflowPage !== null) {
      options.handlers.setCurrentPage(overflowPage);
      return;
    }
    applyUserSearchSuccess(response, options.handlers);
  } catch (err) {
    if (shouldIgnoreStaleUserRequest(options.latestRequestIdRef, options.requestId)) {
      return;
    }
    applyUserSearchError(err, options.handlers);
  }
}

function useUserManagementState() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [tableStatus, setTableStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<UserSortValue>(DEFAULT_USER_SORT_VALUE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestRequestIdRef = useRef(0);
  return {
    users,
    status,
    tableStatus,
    message,
    searchQuery,
    sortValue,
    currentPage,
    pageInput,
    totalUsers,
    totalPages,
    latestRequestIdRef,
    setUsers,
    setStatus,
    setTableStatus,
    setMessage,
    setSearchQuery,
    setSortValue,
    setCurrentPage,
    setPageInput,
    setTotalUsers,
    setTotalPages,
  };
}

function useLoadUsers(state: UserManagementState) {
  const latestRequestIdRef = state.latestRequestIdRef;
  const setUsers = state.setUsers;
  const setTableStatus = state.setTableStatus;
  const setMessage = state.setMessage;
  const setTotalUsers = state.setTotalUsers;
  const setTotalPages = state.setTotalPages;
  const setCurrentPage = state.setCurrentPage;

  return useCallback(async (query: string, page: number, sortValue: UserSortValue) => {
    const handlers = {
      setUsers,
      setTableStatus,
      setMessage,
      setTotalUsers,
      setTotalPages,
      setCurrentPage,
    };
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    await runUserLoadRequest({ latestRequestIdRef, requestId, query, page, sortValue, handlers });
  }, [
    latestRequestIdRef,
    setCurrentPage,
    setMessage,
    setTableStatus,
    setTotalPages,
    setTotalUsers,
    setUsers,
  ]);
}

function useCurrentPageSync(
  normalizedSearch: string,
  setCurrentPage: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, setCurrentPage]);
}

function useSortPageSync(
  sortValue: UserSortValue,
  setCurrentPage: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    setCurrentPage(1);
  }, [sortValue, setCurrentPage]);
}

function usePageInputSync(
  currentPage: number,
  setPageInput: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage, setPageInput]);
}

export function UserManagementTable() {
  const state = useUserManagementState();
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<number | null>(null);
  const normalizedSearch = normalizeSearchQuery(state.searchQuery);
  const effectiveTotalPages = getEffectiveTotalPages(state.totalPages);
  const pageStart = getPaginationStart(state.totalUsers, state.currentPage, USERS_PER_PAGE);
  const pageEnd = getPaginationEnd(
    state.totalUsers,
    state.currentPage,
    USERS_PER_PAGE,
    state.users.length,
  );
  const loadUsers = useLoadUsers(state);

  useCurrentPageSync(normalizedSearch, state.setCurrentPage);
  useSortPageSync(state.sortValue, state.setCurrentPage);
  usePageInputSync(state.currentPage, state.setPageInput);

  useEffect(() => {
    void loadUsers(state.searchQuery, state.currentPage, state.sortValue);
  }, [loadUsers, state.currentPage, state.searchQuery, state.sortValue]);

  const pageJumpHandlers = usePageJumpHandlers(state);
  const actions = useUserActions({
    users: state.users,
    searchQuery: state.searchQuery,
    currentPage: state.currentPage,
    sortValue: state.sortValue,
    setUsers: state.setUsers,
    setStatus: state.setStatus,
    setMessage: state.setMessage,
    loadUsers,
  });

  const confirmRemoveUser = useCallback(async () => {
    if (pendingRemoveUserId === null) return;
    const userId = pendingRemoveUserId;
    setPendingRemoveUserId(null);
    state.setStatus("loading");
    state.setMessage(null);
    try {
      await deleteUser(userId);
      state.setStatus("success");
      state.setMessage("Account deleted.");
      void loadUsers(state.searchQuery, state.currentPage, state.sortValue);
    } catch (err) {
      state.setStatus("error");
      state.setMessage(
        err instanceof Error ? err.message : "Could not delete account.",
      );
    }
  }, [pendingRemoveUserId, state, loadUsers]);

  const pendingRemoveUser =
    pendingRemoveUserId !== null
      ? state.users.find((u) => u.id === pendingRemoveUserId) ?? null
      : null;

  const rows = buildUserManagementRows({
    users: state.users,
    busy: state.status === "loading",
    onRoleChange: (userId, role) => {
      void actions.handleRoleChange(userId, role);
    },
    onStatusToggle: (userId, nextStatus) => {
      void actions.handleStatusToggle(userId, nextStatus);
    },
    onRequestRemoveUser: setPendingRemoveUserId,
  });

  const shouldShowLoadingSkeleton = state.tableStatus === "loading" && rows.length === 0;

  return (
    <>
      <Card title="User accounts" className="user-management-card">
        <UserManagementToolbar
          searchQuery={state.searchQuery}
          sortValue={state.sortValue}
          tableStatus={state.tableStatus}
          totalUsers={state.totalUsers}
          pageStart={pageStart}
          pageEnd={pageEnd}
          onSearchChange={state.setSearchQuery}
          onSortChange={state.setSortValue}
        />
        <UserManagementTableBody
          message={state.message}
          status={state.status}
          tableStatus={state.tableStatus}
          rows={rows}
          shouldShowLoadingSkeleton={shouldShowLoadingSkeleton}
          totalPages={state.totalPages}
          currentPage={state.currentPage}
          effectiveTotalPages={effectiveTotalPages}
          pageInput={state.pageInput}
          setCurrentPage={state.setCurrentPage}
          setPageInput={state.setPageInput}
          applyPageInput={pageJumpHandlers.applyPageInput}
          handlePageJump={pageJumpHandlers.handlePageJump}
          normalizedSearch={normalizedSearch}
          searchQuery={state.searchQuery}
        />
      </Card>
      <ConfirmationModal
        open={pendingRemoveUser !== null}
        title="Delete user account"
        message={
          pendingRemoveUser
            ? `Delete "${pendingRemoveUser.email}"? Their account will be permanently suspended and all access revoked.`
            : "Delete this user account?"
        }
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setPendingRemoveUserId(null)}
        onConfirm={confirmRemoveUser}
      />
    </>
  );
}
