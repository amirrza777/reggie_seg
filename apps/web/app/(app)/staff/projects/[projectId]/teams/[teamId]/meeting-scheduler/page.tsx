import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffMeetingSchedulerSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  redirect(`/staff/projects/${projectId}/teams/${teamId}/team-meetings`);
}
