import { redirect } from "next/navigation";

type ProjectMeetingsNewPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMeetingsNewPage({ params }: ProjectMeetingsNewPageProps) {
  const { projectId } = await params;
  redirect(`/projects/${encodeURIComponent(projectId)}/meetings?tab=new`);
}
