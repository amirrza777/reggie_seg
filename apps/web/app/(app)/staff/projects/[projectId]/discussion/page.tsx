/* eslint-disable react-refresh/only-export-components */
import Link from "next/link";
import { DiscussionForumClient } from "@/features/forum/components/DiscussionForumClient";
import { StudentForumReportsCard } from "@/features/forum/components/StudentForumReportsCard";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import { getForumMembers, getForumSettings } from "@/features/forum/api/client";
import "@/features/staff/projects/styles/staff-projects.css";

export const metadata = { title: "Discussion Forum (Staff)" };

type StaffProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectDiscussionPage({ params }: StaffProjectDiscussionPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const userId = (await getCurrentUser())!.id;
  await getStaffProjectTeams(userId, numericProjectId);

  const [members, forumSettings] = await Promise.all([
    getForumMembers(userId, numericProjectId).catch(() => []),
    getForumSettings(userId, numericProjectId).catch(() => null),
  ]);

  const manageForumPrivacyHref = `/staff/projects/${encodeURIComponent(projectId)}/manage`;
  const forumPrivacyDescription =
    forumSettings?.forumIsAnonymous === true
      ? "Posts on the forum are anonymous and not linked to students."
      : forumSettings?.forumIsAnonymous === false
        ? "Student names are visible on posts."
        : "Forum privacy could not be loaded. You can still change it in project settings.";

  return (
    <>
      <p className="muted">
        {members.length} forum participant{members.length === 1 ? "" : "s"}
      </p>

      <section className="staff-projects__team-card" aria-label="Forum privacy settings">
        <h2 className="staff-projects__card-title">Forum privacy</h2>
        <div className="staff-projects__forum-privacy-row">
          <p className="staff-projects__forum-privacy-text">{forumPrivacyDescription}</p>
          <Link href={manageForumPrivacyHref} className="btn btn--ghost">
            Change
          </Link>
        </div>
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
