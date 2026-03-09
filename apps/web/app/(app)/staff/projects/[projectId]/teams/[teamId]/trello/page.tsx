import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Trello"
      description="Team board integration placeholder is ready here."
    />
  );
}

