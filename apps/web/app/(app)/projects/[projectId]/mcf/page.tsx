import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { getMyMcfRequests, getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Card } from "@/shared/ui/Card";
import { McfRequestPanel } from "@/features/projects/components/McfRequestPanel";
import type { MCFRequest } from "@/features/projects/types";

type ProjectMcfPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMcfPage({ params }: ProjectMcfPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="stack stack--tabbed" style={{ gap: 16 }}>
        <ProjectNav projectId={projectId} />
        <div style={{ padding: 24 }}>
          <p>Please sign in to submit an MCF request.</p>
          <Link href="/login">Go to login</Link>
        </div>
      </div>
    );
  }

  if (Number.isNaN(numericProjectId)) {
    return (
      <div className="stack stack--tabbed" style={{ gap: 16 }}>
        <ProjectNav projectId={projectId} />
        <div style={{ padding: 24 }}>
          <p>Invalid project ID.</p>
          <Link href="/projects">Back to projects</Link>
        </div>
      </div>
    );
  }

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  try {
    team = await getTeamByUserAndProject(user.id, numericProjectId);
  } catch {
    team = null;
  }

  if (!team) {
    return (
      <div className="stack stack--tabbed" style={{ gap: 16 }}>
        <ProjectNav projectId={projectId} />
        <div style={{ padding: 24 }}>
          <p>You are not in a team for this project.</p>
          <Link href={`/projects/${projectId}`}>Back to project overview</Link>
        </div>
      </div>
    );
  }

  let initialRequests: MCFRequest[] = [];
  let loadError: string | null = null;
  try {
    initialRequests = await getMyMcfRequests(numericProjectId, user.id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load existing MCF requests.";
  }

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      <div style={{ padding: 20 }}>
        <Card title="MCF Request">
          <McfRequestPanel
            projectId={numericProjectId}
            userId={user.id}
            teamName={team.teamName}
            initialRequests={initialRequests}
          />
          {loadError ? <p className="error">{loadError}</p> : null}
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 18 }}>
            <Link
              href={`/projects/${projectId}`}
              className="btn btn--quiet"
              style={{ padding: "12px 24px" }}
            >
              Back
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
