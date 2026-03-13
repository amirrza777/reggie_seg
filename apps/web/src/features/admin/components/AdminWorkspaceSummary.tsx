"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import type { AdminUser, AdminUserRecord, UserRole, AdminSummary } from "../types";
import { listUsers, updateUserRole, getAdminSummary } from "../api/client";
import { AuditLogModal } from "./AuditLogModal";

const demoStaff: AdminUser[] = [
  {
    id: 7,
    email: "staff.lead@example.com",
    firstName: "Arun",
    lastName: "Dijkstra",
    isStaff: true,
    role: "ADMIN",
    active: true,
  },
  {
    id: 6,
    email: "staff.member@example.com",
    firstName: "Anastasiya",
    lastName: "Ojo",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
  {
    id: 2,
    email: "staff.ops@example.com",
    firstName: "Jane",
    lastName: "Okon",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
];

type RequestState = "idle" | "loading" | "success" | "error";

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

const isStaffAccount = (user: AdminUser) => user.role !== "STUDENT" && (user.isStaff || user.role === "ADMIN");

export function AdminWorkspaceSummary() {
  const [modalOpen, setModalOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<number, RequestState>>({});
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<RequestState>("idle");

  const staffDirectory = useMemo(() => staff.filter(isStaffAccount), [staff]);

  const setStaffRow = (userId: number, update: (user: AdminUser) => AdminUser) => {
    setStaff((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  };

  const loadStaff = useCallback(async () => {
    setStatus("loading");
    setNotice(null);

    try {
      const response = await listUsers();
      const normalized = response.map(normalizeUser).filter(isStaffAccount);
      if (normalized.length === 0) {
        setNotice("No staff accounts yet. Mark a user as Staff to manage admin access here.");
      }
      setStaff(normalized);
      setStatus("success");
    } catch (err) {
      const fallback = demoStaff;
      setStaff(fallback);
      setStatus("error");
      setNotice(err instanceof Error ? err.message : "Unable to load staff. Showing sample data.");
    }
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    loadStaff();
  }, [modalOpen, loadStaff]);

  useEffect(() => {
    const loadSummary = async () => {
      setSummaryStatus("loading");
      try {
        const data = await getAdminSummary();
        setSummary(data);
        setSummaryStatus("success");
      } catch (err) {
        setSummaryStatus("error");
        setNotice((err as Error)?.message ?? "Unable to load admin summary.");
      }
    };
    loadSummary();
  }, []);

  const changeRole = async (userId: number, role: UserRole) => {
    const previous = staff.map((user) => ({ ...user }));
    setActionStatus((state) => ({ ...state, [userId]: "loading" }));
    setNotice(null);
    setStaffRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" ? true : user.isStaff }));

    try {
      const updated = await updateUserRole(userId, role);
      setStaffRow(userId, () => normalizeUser(updated));
      setStatus("success");
      setNotice(role === "ADMIN" ? "Admin access granted." : "Admin access removed.");
    } catch (err) {
      setStaff(previous);
      setStatus("error");
      setNotice(err instanceof Error ? err.message : "Could not update admin role.");
    } finally {
      setActionStatus((state) => ({ ...state, [userId]: "idle" }));
    }
  };

  return (
    <>
      <Card
        title={<span className="overview-title">Admin workspace</span>}
        action={
          <div className="ui-row ui-row--wrap">
            <Button type="button" onClick={() => setModalOpen(true)}>
              Invite admin
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAuditOpen(true)}>
              Audit log
            </Button>
          </div>
        }
      >
        <div className="ui-grid-metrics">
          {[
            { label: "Users", value: summary?.users },
            { label: "Modules", value: summary?.modules },
            { label: "Teams", value: summary?.teams },
            { label: "Meetings", value: summary?.meetings },
          ].map((item) => (
            <div key={item.label} className="ui-metric-card">
              <span className="eyebrow">{item.label}</span>
              <strong className="ui-metric-value">
                {item.value ?? (summaryStatus === "loading" ? "…" : 0)}
              </strong>
            </div>
          ))}
        </div>
      </Card>

      {modalOpen ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-admin-title"
          onClick={() => setModalOpen(false)}
        >
          <div className="modal__dialog admin-modal ui-content-width" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="invite-admin-title">
                  Invite admin
                </h3>
                <p className="muted">
                  Select a staff member to grant or revoke admin privileges.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="modal__close-btn"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </Button>
            </div>

            <div className="modal__body admin-modal__body">
              <div className="ui-toolbar">
                <span className="ui-note ui-note--muted">
                  {status === "loading"
                    ? "Loading staff directory..."
                    : `Showing ${staffDirectory.length} staff ${staffDirectory.length === 1 ? "account" : "accounts"}.`}
                </span>
              </div>

              {notice ? (
                <div
                  className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
                >
                  <span>{notice}</span>
                </div>
              ) : null}

              <div className="table admin-modal__list">
                <div className="table__head admin-modal__head">
                  <div>Email</div>
                  <div>Name</div>
                  <div className="ui-inline-end">Actions</div>
                </div>
                <div className="admin-modal__table" role="presentation">
                  {staffDirectory.length === 0 ? (
                    <div className="table__row admin-modal__row">
                      <div className="muted admin-modal__full-span">
                        No staff accounts found. Promote a user to Staff to manage admin access here.
                      </div>
                    </div>
                  ) : (
                    staffDirectory.map((user) => {
                      const isAdmin = user.role === "ADMIN";
                      const busy = actionStatus[user.id] === "loading";
                      return (
                        <div
                          key={user.id}
                          className="table__row admin-modal__row"
                        >
                          <div className="ui-stack-xs">
                            <strong>{user.email}</strong>
                            <span className="muted">{isAdmin ? "Admin" : "Staff"}</span>
                          </div>
                          <div className="ui-stack-xs">
                            <span>{`${user.firstName} ${user.lastName}`}</span>
                            <span className="muted">ID {user.id}</span>
                          </div>
                          <div className="admin-modal__actions">
                            <Button
                              type="button"
                              variant={isAdmin ? "primary" : "ghost"}
                              onClick={() => changeRole(user.id, isAdmin ? "STAFF" : "ADMIN")}
                              disabled={busy}
                              className={`admin-toggle ${isAdmin ? "admin-toggle--remove" : "admin-toggle--make"}`}
                            >
                              {isAdmin ? "Remove admin" : "Make admin"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}

      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
}
