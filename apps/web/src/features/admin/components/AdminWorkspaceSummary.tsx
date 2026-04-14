"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { getAdminSummary, inviteGlobalAdmin } from "../api/client";
import type { AdminSummary } from "../types";
import { AuditLogModal } from "./AuditLogModal";

type RequestState = "idle" | "loading" | "success" | "error";

const INVITE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminWorkspaceSummaryView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<RequestState>("idle");
  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<RequestState>("idle");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      setSummaryStatus("loading");
      setSummaryNotice(null);
      try {
        const data = await getAdminSummary();
        setSummary(data);
        setSummaryStatus("success");
      } catch (err) {
        setSummaryStatus("error");
        setSummaryNotice((err as Error)?.message ?? "Unable to load admin summary.");
      }
    };
    void loadSummary();
  }, []);

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setInviteStatus("error");
      setInviteMessage("Invite email is required.");
      return;
    }
    if (!INVITE_EMAIL_REGEX.test(normalizedEmail)) {
      setInviteStatus("error");
      setInviteMessage("Enter a valid email address.");
      return;
    }

    setInviteStatus("loading");
    setInviteMessage(null);
    try {
      const result = await inviteGlobalAdmin(normalizedEmail);
      setInviteEmail("");
      setInviteStatus("success");
      setInviteMessage(`Admin invite sent to ${result.email}.`);
    } catch (err) {
      setInviteStatus("error");
      if (err instanceof ApiError && err.status === 403) {
        setInviteMessage("Only the super admin can send admin invites.");
        return;
      }
      if (err instanceof Error) {
        setInviteMessage(err.message);
      } else {
        setInviteMessage("Could not send admin invite.");
      }
    }
  };

  return (
    <>
      <Card
        title="Workspace snapshot"
        className="admin-overview-card"
        action={
          <div className="admin-overview-actions">
            <Button type="button" className="admin-overview-actions__btn" onClick={() => setModalOpen(true)}>
              Invite admin
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="admin-overview-actions__btn"
              onClick={() => setAuditOpen(true)}
            >
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
        {summaryNotice ? (
          <div className="status-alert status-alert--error">
            <span>{summaryNotice}</span>
          </div>
        ) : null}
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
                  Enter the invite email.
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

            <form
              className="modal__body ui-stack-sm"
              onSubmit={handleInviteSubmit}
              noValidate
              autoComplete="off"
            >
              <input
                type="email"
                name="enterprise-admin-invite-email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@enterprise.com"
                aria-label="Admin invite email"
                className="ui-input enterprise-management__invite-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <div className="ui-row ui-row--end">
                <Button type="submit" disabled={inviteStatus === "loading"}>
                  {inviteStatus === "loading" ? "Sending..." : "Send invite"}
                </Button>
              </div>
              {inviteMessage ? (
                <div
                  className={inviteStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
                >
                  <span>{inviteMessage}</span>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
}

export const AdminWorkspaceSummary = AdminWorkspaceSummaryView;
