import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffPeerFeedbackSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Peer Feedback"
      description="Staff peer-feedback placeholder is ready here."
    />
  );
}

