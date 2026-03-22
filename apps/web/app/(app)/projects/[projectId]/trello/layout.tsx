/* eslint-disable react-refresh/only-export-components */
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { TrelloBoardProvider } from "@/features/trello/context/TrelloBoardContext";
import { getCurrentUser } from "@/shared/auth/session";

export const metadata = { title: "Trello" };

type LayoutProps = {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
};

export default async function TrelloLayout({ params, children }: LayoutProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;

  if (user) {
    try {
      team = await getTeamByUserAndProject(user.id, Number(projectId));
    } catch {
      team = null;
    }
  }

  if (team) {
    return <TrelloBoardProvider teamId={team.id}>{children}</TrelloBoardProvider>;
  }

  return children;
}
