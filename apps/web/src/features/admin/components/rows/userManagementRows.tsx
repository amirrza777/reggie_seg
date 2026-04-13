import { Button } from "@/shared/ui/Button";
import { RowActionMenu } from "./RowActionMenu";
import type { AdminUser, UserRole } from "../../types";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";
const UNASSIGNED_ENTERPRISE_CODE = "UNASSIGNED";

type BuildUserManagementRowsInput = {
  users: AdminUser[];
  busy: boolean;
  onRoleChange: (userId: number, role: UserRole) => void;
  onStatusToggle: (userId: number, nextStatus: boolean) => void;
  onRequestRemoveUser: (userId: number) => void;
};

function resolveEnterpriseLabel(user: AdminUser): string {
  const name = user.enterprise?.name?.trim();
  const code = user.enterprise?.code?.trim();
  if (code?.toUpperCase() === UNASSIGNED_ENTERPRISE_CODE) {
    return "Unassigned";
  }
  if (name) {
    return name;
  }
  if (code) {
    return code;
  }
  return "Unknown enterprise";
}

function renderUserRoleControl(props: {
  userId: number;
  role: UserRole;
  busy: boolean;
  onRoleChange: (userId: number, role: UserRole) => void;
}) {
  if (props.role === "ADMIN") {
    return <span className="role-chip">Admin</span>;
  }
  if (props.role === "ENTERPRISE_ADMIN") {
    return <span className="role-chip role-chip--locked">Enterprise admin</span>;
  }
  return (
    <div className="user-management__role-toggle">
      <Button type="button" variant={props.role === "STUDENT" ? "primary" : "ghost"} className="user-management__role-toggle-btn" onClick={() => props.onRoleChange(props.userId, "STUDENT")} disabled={props.busy || props.role === "STUDENT"}>
        Student
      </Button>
      <Button type="button" variant={props.role === "STAFF" ? "primary" : "ghost"} className="user-management__role-toggle-btn" onClick={() => props.onRoleChange(props.userId, "STAFF")} disabled={props.busy || props.role === "STAFF"}>
        Staff
      </Button>
    </div>
  );
}

function renderUserStatusControl(props: {
  user: AdminUser;
  onStatusToggle: (userId: number, nextStatus: boolean) => void;
}) {
  const statusClass = props.user.active ? "status-chip status-chip--success" : "status-chip status-chip--danger";
  const statusLabel = props.user.active ? "Active" : "Suspended";
  if (props.user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return (
      <span key={`${props.user.id}-status`} className={`${statusClass} status-chip--disabled`}>
        <span>●</span>
        <span>Active</span>
      </span>
    );
  }
  return (
    <button key={`${props.user.id}-status`} onClick={() => props.onStatusToggle(props.user.id, !props.user.active)} className={statusClass}>
      <span>{props.user.active ? "●" : "○"}</span>
      <span>{statusLabel}</span>
    </button>
  );
}

function buildUserManagementRow(user: AdminUser, input: BuildUserManagementRowsInput) {
  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  return [
    <div key={`${user.id}-email`} className="ui-stack-xs">
      <strong>{user.email}</strong>
      <span className="muted">{resolveEnterpriseLabel(user)}</span>
    </div>,
    <div key={`${user.id}-name`} className="ui-stack-xs">
      <span>{`${user.firstName} ${user.lastName}`}</span>
      <span className="muted">ID {user.id}</span>
    </div>,
    <div key={`${user.id}-role`} className="ui-row ui-row--start">
      {renderUserRoleControl({ userId: user.id, role: user.role, busy: input.busy, onRoleChange: input.onRoleChange })}
    </div>,
    renderUserStatusControl({ user, onStatusToggle: input.onStatusToggle }),
    <div key={`${user.id}-actions`} className="enterprise-management__row-actions">
      {isSuperAdmin ? null : (
        <RowActionMenu
          userId={user.id}
          userEmail={user.email}
          busy={input.busy}
          active={user.active}
          removeLabel="Delete account"
          onRemove={input.onRequestRemoveUser}
          onReinstate={(id) => input.onStatusToggle(id, true)}
        />
      )}
    </div>,
  ];
}

export function buildUserManagementRows(input: BuildUserManagementRowsInput) {
  return input.users.map((user) => buildUserManagementRow(user, input));
}
