import { DiscussionForumClient } from "@/features/projects/components/DiscussionForumClient";

export const metadata = { title: "Discussion Forum" };

type ProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDiscussionPage({ params }: ProjectDiscussionPageProps) {
  const { projectId } = await params;

  return (
    <DiscussionForumClient projectId={projectId} />
  );
}
