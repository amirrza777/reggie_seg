'use client';

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
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

const statusStyles = {
  active: {
    backgroundColor: "rgba(47, 158, 68, 0.08)",
    border: "1px solid rgba(47, 158, 68, 0.35)",
    color: "#1f7a36",
  },
  suspended: {
    backgroundColor: "rgba(255, 77, 79, 0.08)",
    border: "1px solid rgba(255, 77, 79, 0.35)",
    color: "#a11a1c",
  },
};

const roleOptions: UserRole[] = ["STUDENT", "STAFF", "ADMIN"];

export function UserManagementTable() {
  const [users, setUsers] = useState<AdminUser[]>(demoUsers);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let subscribed = true;
    const fetchUsers = async () => {
      try {
        const response = await listUsers();
        if (subscribed && response.length > 0) {
          setUsers(response.map(normalizeUser));
        }
      } catch (_err) {
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

  const alertStyle =
    status === "error"
      ? {
          backgroundColor: "rgba(255, 77, 79, 0.08)",
          border: "1px solid rgba(255, 77, 79, 0.35)",
          color: "#a11a1c",
        }
      : {
          backgroundColor: "rgba(47, 158, 68, 0.08)",
          border: "1px solid rgba(47, 158, 68, 0.35)",
          color: "#1f7a36",
        };

  const rows = users.map((user) => {
    const statusStyle = user.active ? statusStyles.active : statusStyles.suspended;
    const statusLabel = user.active ? "Active" : "Suspended";
    return [
      <div key={`${user.id}-email`} className="stack" style={{ gap: 4 }}>
        <strong>{user.email}</strong>
        <span className="muted">{user.isStaff ? "Staff" : "Student"}</span>
      </div>,
      <div key={`${user.id}-name`} className="stack" style={{ gap: 4 }}>
        <span>{`${user.firstName} ${user.lastName}`}</span>
        <span className="muted">ID {user.id}</span>
      </div>,
      <select
        key={`${user.id}-role`}
        value={user.role}
        onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
        style={{ padding: "8px 10px", borderRadius: 10, borderColor: "var(--border)" }}
      >
        {roleOptions.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0) + option.slice(1).toLowerCase()}
          </option>
        ))}
      </select>,
      <button
        key={`${user.id}-status`}
        onClick={() => handleStatusToggle(user.id, !user.active)}
        style={{
          ...statusStyle,
          padding: "8px 12px",
          borderRadius: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 14 }}>{user.active ? "●" : "○"}</span>
        <span>{statusLabel}</span>
      </button>,
    ];
  });

  return (
    <Card
      title="User accounts"
      action={
        <Button type="button" variant="ghost" onClick={refreshUsers} disabled={status === "loading"}>
          Refresh
        </Button>
      }
    >
      {message ? (
        <div
          style={{
            ...alertStyle,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
          <span>{message}</span>
        </div>
      ) : null}
      <Table headers={["Email", "Name", "Role", "Account status"]} rows={rows} />
    </Card>
  );
}
