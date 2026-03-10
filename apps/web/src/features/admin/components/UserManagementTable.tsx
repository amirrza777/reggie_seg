"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Table } from "@/shared/ui/Table";
import type { AdminUser, AdminUserRecord, UserRole } from "../types";
import { searchUsers, updateUser, updateUserRole } from "../api/client";

type RequestState = "idle" | "loading" | "success" | "error";

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

const USERS_PER_PAGE = 10;

export function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [tableStatus, setTableStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestRequestId = useRef(0);

  const loadUsers = useCallback(async (query: string, page: number) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setTableStatus("loading");

    try {
      const response = await searchUsers({
        q: query.trim() || undefined,
        page,
        pageSize: USERS_PER_PAGE,
      });
      if (latestRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }

      setUsers(response.items.map(normalizeUser));
      setTotalUsers(response.total);
      setTotalPages(response.totalPages);
      setTableStatus("success");
    } catch (err) {
      if (latestRequestId.current !== requestId) return;
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(0);
      setTableStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load users.");
    }
  }, []);

  useEffect(() => {
    void loadUsers(searchQuery, currentPage);
  }, [searchQuery, currentPage, loadUsers]);

  const setUserRow = (userId: number, update: (user: AdminUser) => AdminUser) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  };

  const handleRoleChange = async (userId: number, role: UserRole) => {
    const previous = users.map((u) => ({ ...u }));
    setStatus("loading");
    setMessage(null);
    setUserRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" }));
    try {
      const updated = await updateUserRole(userId, role);
      setUserRow(userId, () => normalizeUser(updated));
      setStatus("success");
      setMessage(`Updated role to ${role.toLowerCase()} for ${previous.find((u) => u.id === userId)?.email ?? "user"}.`);
      void loadUsers(searchQuery, currentPage);
    } catch (err) {
      setUsers(previous);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not update role.");
    }
  };

  const handleStatusToggle = async (userId: number, nextStatus: boolean) => {
    const previous = users.map((u) => ({ ...u }));
    setStatus("loading");
    setMessage(null);
    setUserRow(userId, (user) => ({ ...user, active: nextStatus }));
    try {
      const updated = await updateUser(userId, { active: nextStatus });
      setUserRow(userId, () => normalizeUser(updated));
      setStatus("success");
      setMessage(nextStatus ? "Account activated." : "Account suspended.");
      void loadUsers(searchQuery, currentPage);
    } catch (err) {
      setUsers(previous);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not update account status.");
    }
  };

  const normalizedSearch = normalizeSearchQuery(searchQuery);
  const effectiveTotalPages = Math.max(1, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const pageStart = totalUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const pageEnd = totalUsers === 0 ? 0 : Math.min((currentPage - 1) * USERS_PER_PAGE + users.length, totalUsers);

  const applyPageInput = (value: string) => {
    const parsedPage = Number(value);
    const isValidPage = Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= effectiveTotalPages;
    if (!isValidPage) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  };

  const handlePageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  };

  const rows = users.map((user) => {
    const statusClass = user.active ? "status-chip status-chip--success" : "status-chip status-chip--danger";
    const statusLabel = user.active ? "Active" : "Suspended";
    const isAdmin = user.role === "ADMIN";
    const isEnterpriseAdmin = user.role === "ENTERPRISE_ADMIN";
    const roleLabel =
      isAdmin
        ? "Admin"
        : isEnterpriseAdmin
          ? "Enterprise admin"
          : user.role === "STAFF"
            ? "Staff"
            : "Student";
    const isSuperAdmin = user.email.toLowerCase() === "admin@kcl.ac.uk";

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
          onClick={() => handleRoleChange(user.id, "STUDENT")}
          disabled={status === "loading" || user.role === "STUDENT"}
        >
          Student
        </Button>
        <Button
          type="button"
          variant={user.role === "STAFF" ? "primary" : "ghost"}
          className="user-management__role-toggle-btn"
          onClick={() => handleRoleChange(user.id, "STAFF")}
          disabled={status === "loading" || user.role === "STAFF"}
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
          onClick={() => handleStatusToggle(user.id, !user.active)}
          className={statusClass}
        >
          <span>{user.active ? "●" : "○"}</span>
          <span>{statusLabel}</span>
        </button>
      ),
    ];
  });

  return (
    <Card
      title="User accounts"
      className="user-management-card"
      action={
        <div className="ui-row user-management__actions">
          <FormField
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="user-management__search"
            placeholder="Search by name, email, role, status, or ID"
            aria-label="Search user accounts"
          />
        </div>
      }
    >
      {message ? (
        <div
          className={`${status === "error" || tableStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"} status-alert--spaced`}
        >
          <span>{message}</span>
        </div>
      ) : null}
      <div className="user-management__toolbar">
        <span className="ui-note ui-note--muted">
          {tableStatus === "loading" && totalUsers === 0
            ? "Loading accounts..."
            : totalUsers === 0
              ? "Showing 0 accounts."
              : `Showing ${pageStart}-${pageEnd} of ${totalUsers} account${totalUsers === 1 ? "" : "s"}.`}
        </span>
      </div>
      {rows.length > 0 ? (
        <>
          <Table
            headers={["Email", "Name", "Role", "Account status"]}
            rows={rows}
            rowClassName="user-management__row"
          />
          {totalPages > 1 ? (
            <div className="user-management__pagination" aria-label="User accounts pagination">
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
                <label htmlFor="user-management-page-input" className="user-management__page-jump-label">
                  Page
                </label>
                <FormField
                  id="user-management-page-input"
                  type="number"
                  min={1}
                  max={effectiveTotalPages}
                  step={1}
                  inputMode="numeric"
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={() => applyPageInput(pageInput)}
                  className="user-management__page-jump-input"
                  aria-label="Go to page number"
                />
                <span className="muted user-management__page-total">of {effectiveTotalPages}</span>
              </form>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(effectiveTotalPages, prev + 1))}
                disabled={currentPage === effectiveTotalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="ui-empty-state">
          <p>
            {tableStatus === "loading"
              ? "Loading user accounts..."
              : normalizedSearch
                ? `No user accounts match "${searchQuery.trim()}".`
                : "No user accounts found."}
          </p>
        </div>
      )}
    </Card>
  );
}
