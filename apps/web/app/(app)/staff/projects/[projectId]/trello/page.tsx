import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectTrelloPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/staff/projects/${encodeURIComponent(projectId)}`);
}
