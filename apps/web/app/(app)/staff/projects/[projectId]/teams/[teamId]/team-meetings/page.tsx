import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/staff/projects/styles/staff-projects.css";
import Link from "next/link";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  let meetings: Awaited<ReturnType<typeof listTeamMeetings>> = [];
  let meetingsError: string | null = null;
  try {
    meetings = await listTeamMeetings(ctx.team.id);
  } catch (error) {
    meetingsError = error instanceof Error ? error.message : "Failed to load meetings.";
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__team-card" aria-label="Team meetings analytics and history">
        {meetingsError ? <p className="muted">{meetingsError}</p> : <StaffMeetingsView meetings={meetings} />}
      </section>
    </div>
  );
}
