import { ProjectNav } from "@/features/projects/components/ProjectNav";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function MeetingSchedulerPage({ params }: PageProps) {
  const { projectId } = await params;

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <p className="muted">Meeting scheduler TBA.</p>
    </div>
  );
}
