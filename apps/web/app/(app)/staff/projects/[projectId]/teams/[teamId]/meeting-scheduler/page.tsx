import { StaffTeamSectionPlaceholder } from "@/features/staff/projects/components/StaffTeamSectionPlaceholder";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffMeetingSchedulerSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  return (
    <StaffTeamSectionPlaceholder
      projectId={projectId}
      teamId={teamId}
      title="Meeting Scheduler"
      description="Scheduling and slot management placeholders are set up here."
    />
  );
}

