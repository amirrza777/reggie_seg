"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@/shared/ui/icons/ArrowRightIcon";
import type { TeamAllocation } from "../types";
import "../styles/list.css";

type PeerListViewProps = {
  peers: TeamAllocation[];
  projectId: string;
  teamId: number;
  currentUserId: number;
  listTitle?: string;
  listDescription?: string;
  completedRevieweeIds?: number[];
  completedAssessmentByRevieweeId?: Record<number, number>;
  readOnly?: boolean;
};

export function PeerListView({
  peers,
  projectId,
  teamId,
  currentUserId,
  listTitle,
  listDescription,
  completedRevieweeIds = [],
  completedAssessmentByRevieweeId = {},
  readOnly = false,
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

    if (readOnly) {
      return;
    }

    router.push(
      `/projects/${projectId}/peer-assessments/create?teamId=${teamId}&revieweeId=${peerId}&reviewerId=${currentUserId}&teammateName=${teammateName}`
    );
  };

  return (
    <div>
      {(listTitle || listDescription) && (
        <section className="peer-assessment-list-intro" aria-label="Peer assessment guidance">
          {listTitle ? <h3 className="peer-assessment-list-intro__title">{listTitle}</h3> : null}
          {listDescription ? (
            <p className="peer-assessment-list-intro__description">{listDescription}</p>
          ) : null}
        </section>
      )}
      <ul className="peer-assessment-list">
        {peers.map((allocation) => {
          const isCompleted = completedRevieweeIdSet.has(allocation.user.id);
          const isMissed = readOnly && !isCompleted;
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
                disabled={readOnly && !isCompleted}
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
                    {isCompleted ? "Completed" : isMissed ? "Missed" : "Pending"}
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
                    ? (
                      <>
                        {readOnly
                          ? "Review submitted - click to view"
                          : "Review submitted - click to edit"}{" "}
                        <ArrowRightIcon />
                      </>
                    )
                    : (readOnly
                      ? "Submission window closed"
                      : (
                        <>
                          Not submitted yet - click to assess <ArrowRightIcon />
                        </>
                      ))}
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
