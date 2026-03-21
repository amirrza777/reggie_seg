import { MeetingAttendanceContent } from "@/features/meetings/components/MeetingAttendanceContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

type MeetingAttendancePageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingAttendancePage({ params }: MeetingAttendancePageProps) {
  const { projectId, meetingId } = await params;
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <MeetingAttendanceContent meetingId={Number(meetingId)} projectId={Number(projectId)} />
    </div>
  );
}
