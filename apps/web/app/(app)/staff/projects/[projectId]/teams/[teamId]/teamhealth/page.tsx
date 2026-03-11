import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamHealthPage({ params }: PageProps) {
  const { projectId, teamId } = await params;

  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Team health"
      description="Team health metrics and risk indicators will be shown here."
    />
  );
}
