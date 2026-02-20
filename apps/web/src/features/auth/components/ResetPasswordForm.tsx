'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { resetPassword } from "../api/client";
import { AuthField } from "./AuthField";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Reset token is missing.");
      return;
    }
    if (newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await resetPassword({ token, newPassword });
      setStatus("success");
      setMessage("Your password has been updated.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <div className="status-alert status-alert--error" style={{ padding: 16, marginBottom: 24, fontSize: 14 }}>
          Reset link is missing or invalid. Please request a new one.
        </div>
        <Link href="/forgot-password" style={{ textDecoration: "none" }}>
          <Button style={{ width: "100%" }}>Request New Link</Button>
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <div className="status-alert status-alert--success" style={{ padding: 16, marginBottom: 24, fontSize: 14 }}>
          {message}
        </div>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <Button style={{ width: "100%" }}>Back to Log in</Button>
        </Link>
      </div>
    );
  }

  const alertClass =
    status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";

  return (
    <form style={{ width: "100%" }} onSubmit={handleSubmit}>
      {message ? (
        <div className={alertClass} style={{ padding: "10px 12px", marginBottom: 12, fontSize: 14 }}>
          <span>⚠️</span>
          <span>{message}</span>
        </div>
      ) : null}

      <AuthField
        name="newPassword"
        label="New Password"
        type="password"
        value={newPassword}
        required
        minLength={8}
        placeholder="Enter a new password"
        onChange={(_, val) => setNewPassword(val)}
      />

      <AuthField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        required
        minLength={8}
        placeholder="Re-enter your new password"
        onChange={(_, val) => setConfirmPassword(val)}
      />

      <Button type="submit" disabled={status === "loading"} style={{ width: "100%", marginTop: 8 }}>
        {status === "loading" ? "Updating..." : "Reset Password"}
      </Button>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/login" className="auth-link auth-link--subtle">
          ← Back to Log in
        </Link>
      </div>
    </form>
  );
}
