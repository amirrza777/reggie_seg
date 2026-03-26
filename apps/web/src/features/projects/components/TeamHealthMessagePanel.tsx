"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { createTeamHealthMessage } from "../api/client";
import type { TeamHealthMessage } from "../types";

type TeamHealthMessagePanelProps = {
  projectId: number;
  userId: number;
  initialRequests: TeamHealthMessage[];
};

const textInputStyle = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "var(--surface)",
  color: "var(--ink)",
  font: "inherit",
} as const;

function getResolvedTone(resolved: boolean) {
  return resolved ? "var(--status-success-text)" : "var(--status-info-text, var(--ink))";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export function TeamHealthMessagePanel({ projectId, userId, initialRequests }: TeamHealthMessagePanelProps) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [detailsEmpty, setDetailsEmpty] = useState(true);
  const [composerKey, setComposerKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<TeamHealthMessage[]>(initialRequests);

  const canSubmit = useMemo(
    () => subject.trim().length > 0 && !detailsEmpty && status !== "loading",
    [detailsEmpty, status, subject]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    if (!trimmedSubject || detailsEmpty) {
      setStatus("error");
      setMessage("Please add both a subject and details.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const created = await createTeamHealthMessage(projectId, userId, trimmedSubject, details);
      setRequests((prev) => [created, ...prev]);
      setSubject("");
      setDetails("");
      setDetailsEmpty(true);
      setComposerKey((prev) => prev + 1);
      setStatus("success");
      setMessage("Team health message submitted.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to submit team health message.");
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <form className="stack" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <label className="stack" style={{ gap: 6 }}>
          <span>Subject</span>
          <input
            type="text"
            value={subject}
            maxLength={160}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Short summary of the issue"
            style={textInputStyle}
          />
        </label>

        <div className="stack" style={{ gap: 6 }}>
          <span>Details</span>
          <RichTextEditor
            key={composerKey}
            initialContent={details}
            onChange={setDetails}
            onEmptyChange={setDetailsEmpty}
            placeholder="Describe what is happening and why support is needed"
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          <Button type="submit" disabled={!canSubmit}>
            {status === "loading" ? "Submitting..." : "Submit Team Health Message"}
          </Button>
        </div>
      </form>

      {message ? <p className={status === "error" ? "error" : "muted"}>{message}</p> : null}

      <div className="stack" style={{ gap: 10 }}>
        <h4 style={{ margin: 0 }}>My Team Health Messages</h4>
        {requests.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No messages submitted yet.
          </p>
        ) : (
          requests.map((request) => {
            const hasResponse = Boolean(request.responseText);
            return (
              <article
                key={request.id}
                style={{
                  border: hasResponse ? "1px solid var(--status-success-border)" : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: hasResponse ? "var(--status-success-soft)" : "var(--surface)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{request.subject}</strong>
                  <span style={{ color: getResolvedTone(request.resolved), fontWeight: 600 }}>
                    {request.resolved ? "Resolved" : "Open"}
                  </span>
                </div>
                <div style={{ margin: 0 }}>
                  <RichTextViewer content={request.details} />
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Submitted: {formatDate(request.createdAt)}
                </p>

                {hasResponse ? (
                  <div
                    style={{
                      border: "1px solid var(--status-success-border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      background: "var(--surface)",
                    }}
                  >
                    <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Staff response</p>
                    <div style={{ margin: 0 }}>
                      <RichTextViewer content={request.responseText!} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
