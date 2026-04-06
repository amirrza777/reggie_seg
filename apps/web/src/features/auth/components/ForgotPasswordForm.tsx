'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { requestPasswordReset } from "../api/client";
import { AuthField } from "./AuthField";

type ForgotPasswordStatus = "idle" | "loading" | "error" | "success";

function getForgotPasswordAlertClass(status: ForgotPasswordStatus) {
  return status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
}

function ForgotPasswordSuccess({ alertClass, message }: { alertClass: string; message: string | null }) {
  return (
    <div className="auth-form auth-center">
      <div className={`${alertClass} auth-alert auth-alert--spacious`}>{message}</div>
      <Link href="/login" className="auth-link-reset">
        <Button className="auth-button">Back to Log in</Button>
      </Link>
    </div>
  );
}

function ForgotPasswordFields({
  email,
  status,
  message,
  alertClass,
  onSubmit,
  onEmailChange,
}: {
  email: string;
  status: ForgotPasswordStatus;
  message: string | null;
  alertClass: string;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  onEmailChange: (value: string) => void;
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {message ? <div className={`${alertClass} auth-alert`}><span>{message}</span></div> : null}
      <AuthField name="email" label="Email" type="email" value={email} required placeholder="Enter your email" onChange={(_, value) => onEmailChange(value)} />
      <Button type="submit" disabled={status === "loading"} className="auth-button auth-button--spaced">
        {status === "loading" ? "Sending..." : "Send Reset Link"}
      </Button>
      <div className="auth-meta">
        <Link href="/login" className="auth-link auth-link--subtle">← Back to Log in</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ForgotPasswordStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
  const alertClass = getForgotPasswordAlertClass(status);

  if (status === "success") {
    return <ForgotPasswordSuccess alertClass={alertClass} message={message} />;
  }

  return <ForgotPasswordFields email={email} status={status} message={message} alertClass={alertClass} onSubmit={handleSubmit} onEmailChange={setEmail} />;
}
