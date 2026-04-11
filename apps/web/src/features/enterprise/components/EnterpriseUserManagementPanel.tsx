"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  createEnterpriseUser,
  removeEnterpriseUser,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../api/client";
import type { EnterpriseManagedUser, EnterpriseManagedUserRecord } from "../types";
import { getEffectiveTotalPages, getPaginationEnd, getPaginationStart, parsePageInput } from "@/shared/lib/pagination";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";
import {
  DEFAULT_ENTERPRISE_USER_SORT_VALUE,
  EnterpriseUserCreateForm,
  type EnterpriseUserSortValue,
  normalizeEnterpriseManagedUser,
  resolveEnterpriseMembershipStatusLabel,
  resolveEnterpriseUserMutationError,
  resolveEnterpriseUserSortParams,
  RoleControl,
  type RequestState,
  USERS_PER_PAGE,
  UsersSummaryLabel,
} from "./EnterpriseUserManagementPanel.shared";

type EnterpriseUserManagementPanelProps = {
  currentUserId: number;
  currentUserRole: EnterpriseManagedUser["role"];
};

export function EnterpriseUserManagementPanel({ currentUserId, currentUserRole }: EnterpriseUserManagementPanelProps) {
  const [users, setUsers] = useState<EnterpriseManagedUser[]>([]);
  const [usersStatus, setUsersStatus] = useState<RequestState>("idle");
  const [usersMessage, setUsersMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSortValue, setUserSortValue] = useState<EnterpriseUserSortValue>(DEFAULT_ENTERPRISE_USER_SORT_VALUE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [actionState, setActionState] = useState<Record<number, RequestState>>({});
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<number | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [createStatus, setCreateStatus] = useState<RequestState>("idle");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  const normalizedSearch = normalizeSearchQuery(searchQuery);
  const effectiveTotalPages = getEffectiveTotalPages(totalPages);
  const userStart = getPaginationStart(totalUsers, currentPage, USERS_PER_PAGE);
  const userEnd = getPaginationEnd(totalUsers, currentPage, USERS_PER_PAGE, users.length);

  const setUserRow = useCallback((userId: number, update: (user: EnterpriseManagedUser) => EnterpriseManagedUser) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  }, []);

  const loadUsers = useCallback(async (query: string, page: number, sortValue: EnterpriseUserSortValue) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setUsersStatus("loading");
    setUsersMessage(null);

    try {
      const response = await searchEnterpriseUsers({
        q: query.trim() || undefined,
        page,
        pageSize: USERS_PER_PAGE,
        ...resolveEnterpriseUserSortParams(sortValue),
      });
      if (latestRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }

      setUsers(response.items.map(normalizeEnterpriseManagedUser));
      setTotalUsers(response.total);
      setTotalPages(response.totalPages);
      setUsersStatus("success");
    } catch (err) {
      if (latestRequestId.current !== requestId) return;
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(0);
      setUsersStatus("error");
      setUsersMessage(err instanceof Error ? err.message : "Could not load enterprise users.");
    }
  }, []);

  useEffect(() => {
    void loadUsers(searchQuery, currentPage, userSortValue);
  }, [searchQuery, currentPage, loadUsers, userSortValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, userSortValue]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const applyPageInput = useCallback((value: string) => {
    const parsedPage = parsePageInput(value, totalPages);
    if (parsedPage === null) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  }, [currentPage, totalPages]);

  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  }, [applyPageInput, pageInput]);

  const handleCreateUser = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = createEmail.trim().toLowerCase();
    if (!email) {
      setCreateStatus("error");
      setCreateMessage("Email is required.");
      return;
    }

    setCreateStatus("loading");
    setCreateMessage(null);
    try {
      await createEnterpriseUser({
        email,
        role: createRole,
        ...(createFirstName.trim() ? { firstName: createFirstName.trim() } : {}),
        ...(createLastName.trim() ? { lastName: createLastName.trim() } : {}),
      });
      setCreateStatus("success");
      setCreateMessage("Account created or reinstated.");
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateRole("STUDENT");
      void loadUsers(searchQuery, currentPage, userSortValue);
    } catch (err) {
      setCreateStatus("error");
      setCreateMessage(resolveEnterpriseUserMutationError(err, "Could not create account."));
    }
  }, [createEmail, createRole, createFirstName, createLastName, loadUsers, searchQuery, currentPage, userSortValue]);

  const handleRoleChange = useCallback(async (userId: number, role: "STUDENT" | "STAFF") => {
    const previousUsers = users.map((user) => ({ ...user }));
    setActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setUsersMessage(null);
    setUserRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" }));

    try {
      const updated = await updateEnterpriseUser(userId, { role });
      setUserRow(userId, () => normalizeEnterpriseManagedUser(updated));
      void loadUsers(searchQuery, currentPage, userSortValue);
    } catch (err) {
      setUsers(previousUsers);
      setUsersMessage(resolveEnterpriseUserMutationError(err, "Could not update user role."));
      setUsersStatus("error");
    } finally {
      setActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }, [users, setUserRow, loadUsers, searchQuery, currentPage, userSortValue]);

  const handleStatusChange = useCallback(async (userId: number, active: boolean) => {
    const previousUsers = users.map((user) => ({ ...user }));
    setActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setUsersMessage(null);
    setUserRow(userId, (user) => ({ ...user, active, membershipStatus: active ? "active" : "inactive" }));

    try {
      const updated = await updateEnterpriseUser(userId, { active });
      setUserRow(userId, () => normalizeEnterpriseManagedUser(updated));
      void loadUsers(searchQuery, currentPage, userSortValue);
    } catch (err) {
      setUsers(previousUsers);
      setUsersMessage(resolveEnterpriseUserMutationError(err, "Could not update account status."));
      setUsersStatus("error");
    } finally {
      setActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }, [users, setUserRow, loadUsers, searchQuery, currentPage, userSortValue]);

  const runRemoveUser = useCallback(async (userId: number) => {
    const previousUsers = users.map((user) => ({ ...user }));
    setActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setUsersMessage(null);
    setUserRow(userId, (user) => ({ ...user, active: false, role: "STUDENT", isStaff: false, membershipStatus: "left" }));

    try {
      await removeEnterpriseUser(userId);
    } catch (err) {
      setUsers(previousUsers);
      setUsersMessage(resolveEnterpriseUserMutationError(err, "Could not remove user."));
      setUsersStatus("error");
    } finally {
      setActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }, [users, setUserRow]);

  const pendingRemoveUser = pendingRemoveUserId === null
    ? null
    : users.find((user) => user.id === pendingRemoveUserId) ?? null;

  const requestRemoveUser = useCallback((userId: number) => {
    setPendingRemoveUserId(userId);
  }, []);

  const cancelRemoveUser = useCallback(() => {
    setPendingRemoveUserId(null);
  }, []);

  const confirmRemoveUser = useCallback(async () => {
    if (pendingRemoveUserId === null) {
      return;
    }
    const userId = pendingRemoveUserId;
    setPendingRemoveUserId(null);
    await runRemoveUser(userId);
  }, [pendingRemoveUserId, runRemoveUser]);

  const rows = users.map((user) => {
    const isBusy = actionState[user.id] === "loading";
    const isCurrentUser = user.id === currentUserId;
    const canManageEnterpriseAdminAccount = currentUserRole === "ADMIN";
    const statusLabel = resolveEnterpriseMembershipStatusLabel(user.membershipStatus);
    const statusClassName = user.membershipStatus === "active"
      ? "status-chip status-chip--success"
      : "status-chip status-chip--danger";
    return [
      <div key={`${user.id}-email`} className="ui-stack-xs">
        <strong>{user.email}</strong>
        <span className="muted">ID {user.id}</span>
      </div>,
      <span key={`${user.id}-name`}>{`${user.firstName} ${user.lastName}`}</span>,
      <div key={`${user.id}-role`} className="ui-row ui-row--start">
        <RoleControl
          user={user}
          busy={isBusy || !user.active}
          onRoleChange={(role) => void handleRoleChange(user.id, role)}
        />
      </div>,
      <span key={`${user.id}-status`} className={statusClassName}>
        <span>{user.membershipStatus === "active" ? "●" : "○"}</span>
        <span>{statusLabel}</span>
      </span>,
      <div key={`${user.id}-actions`} className="enterprise-management__row-actions">
        {isCurrentUser ? (
          <span className="ui-note ui-note--muted">Current account</span>
        ) : user.role === "ADMIN" ? (
          <span className="ui-note ui-note--muted">Platform admin</span>
        ) : user.role === "ENTERPRISE_ADMIN" && !canManageEnterpriseAdminAccount ? (
          <span className="ui-note ui-note--muted">Invite-managed role</span>
        ) : user.active ? (
          <Button type="button" variant="danger" size="sm" onClick={() => requestRemoveUser(user.id)} disabled={isBusy}>
            Remove
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => void handleStatusChange(user.id, true)} disabled={isBusy}>
            Reinstate
          </Button>
        )}
      </div>,
    ];
  });

  const showSkeletonTable = usersStatus === "loading" && rows.length === 0;

  return (
    <Card title="Enterprise members" className="enterprise-users__card">
      <p className="muted">View everyone in your enterprise, change student/staff permissions, and remove access.</p>
      <EnterpriseUserCreateForm
        createEmail={createEmail}
        createFirstName={createFirstName}
        createLastName={createLastName}
        createRole={createRole}
        createStatus={createStatus}
        createMessage={createMessage}
        onSubmit={handleCreateUser}
        onCreateEmailChange={setCreateEmail}
        onCreateFirstNameChange={setCreateFirstName}
        onCreateLastNameChange={setCreateLastName}
        onCreateRoleChange={setCreateRole}
      />

      <div className="enterprise-users__toolbar">
        <SearchField
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="enterprise-management__modal-search enterprise-users__search"
          placeholder="Search by name, email, role, or ID"
          aria-label="Search enterprise users"
        />
        <div className="ui-toolbar enterprise-users__meta">
          <label className="enterprise-users__sort-inline" htmlFor="enterprise-admin-user-sort">
            <span className="ui-note ui-note--muted">Sort</span>
            <select
              id="enterprise-admin-user-sort"
              className="enterprise-management__modal-sort"
              value={userSortValue}
              onChange={(event) => setUserSortValue(event.target.value as EnterpriseUserSortValue)}
              aria-label="Sort enterprise users"
            >
              <option value="default">Default order</option>
              <option value="joinDateDesc">Join date (newest first)</option>
              <option value="joinDateAsc">Join date (oldest first)</option>
              <option value="nameAsc">Name (A-Z)</option>
              <option value="nameDesc">Name (Z-A)</option>
            </select>
          </label>
          <span className="ui-note ui-note--muted enterprise-users__toolbar-summary">
            <UsersSummaryLabel
              usersStatus={usersStatus}
              totalUsers={totalUsers}
              userStart={userStart}
              userEnd={userEnd}
            />
          </span>
        </div>
      </div>

      {usersMessage ? (
        <div className={usersStatus === "error" ? "status-alert status-alert--error" : "ui-note ui-note--muted"}>
          <span>{usersMessage}</span>
        </div>
      ) : null}

      {rows.length > 0 || showSkeletonTable ? (
        <>
          <Table
            headers={["Email", "Name", "Permission", "Account status", "Actions"]}
            rows={rows}
            className="user-management__table"
            rowClassName="user-management__row"
            columnTemplate="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 0.8fr)"
            isLoading={showSkeletonTable}
            loadingLabel="Loading users..."
            loadingRowCount={6}
          />
          {!showSkeletonTable ? (
            <PaginationControls
              ariaLabel="Enterprise users pagination"
              page={currentPage}
              totalPages={totalPages}
              onPreviousPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setCurrentPage((prev) => Math.min(effectiveTotalPages, prev + 1))}
            >
              <PaginationPageJump
                pageInputId="enterprise-users-page-input"
                pageInput={pageInput}
                totalPages={totalPages}
                pageJumpAriaLabel="Go to enterprise users page number"
                onPageInputChange={setPageInput}
                onPageInputBlur={() => applyPageInput(pageInput)}
                onPageJump={handlePageJump}
              />
            </PaginationControls>
          ) : null}
        </>
      ) : (
        <div className="ui-empty-state">
          <p>
            {normalizedSearch
              ? `No users match "${searchQuery.trim()}".`
              : "No users found in this enterprise."}
          </p>
        </div>
      )}

      <ConfirmationModal
        open={pendingRemoveUser !== null}
        title="Remove user from enterprise"
        message={
          pendingRemoveUser
            ? `Remove "${pendingRemoveUser.email}" from enterprise access? This will revoke active sessions and module assignments.`
            : "Remove this user from enterprise access? This will revoke active sessions and module assignments."
        }
        confirmLabel="Remove user"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={cancelRemoveUser}
        onConfirm={() => void confirmRemoveUser()}
      />
    </Card>
  );
}
