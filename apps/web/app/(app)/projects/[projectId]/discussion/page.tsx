/* eslint-disable react-refresh/only-export-components */
import { DiscussionForumClient } from "@/features/forum/components/DiscussionForumClient";
import { getForumMembers } from "@/features/forum/api/client";
import { getCurrentUser } from "@/shared/auth/session";

export const metadata = { title: "Discussion Forum" };

type ProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDiscussionPage({ params }: ProjectDiscussionPageProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  const members = user
    ? await getForumMembers(user.id, Number(projectId)).catch(() => [])
    : [];

  return (
    <DiscussionForumClient projectId={projectId} members={members} />
  );
}
