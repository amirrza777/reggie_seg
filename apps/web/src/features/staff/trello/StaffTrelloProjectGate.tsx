import Link from "next/link";
import React, { type ReactNode } from "react";
import { getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

export type StaffTrelloProjectGateChildProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
  deadline?: Awaited<ReturnType<typeof getProjectDeadline>> | null;
};

export type StaffTrelloProjectGateProps = {
  projectId: string;
  needDeadline?: boolean;
  signInMessage?: string;
  children: (props: StaffTrelloProjectGateChildProps) => ReactNode;
};

const backLink = (projectId: string) => (
  <Link href={`/staff/projects/${projectId}`}>← Back to project</Link>
);

export async function StaffTrelloProjectGate({
  projectId,
  needDeadline = false,
  signInMessage = "Please sign in to view Trello for this project.",
  children,
}: StaffTrelloProjectGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="stack">
        {backLink(projectId)}
        <p>{signInMessage}</p>
      </div>
    );
  }

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  let deadline: Awaited<ReturnType<typeof getProjectDeadline>> | null = null;

  try {
    team = await getTeamByUserAndProject(user.id, Number(projectId));
  } catch {
    team = null;
  }

  if (team && needDeadline) {
    try {
      deadline = await getProjectDeadline(user.id, Number(projectId));
    } catch {
      deadline = null;
    }
  }

  if (!team) {
    return (
      <div className="stack">
        {backLink(projectId)}
        <p>You do not have access to a team for this project.</p>
      </div>
    );
  }

  return <>{children({ projectId, teamId: team.id, teamName: team.teamName, deadline })}</>;
}
