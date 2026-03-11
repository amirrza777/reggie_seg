"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { createMcfRequest } from "../api/client";
import type { MCFRequest, MCFRequestStatus } from "../types";

type McfRequestPanelProps = {
  projectId: number;
  userId: number;
  teamName: string;
  initialRequests: MCFRequest[];
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

function formatStatus(status: MCFRequestStatus) {
  return status
    .split("_")
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(" ");
}

function getStatusTone(status: MCFRequestStatus) {
  if (status === "RESOLVED") return "var(--status-success-text)";
  if (status === "REJECTED") return "var(--status-danger-text)";
  if (status === "IN_REVIEW") return "var(--status-warning-text, #b45309)";
  return "var(--status-info-text, var(--ink))";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export function McfRequestPanel({ projectId, userId, teamName, initialRequests }: McfRequestPanelProps) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<MCFRequest[]>(initialRequests);

  const canSubmit = useMemo(
    () => subject.trim().length > 0 && details.trim().length > 0 && status !== "loading",
    [details, status, subject]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedDetails = details.trim();
    if (!trimmedSubject || !trimmedDetails) {
      setStatus("error");
      setMessage("Please add both a subject and details.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const created = await createMcfRequest(projectId, userId, trimmedSubject, trimmedDetails);
      setRequests((prev) => [created, ...prev]);
      setSubject("");
      setDetails("");
      setStatus("success");
      setMessage("MCF request submitted.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to submit MCF request.");
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted" style={{ margin: 0 }}>
        Team: {teamName}
      </p>

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

        <label className="stack" style={{ gap: 6 }}>
          <span>Details</span>
          <textarea
            value={details}
            rows={5}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe what is happening and why support is needed"
            style={textInputStyle}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 14,
            marginBottom: 18,
          }}
        >
          <Button type="submit" disabled={!canSubmit}>
            {status === "loading" ? "Submitting..." : "Submit MCF Request"}
          </Button>
        </div>
      </form>

      {message ? <p className={status === "error" ? "error" : "muted"}>{message}</p> : null}

      <div className="stack" style={{ gap: 10 }}>
        <h4 style={{ margin: 0 }}>My MCF Requests</h4>
        {requests.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No requests submitted yet.
          </p>
        ) : (
          requests.map((request) => (
            <article
              key={request.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                background: "var(--surface)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{request.subject}</strong>
                <span style={{ color: getStatusTone(request.status), fontWeight: 600 }}>
                  {formatStatus(request.status)}
                </span>
              </div>
              <p style={{ margin: 0 }}>{request.details}</p>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Submitted: {formatDate(request.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
