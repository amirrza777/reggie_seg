import { getTeammates } from "@/features/peerAssessment/api/client";
import { PeerListView } from "@/features/peerAssessment/components/PeerListView";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

const tempId = 4;
const tempTeamId = 1;

export default async function ProjectPeerAssessmentsPage({params,}: ProjectPageProps) {
  const { projectId } = await params;
  const peers = await getTeammates(tempId, tempTeamId);
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <div style={{ padding: "20px" }}>
        <PeerListView
          peers={peers}
          projectId={projectId}
          teamId={tempId}
          currentUserId={tempTeamId}
        />
      </div>
    </div>
  );   
}
