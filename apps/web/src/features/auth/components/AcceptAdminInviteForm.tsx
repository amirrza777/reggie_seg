"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { AuthField } from "./AuthField";

type InviteAcceptStatus = "idle" | "loading" | "error" | "success";
type InviteResolveStatus = "idle" | "loading" | "ready" | "error";
type InviteMode = "new_account" | "existing_account";
type InvitePayload = {
  token: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
};
type InviteConfig = {
  activatedMessage: string;
  existingAccountMessage: string;
  resolveInviteState: (token: string) => Promise<{ mode: InviteMode }>;
  acceptInvite: (payload: InvitePayload) => Promise<unknown>;
};

function normalizeOptionalName(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatInviteStateErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const normalized = error.message.trim().toLowerCase();
    if (
      normalized === "invalid invite token" ||
      normalized === "invite token has expired" ||
      normalized === "invite token has already been used"
    ) {
      return "This invite link is invalid, expired, or already used. Ask your administrator for a fresh invite link.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not validate invite.";
}

function MissingInviteTokenView() {
  return (
    <div className="auth-form auth-center">
      <div className="status-alert status-alert--error auth-alert auth-alert--spacious">Invite link is missing or invalid.</div>
      <div className="auth-actions">
        <Link href="/login" className="auth-link-reset">
          <Button className="auth-button">Back to Log in</Button>
        </Link>
      </div>
    </div>
  );
}

function InvalidInviteStateView({ message }: { message: string }) {
  return (
    <div className="auth-form auth-center">
      <div className="status-alert status-alert--error auth-alert auth-alert--spacious">{message}</div>
      <div className="auth-actions">
        <Link href="/login" className="auth-link-reset">
          <Button className="auth-button">Back to Log in</Button>
        </Link>
      </div>
    </div>
  );
}

function InviteAcceptSuccessView({ message }: { message: string }) {
  return (
    <div className="auth-form auth-center">
      <div className="status-alert status-alert--success auth-alert auth-alert--spacious">{message}</div>
      <div className="auth-actions">
        <Link href="/app-home" className="auth-link-reset">
          <Button className="auth-button">Continue</Button>
        </Link>
      </div>
    </div>
  );
}

function ExistingAccountInviteView(props: {
  status: InviteAcceptStatus;
  message: string | null;
  existingAccountMessage: string;
  onContinue: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const alertClass = props.status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
  return (
    <form className="auth-form" onSubmit={props.onContinue}>
      {props.message ? <div className={`${alertClass} auth-alert`}><span>{props.message}</span></div> : null}
      <div className="status-alert status-alert--success auth-alert auth-alert--spacious">
        {props.existingAccountMessage}
      </div>
      <Button type="submit" disabled={props.status === "loading"} className="auth-button auth-button--spaced">
        {props.status === "loading" ? "Activating..." : "Next"}
      </Button>
      <div className="auth-meta">
        <Link href="/login" className="auth-link auth-link--subtle">Sign in with invited email</Link>
      </div>
    </form>
  );
}

type InviteAcceptFieldsProps = {
  firstName: string;
  lastName: string;
  newPassword: string;
  confirmPassword: string;
  message: string | null;
  status: InviteAcceptStatus;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

function InviteAcceptFields(props: InviteAcceptFieldsProps) {
  const alertClass = props.status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success";
  return (
    <form className="auth-form" onSubmit={props.onSubmit}>
      {props.message ? <div className={`${alertClass} auth-alert`}><span>{props.message}</span></div> : null}
      <AuthField
        name="firstName"
        label="First Name (Optional)"
        value={props.firstName}
        placeholder="First name"
        onChange={(_, value) => props.onFirstNameChange(value)}
      />
      <AuthField
        name="lastName"
        label="Last Name (Optional)"
        value={props.lastName}
        placeholder="Last name"
        onChange={(_, value) => props.onLastNameChange(value)}
      />
      <AuthField
        name="newPassword"
        label="Create Password"
        type="password"
        value={props.newPassword}
        placeholder="Create a password"
        required
        onChange={(_, value) => props.onNewPasswordChange(value)}
      />
      <AuthField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={props.confirmPassword}
        placeholder="Re-enter password"
        required
        onChange={(_, value) => props.onConfirmPasswordChange(value)}
      />
      <Button type="submit" disabled={props.status === "loading"} className="auth-button auth-button--spaced">
        {props.status === "loading" ? "Accepting..." : "Accept invite"}
      </Button>
      <div className="auth-meta">
        <Link href="/login" className="auth-link auth-link--subtle">← Back to Log in</Link>
      </div>
    </form>
  );
}

export function AcceptAdminInviteForm({ token, config }: { token: string | null; config: InviteConfig }) {
  const [resolveStatus, setResolveStatus] = useState<InviteResolveStatus>("idle");
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<InviteMode | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<InviteAcceptStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setResolveStatus("idle");
      setResolveMessage(null);
      setInviteMode(null);
      return;
    }
    let cancelled = false;
    const resolveMode = async () => {
      setResolveStatus("loading");
      setResolveMessage(null);
      try {
        const result = await config.resolveInviteState(token);
        if (cancelled) {
          return;
        }
        setInviteMode(result.mode);
        setResolveStatus("ready");
      } catch (err) {
        if (cancelled) {
          return;
        }
        setResolveStatus("error");
        setResolveMessage(formatInviteStateErrorMessage(err));
      }
    };
    void resolveMode();
    return () => {
      cancelled = true;
    };
  }, [token, config.resolveInviteState]);

  if (!token) {
    return <MissingInviteTokenView />;
  }

  if (resolveStatus === "loading" || resolveStatus === "idle") {
    return (
      <div className="auth-form auth-center">
        <div className="status-alert status-alert--success auth-alert auth-alert--spacious">Checking invite…</div>
      </div>
    );
  }

  if (resolveStatus === "error" || !inviteMode) {
    return <InvalidInviteStateView message={resolveMessage ?? "Invite link is missing or invalid."} />;
  }

  if (status === "success") {
    return <InviteAcceptSuccessView message={message ?? "Invite accepted successfully."} />;
  }

  const handleNewAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    if (!trimmedPassword) {
      setStatus("error");
      setMessage("Password is required.");
      return;
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await config.acceptInvite({
        token,
        newPassword: trimmedPassword,
        firstName: normalizeOptionalName(firstName),
        lastName: normalizeOptionalName(lastName),
      });
      setStatus("success");
      setMessage(config.activatedMessage);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not accept invite.");
    }
  };

  const handleExistingAccountContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await config.acceptInvite({ token });
      setStatus("success");
      setMessage(config.activatedMessage);
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.status === 401) {
        setMessage("Sign in with the invited email, then press Next.");
        return;
      }
      setMessage(err instanceof Error ? err.message : "Could not accept invite.");
    }
  };

  if (inviteMode === "existing_account") {
    return (
      <ExistingAccountInviteView
        status={status}
        message={message}
        existingAccountMessage={config.existingAccountMessage}
        onContinue={handleExistingAccountContinue}
      />
    );
  }

  return (
    <InviteAcceptFields
      firstName={firstName}
      lastName={lastName}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      message={message}
      status={status}
      onFirstNameChange={setFirstName}
      onLastNameChange={setLastName}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleNewAccountSubmit}
    />
  );
}
