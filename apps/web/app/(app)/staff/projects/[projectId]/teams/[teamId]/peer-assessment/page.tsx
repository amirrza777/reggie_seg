import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails, getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffPeerMemberDualProgressGrid } from "@/features/staff/projects/components/StaffPeerMemberDualProgressGrid";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffPeerAssessmentSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { user, project, team } = ctx;

  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let detailError: string | null = null;
  try {
    const detailData = await getTeamDetails(user.id, project.moduleId, team.id);
    students = detailData.students;
  } catch (error) {
    detailError = error instanceof Error ? error.message : "Failed to load peer assessment data.";
  }

  const receivedByStudentId = new Map<
    number,
    { received: number; expected: number; error?: boolean }
  >();

  if (!detailError && students.length > 0) {
    await Promise.all(
      students
        .filter((s): s is typeof s & { id: number } => s.id != null)
        .map(async (student) => {
          try {
            const details = await getStudentDetails(
              user.id,
              project.moduleId,
              team.id,
              student.id
            );
            const peers = details.teamMembers.filter((m) => m.id !== student.id);
            const received = peers.filter((m) => m.reviewedCurrentStudent).length;
            receivedByStudentId.set(student.id, {
              received,
              expected: peers.length,
            });
          } catch {
            receivedByStudentId.set(student.id, {
              received: 0,
              expected: student.expected,
              error: true,
            });
          }
        })
    );
  }

  const gridItems = students.map((student, index) => {
    const sid = student.id;
    const recv =
      sid != null
        ? receivedByStudentId.get(sid)
        : undefined;

    return {
      id: sid ?? -(index + 1),
      title: student.title,
      givenSubmitted: student.submitted,
      givenExpected: student.expected,
      receivedSubmitted: recv?.received ?? 0,
      receivedExpected: recv?.expected ?? student.expected,
      href:
        sid != null
          ? `/staff/projects/${project.id}/teams/${team.id}/peer-assessment/${sid}`
          : undefined,
    };
  });

  return (
    <section className="staff-projects__team-card">
      <h3 style={{ margin: 0 }}>Peer assessments by student</h3>
      <p className="muted" style={{ margin: 0 }}>
        Track assessments each student has written about teammates and assessments they have received. Open a student to
        see detail grouped by teammate. Written feedback responses on received assessments appear under{" "}
        <strong>Assessments received</strong>.
      </p>
      {detailError ? <p className="muted" style={{ marginTop: 8 }}>{detailError}</p> : null}
      {!detailError && students.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          No student allocation data is available for this team yet.
        </p>
      ) : null}
      {!detailError && students.length > 0 ? <StaffPeerMemberDualProgressGrid items={gridItems} /> : null}
    </section>
  );
}