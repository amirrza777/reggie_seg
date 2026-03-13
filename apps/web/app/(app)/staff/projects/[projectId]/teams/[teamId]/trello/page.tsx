import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffTrelloSectionPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/staff/projects/${projectId}/trello`);
}
