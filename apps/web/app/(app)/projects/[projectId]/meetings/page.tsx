import { AttendanceTable } from "@/features/meetings/components/AttendanceTable";
import { MeetingList } from "@/features/meetings/components/MeetingList";
import { MinutesEditor } from "@/features/meetings/components/MinutesEditor";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <Placeholder
        title="Meetings"
        path={`/projects/${projectId}/meetings`}
        description="Track agendas, attendance, and minutes."
      />
      <MeetingList />
      <MinutesEditor meetingId="mtg-1" />
      <AttendanceTable />
    </div>
  );
}
