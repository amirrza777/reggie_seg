import { MeetingsPageContent } from "@/features/meetings/components/MeetingsPageContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const teamId = Number(projectId);

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <MeetingsPageContent teamId={teamId} />
    </div>
  );
}
