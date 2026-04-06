import { Button } from "@/shared/ui/Button";
import type { AdminUser, EnterpriseRecord, UserRole } from "../types";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";

type BuildEnterpriseRowsInput = {
  enterprises: EnterpriseRecord[];
  deleteState: Record<string, boolean>;
  onOpenAccounts: (enterprise: EnterpriseRecord) => void;
  onRequestDelete: (enterprise: EnterpriseRecord) => void;
  formatDate: (value: string) => string;
};

type BuildEnterpriseUserRowsInput = {
  users: AdminUser[];
  actionState: Record<number, "idle" | "loading" | "success" | "error">;
  onRoleChange: (userId: number, role: UserRole) => void;
  onStatusToggle: (userId: number, nextStatus: boolean) => void;
};

function renderEnterpriseNameCell(enterprise: EnterpriseRecord) {
  return (
    <div key={`${enterprise.id}-name`} className="ui-stack-xs">
      <strong>{enterprise.name}</strong>
      <span className="muted">Code: {enterprise.code}</span>
    </div>
  );
}

function renderEnterpriseAccountsCell(enterprise: EnterpriseRecord) {
  return (
    <div key={`${enterprise.id}-accounts`} className="ui-stack-xs">
      <span>{enterprise.users} accounts</span>
      <span className="muted">{enterprise.admins} admins, {enterprise.enterpriseAdmins} enterprise admins, {enterprise.staff} staff, {enterprise.students} students</span>
    </div>
  );
}

function renderEnterpriseWorkspaceCell(enterprise: EnterpriseRecord) {
  return (
    <div key={`${enterprise.id}-workspace`} className="ui-stack-xs">
      <span>{enterprise.modules} modules</span>
      <span className="muted">{enterprise.teams} teams</span>
    </div>
  );
}

function renderEnterpriseActionsCell(enterprise: EnterpriseRecord, input: BuildEnterpriseRowsInput) {
  return (
    <div key={`${enterprise.id}-actions`} className="enterprise-management__row-actions">
      <Button type="button" variant="ghost" onClick={() => input.onOpenAccounts(enterprise)}>
        Manage accounts
      </Button>
      <Button type="button" variant="danger" onClick={() => input.onRequestDelete(enterprise)} disabled={input.deleteState[enterprise.id] === true}>
        Delete
      </Button>
    </div>
  );
}

function buildEnterpriseRow(enterprise: EnterpriseRecord, input: BuildEnterpriseRowsInput) {
  return [
    renderEnterpriseNameCell(enterprise),
    renderEnterpriseAccountsCell(enterprise),
    renderEnterpriseWorkspaceCell(enterprise),
    <span key={`${enterprise.id}-created`}>{input.formatDate(enterprise.createdAt)}</span>,
    renderEnterpriseActionsCell(enterprise, input),
  ];
}

export function buildEnterpriseRows(input: BuildEnterpriseRowsInput) {
  return input.enterprises.map((enterprise) => buildEnterpriseRow(enterprise, input));
}

function resolveRoleLabel(role: UserRole): string {
  if (role === "ADMIN") {
    return "Admin";
  }
  if (role === "ENTERPRISE_ADMIN") {
    return "Enterprise admin";
  }
  return role === "STAFF" ? "Staff" : "Student";
}

function renderRoleControl(props: {
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

function renderStatusControl(user: AdminUser, busy: boolean, onStatusToggle: BuildEnterpriseUserRowsInput["onStatusToggle"]) {
  const statusClass = user.active ? "status-chip status-chip--success" : "status-chip status-chip--danger";
  const statusLabel = user.active ? "Active" : "Suspended";
  if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return (
      <span key={`${user.id}-status`} className={`${statusClass} status-chip--disabled`}>
        <span>●</span>
        <span>Active</span>
      </span>
    );
  }
  return (
    <button key={`${user.id}-status`} className={statusClass} onClick={() => onStatusToggle(user.id, !user.active)} disabled={busy}>
      <span>{user.active ? "●" : "○"}</span>
      <span>{statusLabel}</span>
    </button>
  );
}

function buildEnterpriseUserRow(user: AdminUser, input: BuildEnterpriseUserRowsInput) {
  const busy = input.actionState[user.id] === "loading";
  return [
    <div key={`${user.id}-email`} className="ui-stack-xs">
      <strong>{user.email}</strong>
      <span className="muted">{resolveRoleLabel(user.role)}</span>
    </div>,
    <div key={`${user.id}-name`} className="ui-stack-xs">
      <span>{`${user.firstName} ${user.lastName}`}</span>
      <span className="muted">ID {user.id}</span>
    </div>,
    <div key={`${user.id}-role`} className="ui-row ui-row--start">
      {renderRoleControl({ userId: user.id, role: user.role, busy, onRoleChange: input.onRoleChange })}
    </div>,
    renderStatusControl(user, busy, input.onStatusToggle),
  ];
}

export function buildEnterpriseUserRows(input: BuildEnterpriseUserRowsInput) {
  return input.users.map((user) => buildEnterpriseUserRow(user, input));
}
