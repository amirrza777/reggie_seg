"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { resetPassword } from "../api/client";
import { AuthField } from "./AuthField";

type ResetPasswordStatus = "idle" | "loading" | "error" | "success";

function getResetPasswordAlertClass(status: ResetPasswordStatus) {
  return status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
}

function getResetPasswordValidationError(params: {
  token: string | null;
  newPassword: string;
  confirmPassword: string;
}) {
  if (!params.token) {
    return "Reset token is missing.";
  }
  if (params.newPassword.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (params.newPassword !== params.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

function MissingResetTokenView() {
  return (
    <div className="auth-reset-wrap auth-reset-wrap--center">
      <div className="status-alert status-alert--error auth-reset-alert">Reset link is missing or invalid. Please request a new one.</div>
      <Link href="/forgot-password" className="ui-link-reset">
        <Button className="full-width-btn">Request New Link</Button>
      </Link>
    </div>
  );
}

function PasswordResetSuccessView({ message }: { message: string | null }) {
  return (
    <div className="auth-reset-wrap auth-reset-wrap--center">
      <div className="status-alert status-alert--success auth-reset-alert">{message}</div>
      <Link href="/login" className="ui-link-reset">
        <Button className="full-width-btn">Back to Log in</Button>
      </Link>
    </div>
  );
}

type ResetPasswordFieldsProps = {
  message: string | null;
  alertClass: string;
  newPassword: string;
  confirmPassword: string;
  status: ResetPasswordStatus;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
};

type ResetPasswordSubmitParams = {
  token: string | null;
  newPassword: string;
  confirmPassword: string;
  setStatus: React.Dispatch<React.SetStateAction<ResetPasswordStatus>>;
  setMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

function ResetPasswordFields(props: ResetPasswordFieldsProps) {
  return (
    <form className="auth-reset-wrap" onSubmit={props.onSubmit}>
      {props.message ? <div className={`${props.alertClass} auth-reset-message`}>{props.message}</div> : null}
      <AuthField name="newPassword" label="New Password" type="password" value={props.newPassword} required minLength={8} placeholder="Enter a new password" onChange={(_, value) => props.onNewPasswordChange(value)} />
      <AuthField name="confirmPassword" label="Confirm Password" type="password" value={props.confirmPassword} required minLength={8} placeholder="Re-enter your new password" onChange={(_, value) => props.onConfirmPasswordChange(value)} />
      <Button type="submit" disabled={props.status === "loading"} className="full-width-btn">{props.status === "loading" ? "Updating..." : "Reset Password"}</Button>
      <div className="auth-reset-actions">
        <Link href="/login" className="auth-link auth-link--subtle">← Back to Log in</Link>
      </div>
    </form>
  );
}

function useResetPasswordSubmit(params: ResetPasswordSubmitParams) {
  return async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = getResetPasswordValidationError({
      token: params.token,
      newPassword: params.newPassword,
      confirmPassword: params.confirmPassword,
    });
    if (validationError) {
      params.setStatus("error");
      params.setMessage(validationError);
      return;
    }
    params.setStatus("loading");
    params.setMessage(null);
    try {
      await resetPassword({ token: params.token as string, newPassword: params.newPassword });
      params.setStatus("success");
      params.setMessage("Your password has been updated.");
    } catch (err) {
      params.setStatus("error");
      params.setMessage(err instanceof Error ? err.message : "Failed to reset password");
    }
  };
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<ResetPasswordStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const handleSubmit = useResetPasswordSubmit({ token, newPassword, confirmPassword, setStatus, setMessage });

  if (!token) {
    return <MissingResetTokenView />;
  }

  if (status === "success") {
    return <PasswordResetSuccessView message={message} />;
  }

  return <ResetPasswordFields message={message} alertClass={getResetPasswordAlertClass(status)} newPassword={newPassword} confirmPassword={confirmPassword} status={status} onSubmit={handleSubmit} onNewPasswordChange={setNewPassword} onConfirmPasswordChange={setConfirmPassword} />;
}
