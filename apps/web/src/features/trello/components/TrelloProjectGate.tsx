import React, { type ReactNode } from "react";
import { getProjectDeadline, getTeamByUserAndProject } from "../../projects/api/client";
import { getCurrentUser } from "../../../shared/auth/session";

export type TrelloProjectGateChildProps = {
  projectId: string;
  teamId: number;
  teamName?: string;
  deadline?: Awaited<ReturnType<typeof getProjectDeadline>> | null;
};

export type TrelloProjectGateProps = {
  projectId: string;
  needDeadline?: boolean;
  signInMessage?: string;
  children: (props: TrelloProjectGateChildProps) => ReactNode;
};

export async function TrelloProjectGate({
  projectId,
  needDeadline = false,
  signInMessage = "Please sign in to view Trello for this project.",
  children,
}: TrelloProjectGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="stack">
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
        <p>You are not in a team for this project.</p>
      </div>
    );
  }

  return <>{children({ projectId, teamId: team.id, teamName: team.teamName, deadline })}</>;
}
