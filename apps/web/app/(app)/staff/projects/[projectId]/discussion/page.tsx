/* eslint-disable react-refresh/only-export-components */
import { redirect } from "next/navigation";
import { DiscussionForumClient } from "@/features/forum/components/DiscussionForumClient";
import { ForumSettingsCard } from "@/features/forum/components/ForumSettingsCard";
import { StudentForumReportsCard } from "@/features/forum/components/StudentForumReportsCard";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import { getCurrentUser } from "@/shared/auth/session";
import { getForumMembers } from "@/features/forum/api/client";
import "@/features/staff/projects/styles/staff-projects.css";

export const metadata = { title: "Discussion Forum (Staff)" };

type StaffProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectDiscussionPage({ params }: StaffProjectDiscussionPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId } = await params;
  const loadResult = await loadStaffProjectTeamsForPage(user.id, projectId, "Failed to load project forum settings.");
  if (loadResult.status === "invalid_project_id") {
    return <p className="muted">Invalid project ID.</p>;
  }
  if (loadResult.status === "error") {
    return (
      <div className="stack">
        <p className="muted">{loadResult.message}</p>
      </div>
    );
  }
  const { numericProjectId } = loadResult;

  const members = await getForumMembers(user.id, numericProjectId).catch(() => []);

  return (
    <>
      <p className="muted">
        {members.length} forum participant{members.length === 1 ? "" : "s"}
      </p>

      <section className="staff-projects__team-card" aria-label="Forum privacy settings">
        <h2 className="staff-projects__card-title">Forum privacy</h2>
        <p className="staff-projects__card-sub">
          Choose whether student names should be visible in the forum.
        </p>
        <ForumSettingsCard projectId={numericProjectId} />
      </section>

      <section className="staff-projects__team-card" aria-label="Student forum reports">
        <StudentForumReportsCard projectId={numericProjectId} />
      </section>

      <section className="staff-projects__team-card" aria-label="Discussion forum">
        <h2 className="staff-projects__card-title">Discussion Forum</h2>
        <p className="staff-projects__card-sub">
          View and participate in the forum as staff.
        </p>
        <DiscussionForumClient
          projectId={projectId}
          showHeader={false}
          members={members}
        />
      </section>
    </>
  );
}
