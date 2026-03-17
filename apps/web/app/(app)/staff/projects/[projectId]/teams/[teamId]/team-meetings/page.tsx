import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { StaffMeetingsView } from "@/features/staff/meetings/StaffMeetingsView";
import "@/features/staff/meetings/styles/staff-meetings.css";
import "@/features/calendar/styles/calendar.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTeamMeetingsSectionPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { teamId } = await params;
  const numericTeamId = Number(teamId);

  if (Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid team ID.</p>;
  }

  let meetings;
  try {
    meetings = await listTeamMeetings(numericTeamId);
  } catch {
    return <p className="error">Failed to load meetings.</p>;
  }

  return <StaffMeetingsView meetings={meetings} />;
}
