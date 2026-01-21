import { Placeholder } from "@/shared/ui/Placeholder";

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectMeetingsPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  return (
    <Placeholder
      title="Meetings"
      path={`/projects/${projectId}/meetings`}
      description="Track agendas, attendance, and minutes."
    />
  );
}
