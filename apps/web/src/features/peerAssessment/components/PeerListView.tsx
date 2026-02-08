"use client";

import { useRouter } from "next/navigation";
import type { TeamAllocation } from "../types";

type PeerListViewProps = {
  peers: TeamAllocation[];
  projectId: string;
  teamId: number;
  currentUserId: number;
};

export function PeerListView({
  peers,
  projectId,
  teamId,
  currentUserId,
}: PeerListViewProps) {
  const router = useRouter();

  const handlePeerClick = (peerId: number) => {
    router.push(
      `/projects/${projectId}/peer-assessments/create?teamId=${teamId}&revieweeId=${peerId}&reviewerId=${currentUserId}`
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
        {peers.map((allocation) => (
          <div
            key={allocation.id}
            onClick={() => handlePeerClick(allocation.user.id)}
            style={{
              cursor: "pointer",
              padding: "16px",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              backgroundColor: "var(--surface)",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "var(--hover)";
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "var(--surface)";
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--border)";
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "16px" }}>
              {allocation.user.firstName} {allocation.user.lastName}
            </div>
            <div style={{ color: "var(--muted)", fontSize: "14px" }}>
              {allocation.user.email}
            </div>
            <div
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "var(--primary)",
              }}
            >
              Click to assess →
            </div>
          </div>
        ))}
      </div>
      {peers.length === 0 && (
        <div style={{ color: "var(--muted)", marginTop: "20px" }}>
          No peers found in this team.
        </div>
      )}
    </div>
  );
}
