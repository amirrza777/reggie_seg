/* eslint-disable react-refresh/only-export-components */
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { TrelloBoardProvider } from "@/features/trello/context/TrelloBoardContext";

export const metadata = { title: "Trello (staff)" };

type LayoutProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  children: React.ReactNode;
};


export default async function StaffTeamTrelloLayout({ params, children }: LayoutProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return <>{children}</>;
  }

  return (
    <TrelloBoardProvider teamId={ctx.team.id} staffView>
      {children}
    </TrelloBoardProvider>
  );
}
