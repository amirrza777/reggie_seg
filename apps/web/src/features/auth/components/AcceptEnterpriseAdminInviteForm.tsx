"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { acceptEnterpriseAdminInvite } from "../api/client";
import { AuthField } from "./AuthField";

type InviteAcceptStatus = "idle" | "loading" | "error" | "success";

function normalizeOptionalName(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

type InviteAcceptFieldsProps = {
  firstName: string;
  lastName: string;
  message: string | null;
  status: InviteAcceptStatus;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
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
      <Button type="submit" disabled={props.status === "loading"} className="auth-button auth-button--spaced">
        {props.status === "loading" ? "Accepting..." : "Accept invite"}
      </Button>
      <div className="auth-meta">
        <Link href="/login" className="auth-link auth-link--subtle">← Back to Log in</Link>
      </div>
    </form>
  );
}

export function AcceptEnterpriseAdminInviteForm({ token }: { token: string | null }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<InviteAcceptStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!token) {
    return <MissingInviteTokenView />;
  }

  if (status === "success") {
    return <InviteAcceptSuccessView message={message ?? "Invite accepted successfully."} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await acceptEnterpriseAdminInvite({
        token,
        firstName: normalizeOptionalName(firstName),
        lastName: normalizeOptionalName(lastName),
      });
      setStatus("success");
      setMessage("Enterprise admin access activated.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not accept invite.");
    }
  };

  return (
    <InviteAcceptFields
      firstName={firstName}
      lastName={lastName}
      message={message}
      status={status}
      onFirstNameChange={setFirstName}
      onLastNameChange={setLastName}
      onSubmit={handleSubmit}
    />
  );
}
