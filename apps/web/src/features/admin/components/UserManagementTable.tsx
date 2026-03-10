"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { filterBySearchQuery, normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Table } from "@/shared/ui/Table";
import type { AdminUser, AdminUserRecord, UserRole } from "../types";
import { listUsers, updateUser, updateUserRole } from "../api/client";

const demoUsers: AdminUser[] = [
  {
    id: 1,
    email: "admin@kcl.ac.uk",
    firstName: "Admin",
    lastName: "User",
    isStaff: true,
    role: "ADMIN",
    active: true,
  },
  {
    id: 2,
    email: "michael.kolling@kcl.ac.uk",
    firstName: "Michael",
    lastName: "Kölling",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
  {
    id: 3,
    email: "tunjay.seyidali@kcl.ac.uk",
    firstName: "Tunjay",
    lastName: "Seyidali",
    isStaff: false,
    role: "STUDENT",
    active: true,
  },
];

type RequestState = "idle" | "loading" | "success" | "error";

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

const USERS_PER_PAGE = 10;

export function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>(demoUsers);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    let subscribed = true;
    const fetchUsers = async () => {
      try {
        const response = await listUsers();
        if (subscribed && response.length > 0) {
          setUsers(response.map(normalizeUser));
        }
      } catch {
        if (subscribed) {
          setStatus("error");
          setMessage("Using demo users while the admin API responds.");
        }
      }
    };
    fetchUsers();
    return () => {
      subscribed = false;
    };
  }, []);

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
    } catch (err) {
      setUsers(previous);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not update account status.");
    }
  };

  const refreshUsers = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const response = await listUsers();
      if (response.length > 0) {
        setUsers(response.map(normalizeUser));
      }
      setStatus("success");
      setMessage("User directory refreshed.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not refresh users.");
    }
  };

  const filteredUsers = useMemo(
    () =>
      filterBySearchQuery(users, searchQuery, {
        fields: ["id", "email", "firstName", "lastName", "role"],
        selectors: [
          (user) => `${user.firstName} ${user.lastName}`,
          (user) => (user.active ? "active" : "suspended"),
          (user) =>
            user.role === "ADMIN"
              ? "admin"
              : user.role === "ENTERPRISE_ADMIN"
                ? "enterprise admin"
                : user.role === "STAFF"
                  ? "staff"
                  : "student",
        ],
      }),
    [users, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const normalizedSearch = normalizeSearchQuery(searchQuery);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const pageStart = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + USERS_PER_PAGE);
  const pageEnd = Math.min(pageStart + USERS_PER_PAGE, filteredUsers.length);

  const applyPageInput = (value: string) => {
    const parsedPage = Number(value);
    const isValidPage = Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= totalPages;
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

  const rows = paginatedUsers.map((user) => {
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
      <div className="role-toggle">
        <Button
          type="button"
          variant={user.role === "STUDENT" ? "primary" : "ghost"}
          className="role-toggle__btn"
          onClick={() => handleRoleChange(user.id, "STUDENT")}
          disabled={status === "loading" || user.role === "STUDENT"}
        >
          Student
        </Button>
        <Button
          type="button"
          variant={user.role === "STAFF" ? "primary" : "ghost"}
          className="role-toggle__btn"
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
          <Button type="button" variant="ghost" onClick={refreshUsers} disabled={status === "loading"}>
            Refresh
          </Button>
        </div>
      }
    >
      {message ? (
        <div
          className={`${status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"} status-alert--spaced`}
        >
          <span>{message}</span>
        </div>
      ) : null}
      <div className="user-management__toolbar">
        <span className="ui-note ui-note--muted">
          {filteredUsers.length === 0
            ? `Showing 0 of ${users.length} account${users.length === 1 ? "" : "s"}.`
            : `Showing ${pageStart + 1}-${pageEnd} of ${filteredUsers.length} account${
                filteredUsers.length === 1 ? "" : "s"
              }${filteredUsers.length !== users.length ? ` (filtered from ${users.length})` : ""}.`}
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
                  max={totalPages}
                  step={1}
                  inputMode="numeric"
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={() => applyPageInput(pageInput)}
                  className="user-management__page-jump-input"
                  aria-label="Go to page number"
                />
                <span className="muted user-management__page-total">of {totalPages}</span>
              </form>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="ui-empty-state">
          <p>
            {normalizedSearch
              ? `No user accounts match "${searchQuery.trim()}".`
              : "No user accounts found."}
          </p>
        </div>
      )}
    </Card>
  );
}
