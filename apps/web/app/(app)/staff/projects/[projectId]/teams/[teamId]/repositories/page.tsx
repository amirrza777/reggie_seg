import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffRepositoriesSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Repositories"
      description="Team-level repository analytics placeholder is ready here."
    />
  );
}

