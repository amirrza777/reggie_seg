import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Team"
      description="Team-specific details will live here."
    />
  );
}

