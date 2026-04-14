"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import type { EnterpriseManagedUser, EnterpriseManagedUserRecord } from "../types";

export type RequestState = "idle" | "loading" | "success" | "error";
export type EnterpriseUserSortValue = "default" | "joinDateDesc" | "joinDateAsc" | "nameAsc" | "nameDesc";
export type EnterpriseUserCreateRole = "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN";

export const USERS_PER_PAGE = 10;
export const DEFAULT_ENTERPRISE_USER_SORT_VALUE: EnterpriseUserSortValue = "default";
export const ENTERPRISE_USER_SORT_OPTIONS: ReadonlyArray<{ value: EnterpriseUserSortValue; label: string }> = [
  { value: "default", label: "Default order" },
  { value: "joinDateDesc", label: "Join date (newest first)" },
  { value: "joinDateAsc", label: "Join date (oldest first)" },
  { value: "nameAsc", label: "Name (A-Z)" },
  { value: "nameDesc", label: "Name (Z-A)" },
];
const CREATE_ROLE_OPTIONS: ReadonlyArray<{ value: EnterpriseUserCreateRole; label: string }> = [
  { value: "STUDENT", label: "Student" },
  { value: "STAFF", label: "Staff" },
  { value: "ENTERPRISE_ADMIN", label: "Enterprise admin" },
];
const ENTERPRISE_ADMIN_EMAIL_BEST_PRACTICE =
  "Best practice: use a separate email that is not already attached to this or any other enterprise account, and consult the intended user first.";

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

type EnterpriseOptionSelectProps<TValue extends string> = {
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  ariaLabel: string;
  onChange: (value: TValue) => void;
  className?: string;
  triggerClassName?: string;
};

export function EnterpriseOptionSelect<TValue extends string>({
  value,
  options,
  ariaLabel,
  onChange,
  className,
  triggerClassName,
}: EnterpriseOptionSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`enterprise-management__selector ${className ?? ""}`.trim()}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={`enterprise-management__selector-trigger ${triggerClassName ?? ""}`.trim()}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="enterprise-management__selector-trigger-text">{selected?.label ?? ""}</span>
        <span className={`enterprise-management__selector-caret${isOpen ? " is-open" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="enterprise-management__selector-caret-icon" focusable="false">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {isOpen ? (
        <div id={menuId} role="listbox" aria-label={ariaLabel} className="enterprise-management__selector-menu">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`enterprise-management__selector-option${isSelected ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type EnterpriseUserCreateFormProps = {
  createEmail: string;
  createFirstName: string;
  createLastName: string;
  createRole: EnterpriseUserCreateRole;
  createStatus: RequestState;
  createMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreateEmailChange: (value: string) => void;
  onCreateFirstNameChange: (value: string) => void;
  onCreateLastNameChange: (value: string) => void;
  onCreateRoleChange: (value: EnterpriseUserCreateRole) => void;
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
      <form className="enterprise-users__create-form ui-toolbar" onSubmit={onSubmit} noValidate>
        <input
          className="input enterprise-users__create-input"
          type="email"
          value={createEmail}
          onChange={(event) => onCreateEmailChange(event.target.value)}
          placeholder="new.user@enterprise.com"
          aria-label="New account email"
          autoComplete="off"
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
        <EnterpriseOptionSelect
          value={createRole}
          options={CREATE_ROLE_OPTIONS}
          ariaLabel="New account role"
          onChange={onCreateRoleChange}
          className="enterprise-management__modal-sort"
        />
        <Button type="submit" disabled={createStatus === "loading"}>
          {createStatus === "loading" ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="ui-note ui-note--muted">
        Student, staff, and enterprise admin accounts can be created here. New accounts receive a password setup email.
      </p>
      <div className="enterprise-users__create-guidance">
        <span className="ui-note ui-note--muted">Enterprise admin email guidance</span>
        <details className="enterprise-management__info-popover">
          <summary
            className="enterprise-management__info-popover-trigger"
            aria-label="Enterprise admin email best-practice guidance"
            title="View enterprise admin email best-practice guidance"
          >
            i
          </summary>
          <p className="enterprise-management__info-popover-content ui-note ui-note--muted">
            {ENTERPRISE_ADMIN_EMAIL_BEST_PRACTICE}
          </p>
        </details>
      </div>
      {createMessage ? (
        <div className={createStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}>
          <span>{createMessage}</span>
        </div>
      ) : null}
    </>
  );
}
