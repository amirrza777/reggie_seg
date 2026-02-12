'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { requestPasswordReset } from "../api/client";
import { AuthField } from "./AuthField";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setStatus("success");
      setMessage("If an account exists, a reset link has been sent.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send reset email");
    }
  };

  const alertClass =
    status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <div className={alertClass} style={{ padding: 16, marginBottom: 24, fontSize: 14 }}>
          ✅ {message}
        </div>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <Button style={{ width: "100%" }}>Back to Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form style={{ width: "100%" }} onSubmit={handleSubmit}>
      {message ? (
        <div className={alertClass} style={{ padding: "10px 12px", marginBottom: 12, fontSize: 14 }}>
          <span>⚠️</span>
          <span>{message}</span>
        </div>
      ) : null}

      <AuthField
        name="email"
        label="Email"
        type="email"
        value={email}
        required
        placeholder="Enter your email"
        onChange={(_, val) => setEmail(val)}
      />

      <Button type="submit" disabled={status === "loading"} style={{ width: "100%", marginTop: 8 }}>
        {status === "loading" ? "Sending..." : "Send Reset Link"}
      </Button>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/login" className="auth-link auth-link--subtle">
          ← Back to Log in
        </Link>
      </div>
    </form>
  );
}
