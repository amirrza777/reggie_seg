"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from "react";
import { getEffectiveTotalPages, getPaginationEnd, getPaginationStart, parsePageInput } from "@/shared/lib/pagination";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Card } from "@/shared/ui/Card";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";
import { searchUsers, updateUser, updateUserRole } from "../api/client";
import type { AdminUser, AdminUserRecord, UserRole } from "../types";
import { buildUserManagementRows } from "./userManagementRows";

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

type UserMutationHandlers = {
  users: AdminUser[];
  searchQuery: string;
  currentPage: number;
  sortValue: UserSortValue;
  setUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  loadUsers: (query: string, page: number, sortValue: UserSortValue) => Promise<void>;
};

type UserOptimisticUpdateOptions = UserMutationHandlers & {
  userId: number;
  request: () => Promise<AdminUserRecord>;
  optimisticUpdate: (user: AdminUser) => AdminUser;
  successMessage: (previousUsers: AdminUser[]) => string;
  errorMessage: string;
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

function cloneUsers(users: AdminUser[]) {
  return users.map((user) => ({ ...user }));
}

function applyUserSearchSuccess(response: UserSearchResponse, handlers: UserSearchHandlers) {
  handlers.setUsers(response.items.map(normalizeUser));
  handlers.setTotalUsers(response.total);
  handlers.setTotalPages(response.totalPages);
  handlers.setTableStatus("success");
}

function applyUserSearchError(err: unknown, handlers: Pick<UserSearchHandlers, "setUsers" | "setTotalUsers" | "setTotalPages" | "setTableStatus" | "setMessage">) {
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

function shouldIgnoreStaleUserRequest(latestRequestIdRef: MutableRefObject<number>, requestId: number) {
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
    const handlers = { setUsers, setTableStatus, setMessage, setTotalUsers, setTotalPages, setCurrentPage };
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    await runUserLoadRequest({ latestRequestIdRef, requestId, query, page, sortValue, handlers });
  }, [latestRequestIdRef, setCurrentPage, setMessage, setTableStatus, setTotalPages, setTotalUsers, setUsers]);
}

function useCurrentPageSync(normalizedSearch: string, setCurrentPage: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, setCurrentPage]);
}

function useSortPageSync(sortValue: UserSortValue, setCurrentPage: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    setCurrentPage(1);
  }, [sortValue, setCurrentPage]);
}

function usePageInputSync(currentPage: number, setPageInput: Dispatch<SetStateAction<string>>) {
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage, setPageInput]);
}

function setUserRow(setUsers: Dispatch<SetStateAction<AdminUser[]>>, userId: number, update: (user: AdminUser) => AdminUser) {
  setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? update(user) : user)));
}

async function runOptimisticUserUpdate(options: UserOptimisticUpdateOptions) {
  const previousUsers = cloneUsers(options.users);
  options.setStatus("loading");
  options.setMessage(null);
  setUserRow(options.setUsers, options.userId, options.optimisticUpdate);
  try {
    const updated = await options.request();
    setUserRow(options.setUsers, options.userId, () => normalizeUser(updated));
    options.setStatus("success");
    options.setMessage(options.successMessage(previousUsers));
    void options.loadUsers(options.searchQuery, options.currentPage, options.sortValue);
  } catch (err) {
    options.setUsers(previousUsers);
    options.setStatus("error");
    options.setMessage(resolveUnknownError(err, options.errorMessage));
  }
}

function resolveRoleUpdateSuccessMessage(previousUsers: AdminUser[], userId: number, role: UserRole) {
  const email = previousUsers.find((user) => user.id === userId)?.email ?? "user";
  return `Updated role to ${role.toLowerCase()} for ${email}.`;
}

function useRoleChangeHandler(options: UserMutationHandlers) {
  return useCallback(async (userId: number, role: UserRole) => {
    await runOptimisticUserUpdate({
      ...options,
      userId,
      request: () => updateUserRole(userId, role),
      optimisticUpdate: (user) => ({ ...user, role, isStaff: role !== "STUDENT" }),
      successMessage: (previousUsers) => resolveRoleUpdateSuccessMessage(previousUsers, userId, role),
      errorMessage: "Could not update role.",
    });
  }, [options]);
}

function useStatusToggleHandler(options: UserMutationHandlers) {
  return useCallback(async (userId: number, nextStatus: boolean) => {
    await runOptimisticUserUpdate({
      ...options,
      userId,
      request: () => updateUser(userId, { active: nextStatus }),
      optimisticUpdate: (user) => ({ ...user, active: nextStatus }),
      successMessage: () => (nextStatus ? "Account activated." : "Account suspended."),
      errorMessage: "Could not update account status.",
    });
  }, [options]);
}

function useUserActions(options: UserMutationHandlers) {
  const handleRoleChange = useRoleChangeHandler(options);
  const handleStatusToggle = useStatusToggleHandler(options);
  return { handleRoleChange, handleStatusToggle };
}

function applyPageInputValue(options: {
  value: string;
  currentPage: number;
  totalPages: number;
  setPageInput: (value: string) => void;
  setCurrentPage: (value: number) => void;
}) {
  const parsedPage = parsePageInput(options.value, options.totalPages);
  if (parsedPage === null) {
    options.setPageInput(String(options.currentPage));
    return;
  }
  options.setCurrentPage(parsedPage);
}

function usePageJumpHandlers(state: UserManagementState) {
  const applyPageInput = useCallback((value: string) => {
    applyPageInputValue({ value, currentPage: state.currentPage, totalPages: state.totalPages, setPageInput: state.setPageInput, setCurrentPage: state.setCurrentPage });
  }, [state.currentPage, state.setCurrentPage, state.setPageInput, state.totalPages]);
  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(state.pageInput);
  }, [applyPageInput, state.pageInput]);
  return { applyPageInput, handlePageJump };
}

function UserManagementToolbar(props: {
  searchQuery: string;
  sortValue: UserSortValue;
  tableStatus: RequestState;
  totalUsers: number;
  pageStart: number;
  pageEnd: number;
  onSearchChange: (value: string) => void;
  onSortChange: (value: UserSortValue) => void;
}) {
  return (
    <div className="user-management__toolbar">
      <SearchField value={props.searchQuery} onChange={(event) => props.onSearchChange(event.target.value)} className="user-management__search" placeholder="Search by name, email, role, status, or ID" aria-label="Search user accounts" />
      <div className="ui-toolbar user-management__meta">
        <label className="user-management__sort-inline" htmlFor="user-management-sort">
          <span className="ui-note ui-note--muted">Sort</span>
          <select
            id="user-management-sort"
            className="user-management__sort"
            value={props.sortValue}
            onChange={(event) => props.onSortChange(event.target.value as UserSortValue)}
            aria-label="Sort user accounts"
          >
            <option value="default">Default order</option>
            <option value="joinDateDesc">Join date (newest first)</option>
            <option value="joinDateAsc">Join date (oldest first)</option>
            <option value="nameAsc">Name (A-Z)</option>
            <option value="nameDesc">Name (Z-A)</option>
          </select>
        </label>
        <span className="ui-note ui-note--muted user-management__toolbar-summary">
          <UserManagementCountLabel tableStatus={props.tableStatus} totalUsers={props.totalUsers} pageStart={props.pageStart} pageEnd={props.pageEnd} />
        </span>
      </div>
    </div>
  );
}

function UserManagementMessage({ message, status, tableStatus }: { message: string | null; status: RequestState; tableStatus: RequestState }) {
  if (!message) {
    return null;
  }
  const variantClass = status === "error" || tableStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
  return (
    <div className={`${variantClass} status-alert--spaced`}>
      <span>{message}</span>
    </div>
  );
}

function UserManagementCountLabel({ tableStatus, totalUsers, pageStart, pageEnd }: { tableStatus: RequestState; totalUsers: number; pageStart: number; pageEnd: number }) {
  if (tableStatus === "loading" && totalUsers === 0) {
    return "Loading accounts...";
  }
  if (totalUsers === 0) {
    return "Showing 0 accounts.";
  }
  return `Showing ${pageStart}-${pageEnd} of ${totalUsers} account${totalUsers === 1 ? "" : "s"}.`;
}

function UserManagementPagination(props: {
  currentPage: number;
  totalPages: number;
  effectiveTotalPages: number;
  pageInput: string;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
  applyPageInput: (value: string) => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (props.totalPages <= 1) {
    return null;
  }
  return (
    <PaginationControls ariaLabel="User accounts pagination" page={props.currentPage} totalPages={props.totalPages} onPreviousPage={() => props.setCurrentPage((previousPage) => Math.max(1, previousPage - 1))} onNextPage={() => props.setCurrentPage((previousPage) => Math.min(props.effectiveTotalPages, previousPage + 1))}>
      <PaginationPageJump pageInputId="user-management-page-input" pageInput={props.pageInput} totalPages={props.totalPages} pageJumpAriaLabel="Go to page number" onPageInputChange={props.setPageInput} onPageInputBlur={() => props.applyPageInput(props.pageInput)} onPageJump={props.handlePageJump} />
    </PaginationControls>
  );
}

function UserManagementEmptyState({ normalizedSearch, searchQuery }: { normalizedSearch: string; searchQuery: string }) {
  return (
    <div className="ui-empty-state">
      <p>{normalizedSearch ? `No user accounts match "${searchQuery.trim()}".` : "No user accounts found."}</p>
    </div>
  );
}

function UserManagementTableContent(props: {
  rows: ReturnType<typeof buildUserManagementRows>;
  shouldShowLoadingSkeleton: boolean;
  totalPages: number;
  currentPage: number;
  effectiveTotalPages: number;
  pageInput: string;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
  applyPageInput: (value: string) => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  normalizedSearch: string;
  searchQuery: string;
}) {
  if (props.rows.length === 0 && !props.shouldShowLoadingSkeleton) {
    return <UserManagementEmptyState normalizedSearch={props.normalizedSearch} searchQuery={props.searchQuery} />;
  }
  return (
    <>
      <Table headers={["Email", "Name", "Role", "Account status"]} rows={props.rows} className="user-management__table" headClassName="user-management__head" rowClassName="user-management__row" columnTemplate="var(--user-management-columns)" isLoading={props.shouldShowLoadingSkeleton} loadingLabel="Loading user accounts..." loadingRowCount={6} />
      <UserManagementPagination currentPage={props.currentPage} totalPages={props.totalPages} effectiveTotalPages={props.effectiveTotalPages} pageInput={props.pageInput} setCurrentPage={props.setCurrentPage} setPageInput={props.setPageInput} applyPageInput={props.applyPageInput} handlePageJump={props.handlePageJump} />
    </>
  );
}

function UserManagementTableBody(props: {
  message: string | null;
  status: RequestState;
  tableStatus: RequestState;
  rows: ReturnType<typeof buildUserManagementRows>;
  shouldShowLoadingSkeleton: boolean;
  totalPages: number;
  currentPage: number;
  effectiveTotalPages: number;
  pageInput: string;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
  applyPageInput: (value: string) => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  normalizedSearch: string;
  searchQuery: string;
}) {
  return (
    <>
      <UserManagementMessage message={props.message} status={props.status} tableStatus={props.tableStatus} />
      <UserManagementTableContent rows={props.rows} shouldShowLoadingSkeleton={props.shouldShowLoadingSkeleton} totalPages={props.totalPages} currentPage={props.currentPage} effectiveTotalPages={props.effectiveTotalPages} pageInput={props.pageInput} setCurrentPage={props.setCurrentPage} setPageInput={props.setPageInput} applyPageInput={props.applyPageInput} handlePageJump={props.handlePageJump} normalizedSearch={props.normalizedSearch} searchQuery={props.searchQuery} />
    </>
  );
}

export function UserManagementTable() {
  const state = useUserManagementState();
  const normalizedSearch = normalizeSearchQuery(state.searchQuery);
  const effectiveTotalPages = getEffectiveTotalPages(state.totalPages);
  const pageStart = getPaginationStart(state.totalUsers, state.currentPage, USERS_PER_PAGE);
  const pageEnd = getPaginationEnd(state.totalUsers, state.currentPage, USERS_PER_PAGE, state.users.length);
  const loadUsers = useLoadUsers(state);
  useCurrentPageSync(normalizedSearch, state.setCurrentPage);
  useSortPageSync(state.sortValue, state.setCurrentPage);
  usePageInputSync(state.currentPage, state.setPageInput);
  useEffect(() => {
    void loadUsers(state.searchQuery, state.currentPage, state.sortValue);
  }, [loadUsers, state.currentPage, state.searchQuery, state.sortValue]);
  const pageJumpHandlers = usePageJumpHandlers(state);
  const actions = useUserActions({ users: state.users, searchQuery: state.searchQuery, currentPage: state.currentPage, sortValue: state.sortValue, setUsers: state.setUsers, setStatus: state.setStatus, setMessage: state.setMessage, loadUsers });
  const rows = buildUserManagementRows({ users: state.users, busy: state.status === "loading", onRoleChange: (userId, role) => { void actions.handleRoleChange(userId, role); }, onStatusToggle: (userId, nextStatus) => { void actions.handleStatusToggle(userId, nextStatus); } });
  const shouldShowLoadingSkeleton = state.tableStatus === "loading" && rows.length === 0;
  return (
    <Card title="User accounts" className="user-management-card">
      <UserManagementToolbar searchQuery={state.searchQuery} sortValue={state.sortValue} tableStatus={state.tableStatus} totalUsers={state.totalUsers} pageStart={pageStart} pageEnd={pageEnd} onSearchChange={state.setSearchQuery} onSortChange={state.setSortValue} />
      <UserManagementTableBody message={state.message} status={state.status} tableStatus={state.tableStatus} rows={rows} shouldShowLoadingSkeleton={shouldShowLoadingSkeleton} totalPages={state.totalPages} currentPage={state.currentPage} effectiveTotalPages={effectiveTotalPages} pageInput={state.pageInput} setCurrentPage={state.setCurrentPage} setPageInput={state.setPageInput} applyPageInput={pageJumpHandlers.applyPageInput} handlePageJump={pageJumpHandlers.handlePageJump} normalizedSearch={normalizedSearch} searchQuery={state.searchQuery} />
    </Card>
  );
}
