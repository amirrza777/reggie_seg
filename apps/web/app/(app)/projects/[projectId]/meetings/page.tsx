import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { MeetingList } from "@/features/meetings/components/MeetingList";
import { MinutesEditor } from "@/features/meetings/components/MinutesEditor";
import { AttendanceTable } from "@/features/meetings/components/AttendanceTable";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = params;
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
