"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { reviewStaffTeamHealthMessage } from "@/features/projects/api/client";
import type { TeamHealthMessage } from "@/features/projects/types";

type StaffTeamHealthMessageReviewPanelProps = {
  userId: number;
  projectId: number;
  teamId: number;
  initialRequests: TeamHealthMessage[];
  initialError?: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} UTC`;
}

export function StaffTeamHealthMessageReviewPanel({
  userId,
  projectId,
  teamId,
  initialRequests,
  initialError = null,
}: StaffTeamHealthMessageReviewPanelProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [requestLoadError] = useState<string | null>(initialError);
  const [activeRespondRequestId, setActiveRespondRequestId] = useState<number | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const compactPanelStyle = { padding: 12, gap: 10, fontSize: "0.92rem", lineHeight: 1.35 } as const;
  const compactCardStyle = { padding: "8px 10px", gap: 6 } as const;
  const compactTitleStyle = { margin: 0, fontSize: "1.02rem", lineHeight: 1.2 } as const;
  const compactMutedStyle = { margin: 0 } as const;
  const compactDetailStyle = {
    margin: 0,
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
  } as const;
  const compactButtonStyle = { padding: "4px 10px", minHeight: 28, fontSize: "0.84rem", lineHeight: 1.1 } as const;
  const openMessageCount = requests.filter((request) => !request.resolved).length;

  const updateRequest = (updated: TeamHealthMessage) => {
    setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const openRespondBox = (request: TeamHealthMessage) => {
    if (activeRespondRequestId === request.id) {
      setActiveRespondRequestId(null);
      setResponseDraft("");
      setPanelError(null);
      setPanelMessage(null);
      return;
    }
    setActiveRespondRequestId(request.id);
    setResponseDraft(request.responseText ?? "");
    setPanelError(null);
    setPanelMessage(null);
  };

  const handleMarkUnresolved = async (requestId: number) => {
    setIsActionLoading(true);
    setPanelError(null);
    setPanelMessage(null);
    try {
      const updated = await reviewStaffTeamHealthMessage(projectId, teamId, requestId, userId, false);
      updateRequest(updated);
      if (activeRespondRequestId === requestId) {
        setActiveRespondRequestId(null);
        setResponseDraft("");
      }
      setPanelMessage("Marked as unresolved.");
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Failed to update message.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitResponse = async (requestId: number) => {
    const trimmed = responseDraft.trim();
    if (!trimmed) {
      setPanelError("Response cannot be empty.");
      return;
    }

    setIsActionLoading(true);
    setPanelError(null);
    setPanelMessage(null);
    try {
      const updated = await reviewStaffTeamHealthMessage(projectId, teamId, requestId, userId, true, trimmed);
      updateRequest(updated);
      setActiveRespondRequestId(null);
      setResponseDraft("");
      setPanelMessage("Response sent.");
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Failed to send response.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <section className="staff-projects__team-list" aria-label="Team queries and complaints">
        <details
          className="staff-projects__team-card staff-projects__team-card--signal staff-projects__collapsible"
          style={compactPanelStyle}
        >
          <summary className="staff-projects__collapsible-summary">
            <div>
              <h3 className="staff-projects__team-title" style={compactTitleStyle}>Messages</h3>
              <p className="staff-projects__team-count" style={{ margin: 0 }}>
                {openMessageCount} open · {requests.length} total. Click to expand and respond.
              </p>
            </div>
          </summary>
          <p className="staff-projects__team-count" style={{ margin: 0 }}>
            Review student-submitted queries and complaints, then respond directly from this panel.
          </p>

          {requestLoadError ? (
            <p className="muted" style={{ margin: 0 }}>{requestLoadError}</p>
          ) : requests.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No queries or complaints have been submitted for this team yet.
            </p>
          ) : (
            requests.map((request) => {
              const isResolved = request.resolved;
              const isRespondOpen = activeRespondRequestId === request.id;
              const statusCardClass = isResolved ? " staff-projects__team-card--resolved" : "";
              const statusBadgeStyle = {
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: "0.88rem",
                fontWeight: 600,
                border: "1px solid var(--border)",
              } as const;

              return (
                <article key={request.id} className={`staff-projects__team-card${statusCardClass}`} style={compactCardStyle}>
                  <div className="staff-projects__team-top">
                    <h3 className="staff-projects__team-title" style={compactTitleStyle}>{request.subject}</h3>
                    <span style={statusBadgeStyle}>{isResolved ? "Resolved" : "Open"}</span>
                  </div>
                  <p style={compactDetailStyle}>{request.details}</p>
                  <p className="staff-projects__team-count" style={compactMutedStyle}>
                    Submitted by {request.requester.firstName} {request.requester.lastName} on{" "}
                    {formatDate(request.createdAt)}
                  </p>
                  {request.responseText ? (
                    <p className="staff-projects__team-count" style={compactMutedStyle}>
                      <strong>Staff response:</strong> {request.responseText}
                    </p>
                  ) : null}
                  {request.reviewedBy ? (
                    <p className="muted" style={compactMutedStyle}>
                      Last updated by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                      {request.reviewedAt ? ` on ${formatDate(request.reviewedAt)}` : ""}
                    </p>
                  ) : null}

                  <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 6 }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      style={compactButtonStyle}
                      onClick={() => openRespondBox(request)}
                      disabled={isActionLoading}
                    >
                      {isRespondOpen ? "Close response" : request.responseText ? "Edit response" : "Respond"}
                    </Button>
                    {isResolved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        style={compactButtonStyle}
                        onClick={() => void handleMarkUnresolved(request.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? "Saving..." : "Mark unresolved"}
                      </Button>
                    ) : null}
                  </div>

                  {isRespondOpen ? (
                    <div className="staff-projects__team-health-review-box">
                      <label className="staff-projects__team-health-deadline-field">
                        <span>Staff response</span>
                        <textarea
                          value={responseDraft}
                          onChange={(event) => setResponseDraft(event.target.value)}
                          placeholder="Write your response to this query or complaint..."
                          rows={3}
                          style={{ resize: "vertical" }}
                        />
                      </label>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          style={compactButtonStyle}
                          onClick={() => {
                            setActiveRespondRequestId(null);
                            setResponseDraft("");
                            setPanelError(null);
                            setPanelMessage(null);
                          }}
                          disabled={isActionLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          style={compactButtonStyle}
                          onClick={() => void handleSubmitResponse(request.id)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? "Sending..." : "Send response"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
          {panelMessage ? <p className="muted" style={{ margin: 0 }}>{panelMessage}</p> : null}
          {panelError ? <p className="error" style={{ margin: 0 }}>{panelError}</p> : null}
        </details>
      </section>
    </>
  );
}
