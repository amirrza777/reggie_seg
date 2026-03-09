import { getProject } from "@/features/projects/api/client";
import type { Project } from "@/features/projects/types";
import { getCurrentUser } from "@/shared/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let project: Project | null = null;
  try {
    project = await getProject(projectId);
  } catch {
    project = null;
  }

  if (!project) {
    return (
      <div className="stack">
        <Link href="/staff/projects">← Back to projects</Link>
        <p className="muted">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>{project.name}</h1>
      <p className="muted">Staff view: read-only.</p>
      <p>
        <Link href={`/staff/projects/${projectId}/trello`} className="pill-nav__link">
          View Trello →
        </Link>
      </p>
    </div>
  );
}
