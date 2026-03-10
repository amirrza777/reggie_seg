"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Table } from "@/shared/ui/Table";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../types";
import {
  createEnterprise,
  deleteEnterprise,
  searchEnterpriseUsers,
  searchEnterprises,
  updateEnterpriseUser,
} from "../api/client";

type RequestState = "idle" | "loading" | "success" | "error";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";
const ENTERPRISES_PER_PAGE = 8;
const ENTERPRISE_USERS_PER_PAGE = 10;

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

type EnterpriseManagementTableProps = {
  isSuperAdmin: boolean;
};

export function EnterpriseManagementTable({ isSuperAdmin }: EnterpriseManagementTableProps) {
  const [enterprises, setEnterprises] = useState<EnterpriseRecord[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [enterpriseTableStatus, setEnterpriseTableStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [enterpriseTotal, setEnterpriseTotal] = useState(0);
  const [enterpriseTotalPages, setEnterpriseTotalPages] = useState(0);
  const latestEnterpriseRequestId = useRef(0);

  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<Record<string, boolean>>({});

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
  const latestEnterpriseUsersRequestId = useRef(0);

  const normalizedEnterpriseSearch = normalizeSearchQuery(searchQuery);
  const normalizedEnterpriseUserSearch = normalizeSearchQuery(enterpriseUserSearchQuery);
  const effectiveEnterpriseTotalPages = Math.max(1, enterpriseTotalPages);
  const effectiveEnterpriseUserTotalPages = Math.max(1, enterpriseUserTotalPages);

  const loadEnterprises = useCallback(async (query: string, page: number) => {
    const requestId = latestEnterpriseRequestId.current + 1;
    latestEnterpriseRequestId.current = requestId;
    setEnterpriseTableStatus("loading");

    try {
      const response = await searchEnterprises({
        q: query.trim() || undefined,
        page,
        pageSize: ENTERPRISES_PER_PAGE,
      });
      if (latestEnterpriseRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }

      setEnterprises(response.items);
      setEnterpriseTotal(response.total);
      setEnterpriseTotalPages(response.totalPages);
      setEnterpriseTableStatus("success");
    } catch (err) {
      if (latestEnterpriseRequestId.current !== requestId) return;
      setEnterprises([]);
      setEnterpriseTotal(0);
      setEnterpriseTotalPages(0);
      setEnterpriseTableStatus("error");
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load enterprises.");
    }
  }, []);

  const loadEnterpriseUsers = useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestId.current + 1;
    latestEnterpriseUsersRequestId.current = requestId;
    setEnterpriseUsersStatus("loading");
    setEnterpriseUsersMessage(null);

    try {
      const response = await searchEnterpriseUsers(enterpriseId, {
        q: query.trim() || undefined,
        page,
        pageSize: ENTERPRISE_USERS_PER_PAGE,
      });
      if (latestEnterpriseUsersRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setEnterpriseUserPage(response.totalPages);
        return;
      }

      setEnterpriseUsers(response.items.map(normalizeUser));
      setEnterpriseUserTotal(response.total);
      setEnterpriseUserTotalPages(response.totalPages);
      setEnterpriseUsersStatus("success");
      if (response.total === 0) {
        setEnterpriseUsersMessage("No user accounts found in this enterprise.");
      }
    } catch (err) {
      if (latestEnterpriseUsersRequestId.current !== requestId) return;
      setEnterpriseUsers([]);
      setEnterpriseUserTotal(0);
      setEnterpriseUserTotalPages(0);
      setEnterpriseUsersStatus("error");
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not load enterprise users.");
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadEnterprises(searchQuery, currentPage);
  }, [isSuperAdmin, searchQuery, currentPage, loadEnterprises]);

  useEffect(() => {
    if (!selectedEnterprise) return;
    void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
  }, [selectedEnterprise, enterpriseUserSearchQuery, enterpriseUserPage, loadEnterpriseUsers]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedEnterpriseSearch]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterprise?.id]);

  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage]);

  if (!isSuperAdmin) return null;

  const showSuccessToast = (nextMessage: string) => {
    setToastMessage(nextMessage);
  };

  const handleCreateEnterprise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!name) {
      setStatus("error");
      setMessage("Enterprise name is required.");
      return;
    }

    setIsCreating(true);
    setMessage(null);
    try {
      const created = await createEnterprise({ name, ...(code ? { code } : {}) });
      setStatus("success");
      showSuccessToast(`Enterprise "${created.name}" created with code ${created.code}.`);
      setNameInput("");
      setCodeInput("");
      setCreateModalOpen(false);
      setCurrentPage(1);
      void loadEnterprises(searchQuery, 1);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not create enterprise.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEnterprise = async (enterprise: EnterpriseRecord) => {
    const confirmed = window.confirm(`Delete enterprise "${enterprise.name}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeleteState((prev) => ({ ...prev, [enterprise.id]: true }));
    setMessage(null);
    try {
      await deleteEnterprise(enterprise.id);
      setStatus("success");
      showSuccessToast(`Enterprise "${enterprise.name}" deleted.`);
      if (selectedEnterprise?.id === enterprise.id) {
        setSelectedEnterprise(null);
        setEnterpriseUsers([]);
      }
      void loadEnterprises(searchQuery, currentPage);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not delete enterprise.");
    } finally {
      setDeleteState((prev) => ({ ...prev, [enterprise.id]: false }));
    }
  };

  const openEnterpriseAccounts = (enterprise: EnterpriseRecord) => {
    setSelectedEnterprise(enterprise);
    setEnterpriseUsers([]);
    setEnterpriseUserTotal(0);
    setEnterpriseUserTotalPages(0);
    setEnterpriseUsersMessage(null);
    setEnterpriseUserSearchQuery("");
    setEnterpriseUserPage(1);
    setEnterpriseUserActionState({});
  };

  const setEnterpriseUserRow = (userId: number, update: (user: AdminUser) => AdminUser) => {
    setEnterpriseUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  };

  const handleEnterpriseUserRoleChange = async (userId: number, role: UserRole) => {
    if (!selectedEnterprise) return;
    const previous = enterpriseUsers.map((user) => ({ ...user }));
    setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setEnterpriseUsersMessage(null);
    setEnterpriseUserRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" }));

    try {
      const updated = await updateEnterpriseUser(selectedEnterprise.id, userId, { role });
      setEnterpriseUserRow(userId, () => normalizeUser(updated));
      showSuccessToast(`Updated role to ${role.toLowerCase()}.`);
      void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
    } catch (err) {
      setEnterpriseUsers(previous);
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not update role.");
    } finally {
      setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  };

  const handleEnterpriseUserStatusToggle = async (userId: number, nextStatus: boolean) => {
    if (!selectedEnterprise) return;
    const previous = enterpriseUsers.map((user) => ({ ...user }));
    setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setEnterpriseUsersMessage(null);
    setEnterpriseUserRow(userId, (user) => ({ ...user, active: nextStatus }));

    try {
      const updated = await updateEnterpriseUser(selectedEnterprise.id, userId, { active: nextStatus });
      setEnterpriseUserRow(userId, () => normalizeUser(updated));
      showSuccessToast(nextStatus ? "Account activated." : "Account suspended.");
      void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
    } catch (err) {
      setEnterpriseUsers(previous);
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not update account status.");
    } finally {
      setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  };

  const applyPageInput = (value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseTotalPages) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  };

  const applyEnterpriseUserPageInput = (value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseUserTotalPages) {
      setEnterpriseUserPageInput(String(enterpriseUserPage));
      return;
    }
    setEnterpriseUserPage(parsedPage);
  };

  const handlePageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  };

  const handleEnterpriseUserPageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyEnterpriseUserPageInput(enterpriseUserPageInput);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setNameInput("");
    setCodeInput("");
  };

  const enterpriseStart = enterpriseTotal === 0 ? 0 : (currentPage - 1) * ENTERPRISES_PER_PAGE + 1;
  const enterpriseEnd =
    enterpriseTotal === 0 ? 0 : Math.min((currentPage - 1) * ENTERPRISES_PER_PAGE + enterprises.length, enterpriseTotal);

  const enterpriseUserStart = enterpriseUserTotal === 0 ? 0 : (enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + 1;
  const enterpriseUserEnd =
    enterpriseUserTotal === 0
      ? 0
      : Math.min((enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + enterpriseUsers.length, enterpriseUserTotal);

  const rows = enterprises.map((enterprise) => [
    <div key={`${enterprise.id}-name`} className="ui-stack-xs">
      <strong>{enterprise.name}</strong>
      <span className="muted">Code: {enterprise.code}</span>
    </div>,
    <div key={`${enterprise.id}-accounts`} className="ui-stack-xs">
      <span>{enterprise.users} accounts</span>
      <span className="muted">
        {enterprise.admins} admins, {enterprise.enterpriseAdmins} enterprise admins, {enterprise.staff} staff,{" "}
        {enterprise.students} students
      </span>
    </div>,
    <div key={`${enterprise.id}-workspace`} className="ui-stack-xs">
      <span>{enterprise.modules} modules</span>
      <span className="muted">{enterprise.teams} teams</span>
    </div>,
    <span key={`${enterprise.id}-created`}>{formatDate(enterprise.createdAt)}</span>,
    <div key={`${enterprise.id}-actions`} className="enterprise-management__row-actions">
      <Button type="button" variant="ghost" onClick={() => openEnterpriseAccounts(enterprise)}>
        Manage accounts
      </Button>
      <Button
        type="button"
        variant="danger"
        onClick={() => void handleDeleteEnterprise(enterprise)}
        disabled={deleteState[enterprise.id] === true}
      >
        Delete
      </Button>
    </div>,
  ]);

  const enterpriseUserRows = enterpriseUsers.map((user) => {
    const isAdmin = user.role === "ADMIN";
    const isEnterpriseAdmin = user.role === "ENTERPRISE_ADMIN";
    const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
    const busy = enterpriseUserActionState[user.id] === "loading";
    const roleLabel =
      isAdmin
        ? "Admin"
        : isEnterpriseAdmin
          ? "Enterprise admin"
          : user.role === "STAFF"
            ? "Staff"
            : "Student";
    const statusClass = user.active ? "status-chip status-chip--success" : "status-chip status-chip--danger";
    const statusLabel = user.active ? "Active" : "Suspended";

    const roleControl = isAdmin ? (
      <span className="role-chip">Admin</span>
    ) : isEnterpriseAdmin ? (
      <span className="role-chip role-chip--locked">Enterprise admin</span>
    ) : (
      <div className="user-management__role-toggle">
        <Button
          type="button"
          variant={user.role === "STUDENT" ? "primary" : "ghost"}
          className="user-management__role-toggle-btn"
          onClick={() => void handleEnterpriseUserRoleChange(user.id, "STUDENT")}
          disabled={busy || user.role === "STUDENT"}
        >
          Student
        </Button>
        <Button
          type="button"
          variant={user.role === "STAFF" ? "primary" : "ghost"}
          className="user-management__role-toggle-btn"
          onClick={() => void handleEnterpriseUserRoleChange(user.id, "STAFF")}
          disabled={busy || user.role === "STAFF"}
        >
          Staff
        </Button>
      </div>
    );

    return [
      <div key={`${user.id}-email`} className="ui-stack-xs">
        <strong>{user.email}</strong>
        <span className="muted">{roleLabel}</span>
      </div>,
      <div key={`${user.id}-name`} className="ui-stack-xs">
        <span>{`${user.firstName} ${user.lastName}`}</span>
        <span className="muted">ID {user.id}</span>
      </div>,
      <div key={`${user.id}-role`} className="ui-row ui-row--start">
        {roleControl}
      </div>,
      isSuperAdmin ? (
        <span key={`${user.id}-status`} className={`${statusClass} status-chip--disabled`}>
          <span>●</span>
          <span>Active</span>
        </span>
      ) : (
        <button
          key={`${user.id}-status`}
          className={statusClass}
          onClick={() => void handleEnterpriseUserStatusToggle(user.id, !user.active)}
          disabled={busy}
        >
          <span>{user.active ? "●" : "○"}</span>
          <span>{statusLabel}</span>
        </button>
      ),
    ];
  });

  return (
    <>
      {toastMessage ? (
        <div className="ui-toast-layer" aria-live="polite" aria-atomic="true">
          <div className="ui-toast ui-toast--success" role="status">
            {toastMessage}
          </div>
        </div>
      ) : null}

      <Card
        title="Enterprises"
        className="user-management-card"
        action={
          <div className="ui-row enterprise-management__actions">
            <FormField
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="enterprise-management__search"
              placeholder="Search by enterprise name, code, or account breakdown"
              aria-label="Search enterprises"
            />
            <Button
              type="button"
              className="enterprise-management__create-trigger"
              onClick={() => setCreateModalOpen(true)}
            >
              Create
            </Button>
          </div>
        }
      >
        {message && status === "error" ? (
          <div className="status-alert status-alert--error status-alert--spaced">
            <span>{message}</span>
          </div>
        ) : null}

        <div className="user-management__toolbar">
          <span className="ui-note ui-note--muted">
            {enterpriseTableStatus === "loading" && enterpriseTotal === 0
              ? "Loading enterprises..."
              : enterpriseTotal === 0
                ? "Showing 0 enterprises."
                : `Showing ${enterpriseStart}-${enterpriseEnd} of ${enterpriseTotal} enterprise${
                    enterpriseTotal === 1 ? "" : "s"
                  }.`}
          </span>
        </div>

        {rows.length > 0 ? (
          <>
            <Table
              headers={["Enterprise", "Accounts", "Workspace", "Created", "Manage accounts and delete"]}
              rows={rows}
              className="enterprise-management__table"
              rowClassName="enterprise-management__row"
              columnTemplate="1.3fr 1.55fr 1fr 0.82fr 1.05fr"
            />
            {enterpriseTotalPages > 1 ? (
              <div className="user-management__pagination" aria-label="Enterprise pagination">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <form className="user-management__page-jump" onSubmit={handlePageJump}>
                  <label htmlFor="enterprise-page-input" className="user-management__page-jump-label">
                    Page
                  </label>
                  <FormField
                    id="enterprise-page-input"
                    type="number"
                    min={1}
                    max={effectiveEnterpriseTotalPages}
                    step={1}
                    inputMode="numeric"
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                    onBlur={() => applyPageInput(pageInput)}
                    className="user-management__page-jump-input"
                    aria-label="Go to enterprise page number"
                  />
                  <span className="muted user-management__page-total">of {effectiveEnterpriseTotalPages}</span>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(effectiveEnterpriseTotalPages, prev + 1))}
                  disabled={currentPage === effectiveEnterpriseTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="ui-empty-state">
            <p>
              {enterpriseTableStatus === "loading"
                ? "Loading enterprises..."
                : normalizeSearchQuery(searchQuery)
                  ? `No enterprises match "${searchQuery.trim()}".`
                  : "No enterprises found."}
            </p>
          </div>
        )}
      </Card>

      {createModalOpen ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-enterprise-title"
          onClick={closeCreateModal}
        >
          <div
            className="modal__dialog admin-modal ui-content-width enterprise-management__create-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="create-enterprise-title">Create enterprise</h3>
                <p className="muted">Create a new enterprise account space. You can provide a code or let it auto-generate.</p>
              </div>
              <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={closeCreateModal}>
                ×
              </Button>
            </div>

            <form className="modal__body admin-modal__body enterprise-management__create" onSubmit={handleCreateEnterprise}>
              <FormField
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Enterprise name"
                aria-label="Enterprise name"
                required
              />
              <FormField
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                placeholder="Code (optional)"
                aria-label="Enterprise code"
                maxLength={16}
              />
              <div className="ui-row ui-row--end enterprise-management__create-actions">
                <Button type="button" variant="ghost" onClick={closeCreateModal} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create enterprise"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedEnterprise ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-users-title"
          onClick={() => setSelectedEnterprise(null)}
        >
          <div
            className="modal__dialog admin-modal ui-content-width enterprise-management__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="enterprise-users-title">{selectedEnterprise.name} accounts</h3>
                <p className="muted">
                  Enterprise code {selectedEnterprise.code}. Manage staff/student roles and account status for this enterprise.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="modal__close-btn"
                aria-label="Close"
                onClick={() => setSelectedEnterprise(null)}
              >
                ×
              </Button>
            </div>

            <div className="modal__body admin-modal__body">
              <div className="ui-toolbar enterprise-management__modal-toolbar">
                <FormField
                  type="search"
                  value={enterpriseUserSearchQuery}
                  onChange={(event) => setEnterpriseUserSearchQuery(event.target.value)}
                  className="enterprise-management__modal-search"
                  placeholder="Search by name, email, role, or ID"
                  aria-label="Search enterprise users"
                />
              </div>

              {enterpriseUsersMessage ? (
                <div className={enterpriseUsersStatus === "error" ? "status-alert status-alert--error" : "ui-note ui-note--muted"}>
                  <span>{enterpriseUsersMessage}</span>
                </div>
              ) : null}

              <span className="ui-note ui-note--muted">
                {enterpriseUsersStatus === "loading" && enterpriseUserTotal === 0
                  ? "Loading accounts..."
                  : enterpriseUserTotal === 0
                    ? "Showing 0 accounts."
                    : `Showing ${enterpriseUserStart}-${enterpriseUserEnd} of ${enterpriseUserTotal} account${
                        enterpriseUserTotal === 1 ? "" : "s"
                      }.`}
              </span>

              {enterpriseUserRows.length > 0 ? (
                <>
                  <div className="enterprise-management__modal-table">
                    <Table
                      headers={["Email", "Name", "Role", "Account status"]}
                      rows={enterpriseUserRows}
                      rowClassName="user-management__row"
                      columnTemplate="1.4fr 1fr 1fr 0.9fr"
                    />
                  </div>
                  {enterpriseUserTotalPages > 1 ? (
                    <div className="user-management__pagination" aria-label="Enterprise users pagination">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEnterpriseUserPage((prev) => Math.max(1, prev - 1))}
                        disabled={enterpriseUserPage === 1}
                      >
                        Previous
                      </Button>
                      <form className="user-management__page-jump" onSubmit={handleEnterpriseUserPageJump}>
                        <label htmlFor="enterprise-user-page-input" className="user-management__page-jump-label">
                          Page
                        </label>
                        <FormField
                          id="enterprise-user-page-input"
                          type="number"
                          min={1}
                          max={effectiveEnterpriseUserTotalPages}
                          step={1}
                          inputMode="numeric"
                          value={enterpriseUserPageInput}
                          onChange={(event) => setEnterpriseUserPageInput(event.target.value)}
                          onBlur={() => applyEnterpriseUserPageInput(enterpriseUserPageInput)}
                          className="user-management__page-jump-input"
                          aria-label="Go to enterprise user page number"
                        />
                        <span className="muted user-management__page-total">of {effectiveEnterpriseUserTotalPages}</span>
                      </form>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEnterpriseUserPage((prev) => Math.min(effectiveEnterpriseUserTotalPages, prev + 1))}
                        disabled={enterpriseUserPage === effectiveEnterpriseUserTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="ui-empty-state">
                  <p>
                    {enterpriseUsersStatus === "loading"
                      ? "Loading accounts..."
                      : normalizeSearchQuery(enterpriseUserSearchQuery)
                        ? `No accounts match "${enterpriseUserSearchQuery.trim()}".`
                        : "No accounts found in this enterprise."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
