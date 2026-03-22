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

export function buildEnterpriseRows({
  enterprises,
  deleteState,
  onOpenAccounts,
  onRequestDelete,
  formatDate,
}: BuildEnterpriseRowsInput) {
  return enterprises.map((enterprise) => [
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
      <Button type="button" variant="ghost" onClick={() => onOpenAccounts(enterprise)}>
        Manage accounts
      </Button>
      <Button
        type="button"
        variant="danger"
        onClick={() => onRequestDelete(enterprise)}
        disabled={deleteState[enterprise.id] === true}
      >
        Delete
      </Button>
    </div>,
  ]);
}

export function buildEnterpriseUserRows({
  users,
  actionState,
  onRoleChange,
  onStatusToggle,
}: BuildEnterpriseUserRowsInput) {
  return users.map((user) => {
    const isAdmin = user.role === "ADMIN";
    const isEnterpriseAdmin = user.role === "ENTERPRISE_ADMIN";
    const isSuperAdminAccount = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
    const busy = actionState[user.id] === "loading";
    const roleLabel = resolveRoleLabel(user.role, isAdmin, isEnterpriseAdmin);
    const statusClass = user.active ? "status-chip status-chip--success" : "status-chip status-chip--danger";
    const statusLabel = user.active ? "Active" : "Suspended";

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
        {renderRoleControl(user.id, user.role, isAdmin, isEnterpriseAdmin, busy, onRoleChange)}
      </div>,
      isSuperAdminAccount ? (
        <span key={`${user.id}-status`} className={`${statusClass} status-chip--disabled`}>
          <span>●</span>
          <span>Active</span>
        </span>
      ) : (
        <button
          key={`${user.id}-status`}
          className={statusClass}
          onClick={() => onStatusToggle(user.id, !user.active)}
          disabled={busy}
        >
          <span>{user.active ? "●" : "○"}</span>
          <span>{statusLabel}</span>
        </button>
      ),
    ];
  });
}

function resolveRoleLabel(role: UserRole, isAdmin: boolean, isEnterpriseAdmin: boolean): string {
  if (isAdmin) return "Admin";
  if (isEnterpriseAdmin) return "Enterprise admin";
  return role === "STAFF" ? "Staff" : "Student";
}

function renderRoleControl(
  userId: number,
  role: UserRole,
  isAdmin: boolean,
  isEnterpriseAdmin: boolean,
  busy: boolean,
  onRoleChange: (userId: number, role: UserRole) => void,
) {
  if (isAdmin) return <span className="role-chip">Admin</span>;
  if (isEnterpriseAdmin) return <span className="role-chip role-chip--locked">Enterprise admin</span>;

  return (
    <div className="user-management__role-toggle">
      <Button
        type="button"
        variant={role === "STUDENT" ? "primary" : "ghost"}
        className="user-management__role-toggle-btn"
        onClick={() => onRoleChange(userId, "STUDENT")}
        disabled={busy || role === "STUDENT"}
      >
        Student
      </Button>
      <Button
        type="button"
        variant={role === "STAFF" ? "primary" : "ghost"}
        className="user-management__role-toggle-btn"
        onClick={() => onRoleChange(userId, "STAFF")}
        disabled={busy || role === "STAFF"}
      >
        Staff
      </Button>
    </div>
  );
}
