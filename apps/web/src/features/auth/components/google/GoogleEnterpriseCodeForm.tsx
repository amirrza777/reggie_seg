'use client';

import { useState, type FormEvent } from "react";
import { AuthField } from "@/features/auth/components/AuthField";
import { Button } from "@/shared/ui/Button";
import { joinEnterpriseByCode, signup } from "@/features/auth/api/client";
import { ApiError } from "@/shared/api/errors";
import { clearPendingSignup, readPendingSignup } from "@/features/auth/pendingSignup";

type EnterCodeStatus = "idle" | "loading" | "success" | "error";
type EnterpriseCodeFormMode = "join" | "signup";

function StatusMessage({ status, message }: { status: EnterCodeStatus; message: string | null }) {
  if (!message) {
    return null;
  }
  const cls = status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
  return (
    <div className={`${cls} auth-alert`}>
      <span>{message}</span>
    </div>
  );
}

function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message || "Something went wrong. Please try again.";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export function GoogleEnterpriseCodeForm({ mode = "join" }: { mode?: EnterpriseCodeFormMode }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<EnterCodeStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const enterpriseCode = code.trim().toUpperCase();
      if (mode === "signup") {
        const pendingSignup = readPendingSignup();
        if (!pendingSignup) {
          throw new Error("Please start from the sign up page.");
        }
        await signup({
          enterpriseCode,
          email: pendingSignup.email,
          password: pendingSignup.password,
          firstName: pendingSignup.firstName,
          lastName: pendingSignup.lastName,
        });
        clearPendingSignup();
      } else {
        await joinEnterpriseByCode({ enterpriseCode });
      }
      setStatus("success");
      setMessage("Enterprise joined. Redirecting...");
      // Use a full navigation so server session checks run against the latest enterprise membership.
      window.location.assign("/app-home");
    } catch (err) {
      setStatus("error");
      setMessage(resolveErrorMessage(err));
    }
  }

  const isDisabled = status === "loading" || status === "success";

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <StatusMessage status={status} message={message} />
      <AuthField
        name="enterpriseCode"
        label="Enterprise code"
        type="text"
        value={code}
        required
        placeholder="e.g. UNI2026"
        onChange={(_name, value) => setCode(value.toUpperCase())}
      />
      <div className="auth-actions">
        <Button type="submit" className="auth-button" disabled={isDisabled}>
          {status === "loading" ? "Joining..." : "Join enterprise"}
        </Button>
      </div>
    </form>
  );
}