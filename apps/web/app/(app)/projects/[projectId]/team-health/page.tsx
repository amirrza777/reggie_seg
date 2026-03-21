import Link from "next/link";
import { getCurrentUser } from "@/shared/auth/session";
import { getMyTeamHealthMessages, getMyTeamWarnings, getTeamByUserAndProject } from "@/features/projects/api/client";
import { Card } from "@/shared/ui/Card";
import { TeamHealthMessagePanel } from "@/features/projects/components/TeamHealthMessagePanel";
import type { TeamHealthMessage, TeamWarning } from "@/features/projects/types";

type ProjectTeamHealthPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamHealthPage({ params }: ProjectTeamHealthPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p>Please sign in to submit a team health message.</p>
        <Link href="/login">Go to login</Link>
      </div>
    );
  }

  if (Number.isNaN(numericProjectId)) {
    return (
      <div style={{ padding: 24 }}>
        <p>Invalid project ID.</p>
        <Link href="/projects">Back to projects</Link>
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
      <div style={{ padding: 24 }}>
        <p>You are not in a team for this project.</p>
        <Link href={`/projects/${projectId}`}>Back to project overview</Link>
      </div>
    );
  }

  let initialRequests: TeamHealthMessage[] = [];
  let initialWarnings: TeamWarning[] = [];
  let loadError: string | null = null;
  let warningsLoadError: string | null = null;
  try {
    initialRequests = await getMyTeamHealthMessages(numericProjectId, user.id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load existing team health messages.";
  }
  try {
    initialWarnings = await getMyTeamWarnings(numericProjectId, user.id);
  } catch (error) {
    warningsLoadError = error instanceof Error ? error.message : "Failed to load team warnings.";
  }

  const activeWarnings = initialWarnings.filter((warning) => warning.active);
  return (
    <div style={{ padding: 20 }}>
      <Card title="Team Health">
        <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Warnings</h3>
          {activeWarnings.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No warnings for your team right now.
            </p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {activeWarnings.map((warning) => (
                <article
                  key={warning.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    background:
                      warning.severity === "HIGH"
                        ? "color-mix(in srgb, var(--status-danger-text) 12%, var(--surface))"
                        : warning.severity === "MEDIUM"
                          ? "color-mix(in srgb, var(--status-warning-text) 12%, var(--surface))"
                          : "color-mix(in srgb, var(--status-success-text) 12%, var(--surface))",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>{warning.title}</p>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{warning.details}</p>
                </article>
              ))}
            </div>
          )}
          {warningsLoadError ? <p className="error" style={{ margin: 0 }}>{warningsLoadError}</p> : null}
        </div>

        <TeamHealthMessagePanel
          projectId={numericProjectId}
          userId={user.id}
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
  );
}
