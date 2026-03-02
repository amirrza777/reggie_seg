import { MeetingSchedulerContent } from "@/features/meetings/components/MeetingSchedulerContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MeetingSchedulerPage({ params }: PageProps) {
  const { projectId } = await params;
  const teamId = Number(projectId);

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <MeetingSchedulerContent teamId={teamId} projectId={teamId} />
    </div>
  );
}
