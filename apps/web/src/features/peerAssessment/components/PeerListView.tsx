"use client";

import { useRouter } from "next/navigation";
import type { TeamAllocation } from "../types";
import "../styles/list.css";

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
    const teammateName = encodeURIComponent(
      `${allocation.user.firstName} ${allocation.user.lastName}`
    );

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
      <ul className="peer-assessment-list" style={{ marginTop: "20px" }}>
        {peers.map((allocation) => {
          const isCompleted = completedRevieweeIdSet.has(allocation.user.id);
          const cardClassName = `peer-assessment-card ${
            isCompleted
              ? "peer-assessment-card--completed"
              : "peer-assessment-card--pending"
          }`;

          return (
            <li key={allocation.user.id} className="peer-assessment-list__item">
              <button
                type="button"
                onClick={() => handlePeerClick(allocation.user.id, allocation)}
                className={cardClassName}
              >
                <div className="peer-assessment-card__header">
                  <div className="peer-assessment-card__name">
                    {allocation.user.firstName} {allocation.user.lastName}
                  </div>
                  <div
                    className={`peer-assessment-card__status ${
                      isCompleted
                        ? "peer-assessment-card__status--completed"
                        : "peer-assessment-card__status--pending"
                    }`}
                  >
                    {isCompleted ? "Completed" : "Pending"}
                  </div>
                </div>
                <div className="peer-assessment-card__email">
                  {allocation.user.email}
                </div>
                <div
                  className={`peer-assessment-card__cta ${
                    isCompleted
                      ? "peer-assessment-card__cta--completed"
                      : "peer-assessment-card__cta--pending"
                  }`}
                >
                  {isCompleted
                    ? "Review submitted - click to edit →"
                    : "Not submitted yet - click to assess →"}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {peers.length === 0 && (
        <div style={{ color: "var(--muted)", marginTop: "20px" }}>
          No peers found in this team.
        </div>
      )}
    </div>
  );
}
