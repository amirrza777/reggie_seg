"use client";

import { useRouter } from "next/navigation";
import type { TeamAllocation } from "../types";

type PeerListViewProps = {
  peers: TeamAllocation[];
  projectId: string;
  teamId: number;
  currentUserId: number;
  completedRevieweeIds?: number[];
  completedAssessmentByRevieweeId?: Record<number, number>;
};

export function PeerListView({
  peers,
  projectId,
  teamId,
  currentUserId,
  completedRevieweeIds = [],
  completedAssessmentByRevieweeId = {},
}: PeerListViewProps) {
  const router = useRouter();
  const completedRevieweeIdSet = new Set(completedRevieweeIds);

  const handlePeerClick = (peerId: number, allocation: TeamAllocation) => {
    const existingAssessmentId = completedAssessmentByRevieweeId[peerId];
    const teammateName = `${allocation.user.firstName}%20${allocation.user.lastName}`;

    if (existingAssessmentId) {
      router.push(
        `/projects/${projectId}/peer-assessments/${existingAssessmentId}?teammateName=${teammateName}`
      );
      return;
    }

    router.push(
      `/projects/${projectId}/peer-assessments/create?teamId=${teamId}&revieweeId=${peerId}&reviewerId=${currentUserId}&teammateName=${teammateName}`
    );
  };

  return (
    <div>
      <h2>Select a peer to assess</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        {peers.map((allocation) => {
          const isCompleted = completedRevieweeIdSet.has(allocation.user.id);

          return (
            <div
              key={allocation.user.id}
              onClick={() => handlePeerClick(allocation.user.id, allocation)}
              style={{
                cursor: "pointer",
                padding: "16px",
                border: `1px solid ${isCompleted ? "var(--status-success-border)" : "var(--border)"}`,
                borderRadius: "12px",
                backgroundColor: isCompleted
                  ? "var(--status-success-soft)"
                  : "var(--surface)",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = isCompleted
                  ? "var(--status-success-soft)"
                  : "var(--glass-hover)";
                (e.currentTarget as HTMLDivElement).style.borderColor = isCompleted
                  ? "var(--status-success)"
                  : "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = isCompleted
                  ? "var(--status-success-soft)"
                  : "var(--surface)";
                (e.currentTarget as HTMLDivElement).style.borderColor = isCompleted
                  ? "var(--status-success-border)"
                  : "var(--border)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>
                  {allocation.user.firstName} {allocation.user.lastName}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "999px",
                    backgroundColor: isCompleted
                      ? "var(--status-success-soft)"
                      : "var(--status-danger-soft)",
                    color: isCompleted
                      ? "var(--status-success-text)"
                      : "var(--status-danger-text)",
                    border: `1px solid ${
                      isCompleted
                        ? "var(--status-success-border)"
                        : "var(--status-danger-border)"
                    }`,
                    alignSelf: "flex-start",
                  }}
                >
                  {isCompleted ? "Completed" : "Pending"}
                </div>
              </div>
              <div style={{ color: "var(--muted)", fontSize: "14px" }}>
                {allocation.user.email}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "13px",
                  color: isCompleted ? "var(--status-success-text)" : "var(--accent)",
                }}
              >
                {isCompleted
                  ? "Review submitted - click to edit →"
                  : "Not submitted yet - click to assess →"}
              </div>
            </div>
          );
        })}
      </div>
      {peers.length === 0 && (
        <div style={{ color: "var(--muted)", marginTop: "20px" }}>
          No peers found in this team.
        </div>
      )}
    </div>
  );
}
