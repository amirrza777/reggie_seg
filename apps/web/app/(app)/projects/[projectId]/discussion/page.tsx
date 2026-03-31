/* eslint-disable react-refresh/only-export-components */
import { DiscussionForumClient } from "@/features/forum/components/DiscussionForumClient";
import { getTeammatesInProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

export const metadata = { title: "Discussion Forum" };

type ProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDiscussionPage({ params }: ProjectDiscussionPageProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  const result = user
    ? await getTeammatesInProject(user.id, Number(projectId)).catch(() => ({ teammates: [] }))
    : { teammates: [] };

  const teammates = (result as { teammates?: { user: { id: number; firstName: string; lastName: string } }[] }).teammates ?? [];
  const members = teammates.map((t) => t.user);

  return (
    <DiscussionForumClient projectId={projectId} members={members} />
  );
}
