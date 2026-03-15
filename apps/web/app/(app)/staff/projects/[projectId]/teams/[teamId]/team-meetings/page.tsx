import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  let meetings;
  try {
    meetings = await listTeamMeetings(ctx.team.id);
  } catch {
    return <p className="error">Failed to load meetings.</p>;
  }

  return <StaffMeetingsView meetings={meetings} />;
}
