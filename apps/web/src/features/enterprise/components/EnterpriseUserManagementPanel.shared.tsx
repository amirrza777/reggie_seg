"use client";

import type { FormEvent } from "react";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import type { EnterpriseManagedUser, EnterpriseManagedUserRecord } from "../types";

export type RequestState = "idle" | "loading" | "success" | "error";
export type EnterpriseUserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";

export const USERS_PER_PAGE = 10;
export const DEFAULT_ENTERPRISE_USER_SORT_VALUE: EnterpriseUserSortValue = "default";

export function resolveEnterpriseUserSortParams(sortValue: EnterpriseUserSortValue) {
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

export function normalizeEnterpriseManagedUser(user: EnterpriseManagedUserRecord): EnterpriseManagedUser {
  const active = user.active ?? true;
  return {
    ...user,
    role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
    active,
    membershipStatus: user.membershipStatus ?? (active ? "active" : "inactive"),
  };
}

export function resolveEnterpriseMembershipStatusLabel(status: EnterpriseManagedUser["membershipStatus"]) {
  if (status === "left") {
    return "Left";
  }
  if (status === "inactive") {
    return "Inactive";
  }
  return "Active";
}

export function resolveEnterpriseUserMutationError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    const message = (error.message ?? "").trim();
    const normalizedMessage = message.toLowerCase();
    if (
      normalizedMessage.includes("enterprise admin accounts can only be managed by platform admins") ||
      normalizedMessage.includes("enterprise admin permissions are managed by invite flow")
    ) {
      return "Enterprise admin accounts are managed through platform-admin invite controls.";
    }
    if (normalizedMessage.includes("platform admin")) {
      return "Platform admin accounts cannot be managed from enterprise users.";
    }
    if (error.status === 403) {
      return "You do not have permission to manage this account.";
    }
    if (error.status === 404 && normalizedMessage.includes("user not found")) {
      return "This account is no longer available for this enterprise.";
    }
    if (error.status === 409 && normalizedMessage.includes("already used in another enterprise")) {
      return "This email is already used in another enterprise.";
    }
    if (message.length > 0) {
      return message;
    }
  }
  return error instanceof Error ? error.message : fallbackMessage;
}

export function UsersSummaryLabel({
  usersStatus,
  totalUsers,
  userStart,
  userEnd,
}: {
  usersStatus: RequestState;
  totalUsers: number;
  userStart: number;
  userEnd: number;
}) {
  if (usersStatus === "loading" && totalUsers === 0) {
    return "Loading accounts...";
  }
  if (totalUsers === 0) {
    return "Showing 0 accounts";
  }
  return `Showing ${userStart}-${userEnd} of ${totalUsers} account${totalUsers === 1 ? "" : "s"}`;
}

export function RoleControl({
  user,
  busy,
  onRoleChange,
}: {
  user: EnterpriseManagedUser;
  busy: boolean;
  onRoleChange: (role: "STUDENT" | "STAFF") => void;
}) {
  if (user.role === "ADMIN") {
    return <span className="role-chip">Admin</span>;
  }
  if (user.role === "ENTERPRISE_ADMIN") {
    return <span className="role-chip role-chip--locked">Enterprise admin</span>;
  }
  return (
    <div className="user-management__role-toggle">
      <Button
        type="button"
        variant={user.role === "STUDENT" ? "primary" : "ghost"}
        className="user-management__role-toggle-btn"
        onClick={() => onRoleChange("STUDENT")}
        disabled={busy || user.role === "STUDENT"}
      >
        Student
      </Button>
      <Button
        type="button"
        variant={user.role === "STAFF" ? "primary" : "ghost"}
        className="user-management__role-toggle-btn"
        onClick={() => onRoleChange("STAFF")}
        disabled={busy || user.role === "STAFF"}
      >
        Staff
      </Button>
    </div>
  );
}

type EnterpriseUserCreateFormProps = {
  createEmail: string;
  createFirstName: string;
  createLastName: string;
  createRole: "STUDENT" | "STAFF";
  createStatus: RequestState;
  createMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreateEmailChange: (value: string) => void;
  onCreateFirstNameChange: (value: string) => void;
  onCreateLastNameChange: (value: string) => void;
  onCreateRoleChange: (value: "STUDENT" | "STAFF") => void;
};

export function EnterpriseUserCreateForm({
  createEmail,
  createFirstName,
  createLastName,
  createRole,
  createStatus,
  createMessage,
  onSubmit,
  onCreateEmailChange,
  onCreateFirstNameChange,
  onCreateLastNameChange,
  onCreateRoleChange,
}: EnterpriseUserCreateFormProps) {
  return (
    <>
      <form className="enterprise-users__create-form ui-toolbar" onSubmit={onSubmit}>
        <input
          className="input enterprise-users__create-input"
          type="email"
          value={createEmail}
          onChange={(event) => onCreateEmailChange(event.target.value)}
          placeholder="new.user@enterprise.com"
          aria-label="New account email"
          required
        />
        <input
          className="input enterprise-users__create-input"
          type="text"
          value={createFirstName}
          onChange={(event) => onCreateFirstNameChange(event.target.value)}
          placeholder="First name"
          aria-label="New account first name"
        />
        <input
          className="input enterprise-users__create-input"
          type="text"
          value={createLastName}
          onChange={(event) => onCreateLastNameChange(event.target.value)}
          placeholder="Last name"
          aria-label="New account last name"
        />
        <select
          className="enterprise-management__modal-sort"
          value={createRole}
          onChange={(event) => onCreateRoleChange(event.target.value as "STUDENT" | "STAFF")}
          aria-label="New account role"
        >
          <option value="STUDENT">Student</option>
          <option value="STAFF">Staff</option>
        </select>
        <Button type="submit" disabled={createStatus === "loading"}>
          {createStatus === "loading" ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="ui-note ui-note--muted">
        Student and staff accounts can be created here. New accounts receive a password setup email. Enterprise admin
        access is managed through the invite flow.
      </p>
      {createMessage ? (
        <div className={createStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}>
          <span>{createMessage}</span>
        </div>
      ) : null}
    </>
  );
}
