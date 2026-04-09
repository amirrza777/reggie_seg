"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { AuthField } from "./AuthField";
import { joinEnterpriseByCode } from "../api/client";

type JoinStatus = "idle" | "loading" | "success" | "error";

export function EnterpriseAccessRecoveryPanel() {
  const [enterpriseCode, setEnterpriseCode] = useState("");
  const [status, setStatus] = useState<JoinStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = enterpriseCode.trim().toUpperCase();
    if (!normalizedCode) {
      setStatus("error");
      setMessage("Enterprise code is required.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      await joinEnterpriseByCode({ enterpriseCode: normalizedCode });
      setStatus("success");
      setMessage("Enterprise access restored. Redirecting…");
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.assign("/dashboard");
        }, 300);
      }
    } catch (error: unknown) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not join enterprise.");
    }
  };

  return (
    <div className="enterprise-access-recovery ui-stack-md">
      <div className="enterprise-access-recovery__copy">
        <p>
          Your account is signed in, but it is not currently assigned to an enterprise workspace. Enter your enterprise
          code to rejoin. If access is blocked by the enterprise, contact your enterprise admin by email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="enterprise-access-recovery__form">
        <AuthField
          name="enterpriseCode"
          label="Enterprise code"
          value={enterpriseCode}
          onChange={(_, value) => setEnterpriseCode(value)}
          required
        />
        <div className="enterprise-access-recovery__actions">
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Checking..." : "Join enterprise"}
          </Button>
          <Link href="/help/account-access" className="btn btn--ghost">
            Account access help
          </Link>
        </div>
      </form>

      {message ? (
        <p className={`ui-note ${status === "error" ? "ui-note--error" : "ui-note--success"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
