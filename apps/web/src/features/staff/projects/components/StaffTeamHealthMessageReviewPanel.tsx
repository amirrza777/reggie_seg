"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
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
  return date.toLocaleString();
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
        <h3 style={{ margin: 0 }}>Messages</h3>
        {requestLoadError ? (
          <article className="staff-projects__team-card">
            <p className="muted" style={{ margin: 0 }}>{requestLoadError}</p>
          </article>
        ) : requests.length === 0 ? (
          <article className="staff-projects__team-card">
            <p className="muted" style={{ margin: 0 }}>
              No queries or complaints have been submitted for this team yet.
            </p>
          </article>
        ) : (
          requests.map((request) => {
            const isResolved = request.resolved;
            const isRespondOpen = activeRespondRequestId === request.id;
            const statusCardClass = isResolved ? " staff-projects__team-card--resolved" : "";

            return (
              <article key={request.id} className={`staff-projects__team-card${statusCardClass}`}>
                <div className="staff-projects__team-top">
                  <h3 className="staff-projects__team-title">{request.subject}</h3>
                  <span>{isResolved ? "Resolved" : "Open"}</span>
                </div>
                <div style={{ margin: 0 }}>
                  <RichTextViewer content={request.details} />
                </div>
                <p className="staff-projects__team-count">
                  Submitted by {request.requester.firstName} {request.requester.lastName} on{" "}
                  {formatDate(request.createdAt)}
                </p>
                {request.responseText ? (
                  <div className="staff-projects__team-count" style={{ margin: 0 }}>
                    <strong>Staff response:</strong>
                    <RichTextViewer content={request.responseText!} />
                  </div>
                ) : null}
                {request.reviewedBy ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Last updated by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                    {request.reviewedAt ? ` on ${formatDate(request.reviewedAt)}` : ""}
                  </p>
                ) : null}

                <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                      onClick={() => void handleMarkUnresolved(request.id)}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? "Saving..." : "Mark unresolved"}
                    </Button>
                  ) : null}
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
      </section>

      {panelMessage ? <p className="muted" style={{ margin: 0 }}>{panelMessage}</p> : null}
      {panelError ? <p className="error" style={{ margin: 0 }}>{panelError}</p> : null}
    </>
  );
}
