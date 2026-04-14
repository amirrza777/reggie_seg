import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { buildUserManagementRows } from "./rows/userManagementRows";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";

type RequestState = "idle" | "loading" | "success" | "error";
type UserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";
type UserManagementRows = ReturnType<typeof buildUserManagementRows>;

export function UserManagementToolbar(props: {
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
      <SearchField
        value={props.searchQuery}
        onChange={(event) => props.onSearchChange(event.target.value)}
        className="user-management__search"
        placeholder="Search by name, email, role, status, or ID"
        aria-label="Search user accounts"
      />
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
          <UserManagementCountLabel
            tableStatus={props.tableStatus}
            totalUsers={props.totalUsers}
            pageStart={props.pageStart}
            pageEnd={props.pageEnd}
          />
        </span>
      </div>
    </div>
  );
}

function UserManagementMessage({
  message,
  status,
  tableStatus,
}: {
  message: string | null;
  status: RequestState;
  tableStatus: RequestState;
}) {
  if (!message) {
    return null;
  }
  const variantClass =
    status === "error" || tableStatus === "error"
      ? "status-alert status-alert--error"
      : "status-alert status-alert--success";

  return (
    <div className={`${variantClass} status-alert--spaced`}>
      <span>{message}</span>
    </div>
  );
}

function UserManagementCountLabel({
  tableStatus,
  totalUsers,
  pageStart,
  pageEnd,
}: {
  tableStatus: RequestState;
  totalUsers: number;
  pageStart: number;
  pageEnd: number;
}) {
  if (tableStatus === "loading" && totalUsers === 0) {
    return "Loading accounts...";
  }
  if (totalUsers === 0) {
    return "Showing 0 accounts.";
  }
  return `Showing ${pageStart}-${pageEnd} of ${totalUsers} account${
    totalUsers === 1 ? "" : "s"
  }.`;
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
    <PaginationControls
      ariaLabel="User accounts pagination"
      page={props.currentPage}
      totalPages={props.totalPages}
      onPreviousPage={() =>
        props.setCurrentPage((previousPage) => Math.max(1, previousPage - 1))
      }
      onNextPage={() =>
        props.setCurrentPage((previousPage) =>
          Math.min(props.effectiveTotalPages, previousPage + 1),
        )
      }
    >
      <PaginationPageJump
        pageInputId="user-management-page-input"
        pageInput={props.pageInput}
        totalPages={props.totalPages}
        pageJumpAriaLabel="Go to page number"
        onPageInputChange={props.setPageInput}
        onPageInputBlur={() => props.applyPageInput(props.pageInput)}
        onPageJump={props.handlePageJump}
      />
    </PaginationControls>
  );
}

function UserManagementEmptyState({
  normalizedSearch,
  searchQuery,
}: {
  normalizedSearch: string;
  searchQuery: string;
}) {
  return (
    <div className="ui-empty-state">
      <p>
        {normalizedSearch
          ? `No user accounts match "${searchQuery.trim()}".`
          : "No user accounts found."}
      </p>
    </div>
  );
}

function UserManagementTableContent(props: {
  rows: UserManagementRows;
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
    return (
      <UserManagementEmptyState
        normalizedSearch={props.normalizedSearch}
        searchQuery={props.searchQuery}
      />
    );
  }

  return (
    <>
      <Table
        headers={["Email", "Name", "Role", "Account status", ""]}
        rows={props.rows}
        className="user-management__table"
        headClassName="user-management__head"
        rowClassName="user-management__row"
        columnTemplate="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 0.5fr)"
        isLoading={props.shouldShowLoadingSkeleton}
        loadingLabel="Loading user accounts..."
        loadingRowCount={6}
      />
      <UserManagementPagination
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        effectiveTotalPages={props.effectiveTotalPages}
        pageInput={props.pageInput}
        setCurrentPage={props.setCurrentPage}
        setPageInput={props.setPageInput}
        applyPageInput={props.applyPageInput}
        handlePageJump={props.handlePageJump}
      />
    </>
  );
}

export function UserManagementTableBody(props: {
  message: string | null;
  status: RequestState;
  tableStatus: RequestState;
  rows: UserManagementRows;
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
      <UserManagementMessage
        message={props.message}
        status={props.status}
        tableStatus={props.tableStatus}
      />
      <UserManagementTableContent
        rows={props.rows}
        shouldShowLoadingSkeleton={props.shouldShowLoadingSkeleton}
        totalPages={props.totalPages}
        currentPage={props.currentPage}
        effectiveTotalPages={props.effectiveTotalPages}
        pageInput={props.pageInput}
        setCurrentPage={props.setCurrentPage}
        setPageInput={props.setPageInput}
        applyPageInput={props.applyPageInput}
        handlePageJump={props.handlePageJump}
        normalizedSearch={props.normalizedSearch}
        searchQuery={props.searchQuery}
      />
    </>
  );
}
