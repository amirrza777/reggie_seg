"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { RichTextEditor } from "@/shared/ui/rich-text/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/rich-text/RichTextViewer";
import { reviewStaffTeamHealthMessage } from "@/features/projects/api/client";
import type { TeamHealthMessage } from "@/features/projects/types";

type StaffTeamHealthMessageReviewPanelProps = {
  userId: number;
  projectId: number;
  teamId: number;
  initialRequests: TeamHealthMessage[];
  initialError?: string | null;
};

const MESSAGE_PAGE_SIZE = 5;

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
  const [responseDraftEmpty, setResponseDraftEmpty] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [messagePage, setMessagePage] = useState(1);
  const compactPanelStyle = { padding: 12, gap: 12, fontSize: "var(--fs-fixed-0-92rem)", lineHeight: 1.35 } as const;
  const compactCardStyle = { padding: "12px 14px", gap: 9 } as const;
  const messageStackStyle = { display: "grid", gap: 14, padding: "2px 2px 4px" } as const;
  const compactTitleStyle = { margin: 0, fontSize: "var(--fs-fixed-1-14rem)", lineHeight: 1.22 } as const;
  const compactMutedStyle = { margin: 0 } as const;
  const compactDetailStyle = {
    margin: 0,
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
  } as const;
  const compactButtonStyle = { padding: "4px 10px", minHeight: 28, fontSize: "var(--fs-fixed-0-84rem)", lineHeight: 1.1 } as const;
  const openMessageCount = requests.filter((request) => !request.resolved).length;
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        if (a.resolved !== b.resolved) return Number(a.resolved) - Number(b.resolved);
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      }),
    [requests],
  );
  const messagePageCount = Math.max(1, Math.ceil(sortedRequests.length / MESSAGE_PAGE_SIZE));
  const pagedRequests = useMemo(() => {
    const start = (messagePage - 1) * MESSAGE_PAGE_SIZE;
    return sortedRequests.slice(start, start + MESSAGE_PAGE_SIZE);
  }, [messagePage, sortedRequests]);
  const paginationStyle = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  } as const;
  const paginationCountStyle = {
    color: "var(--muted)",
    fontSize: "var(--fs-caption)",
    minWidth: 68,
    textAlign: "center",
  } as const;

  useEffect(() => {
    if (messagePage > messagePageCount) setMessagePage(messagePageCount);
  }, [messagePage, messagePageCount]);

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
    setResponseDraftEmpty(!request.responseText);
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
    if (responseDraftEmpty) {
      setPanelError("Response cannot be empty.");
      return;
    }

    setIsActionLoading(true);
    setPanelError(null);
    setPanelMessage(null);
    try {
      const updated = await reviewStaffTeamHealthMessage(projectId, teamId, requestId, userId, true, responseDraft);
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
            <div style={messageStackStyle}>
              {pagedRequests.map((request) => {
              const isResolved = request.resolved;
              const isRespondOpen = activeRespondRequestId === request.id;
              const hasResponse = Boolean(request.responseText?.trim());
              const isResponded = hasResponse || Boolean(request.reviewedByUserId) || isResolved;
              const statusCardClass = [
                isResponded ? " staff-projects__team-card--responded" : "",
                isResolved ? " staff-projects__team-card--resolved" : "",
              ].join("");
              const statusBadgeStyle = {
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: "var(--fs-fixed-0-88rem)",
                fontWeight: 600,
                border: "1px solid var(--border)",
              } as const;

                return (
                  <article key={request.id} className={`staff-projects__team-card${statusCardClass}`} style={compactCardStyle}>
                  <div className="staff-projects__team-top">
                    <h3 className="staff-projects__team-title" style={compactTitleStyle}>{request.subject}</h3>
                    <span style={statusBadgeStyle}>{isResolved ? "Resolved" : "Open"}</span>
                  </div>
                  <div style={{ margin: 0 }}>
                    <RichTextViewer content={request.details} noPadding />
                  </div>
                  <p className="staff-projects__team-count" style={compactMutedStyle}>
                    Submitted by {request.requester.firstName} {request.requester.lastName} on{" "}
                    {formatDate(request.createdAt)}
                  </p>
                  {request.responseText ? (
                    <div style={compactMutedStyle}>
                      <div
                        style={{
                          border: "1px solid var(--status-success-border)",
                          borderRadius: 8,
                          padding: "8px 10px",
                          background: "var(--surface)",
                        }}
                      >
                        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--ink)" }}>Staff response</p>
                        <RichTextViewer content={request.responseText!} noPadding />
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {request.reviewedBy ? (
                      <p className="muted" style={compactMutedStyle}>
                        Last updated by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                        {request.reviewedAt ? ` on ${formatDate(request.reviewedAt)}` : ""}
                      </p>
                    ) : null}

                    <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 6, marginLeft: "auto" }}>
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
                  </div>

                  {isRespondOpen ? (
                    <div className="staff-projects__team-health-review-box">
                      <div className="staff-projects__team-health-deadline-field">
                        <span>Staff response</span>
                        <RichTextEditor
                          initialContent={responseDraft}
                          onChange={setResponseDraft}
                          onEmptyChange={setResponseDraftEmpty}
                          placeholder="Write your response to this query or complaint..."
                        />
                      </div>
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
              })}
              {messagePageCount > 1 ? (
                <div style={paginationStyle}>
                  <Button type="button" variant="ghost" size="sm" style={compactButtonStyle} onClick={() => setMessagePage((page) => Math.max(1, page - 1))} disabled={messagePage === 1}>
                    Previous
                  </Button>
                  <span style={paginationCountStyle}>
                    Page {messagePage} / {messagePageCount}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={compactButtonStyle}
                    onClick={() => setMessagePage((page) => Math.min(messagePageCount, page + 1))}
                    disabled={messagePage === messagePageCount}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
          {panelMessage ? <p className="muted" style={{ margin: 0 }}>{panelMessage}</p> : null}
          {panelError ? <p className="error" style={{ margin: 0 }}>{panelError}</p> : null}
        </details>
      </section>
    </>
  );
}
