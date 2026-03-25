import Link from "next/link";
import { redirect } from "next/navigation";
import { getModuleStudentProjectMatrix } from "@/features/modules/api/client";
import { ModuleJoinCodeBanner } from "@/features/modules/components/ModuleJoinCodeBanner";
import { resolveStaffModuleWorkspaceAccess } from "@/features/modules/staffModuleWorkspaceAccess";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ApiError } from "@/shared/api/errors";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleStudentsPage({ params }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const enc = encodeURIComponent(moduleId);
  const access = resolveStaffModuleWorkspaceAccess(ctx);
  const moduleJoinCode = `MOD-${ctx.parsedModuleId}`;
  const manageStudentAccessHref = access.staffModuleSetup
    ? `/staff/modules/${enc}/students/access`
    : access.enterpriseModuleEditor
      ? `/enterprise/modules/${enc}/edit#module-student-access`
      : null;

  let studentMatrix: Awaited<ReturnType<typeof getModuleStudentProjectMatrix>> | null = null;
  let studentMatrixDenied = false;
  let studentMatrixFailed = false;

  try {
    studentMatrix = await getModuleStudentProjectMatrix(ctx.parsedModuleId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      studentMatrixDenied = true;
    } else {
      studentMatrixFailed = true;
    }
  }

  const matrixColumnTemplate = studentMatrix
    ? [
        "minmax(10rem, 1.1fr)",
        "minmax(11rem, 1.25fr)",
        ...studentMatrix.projects.map(() => "minmax(8.5rem, 1fr)"),
      ].join(" ")
    : undefined;

  const matrixHeaders = studentMatrix
    ? [
        "Student",
        "Email",
        ...studentMatrix.projects.map((p) => (
          <Link
            key={`head-project-${p.id}`}
            href={`/staff/projects/${p.id}`}
            className="staff-module-students-matrix__project-head-link"
          >
            {p.name} ⤴︎
          </Link>
        )),
      ]
    : [];

  const matrixRows = studentMatrix
    ? studentMatrix.students.map((s) => {
        const cells = [
          s.displayName,
          s.email,
          ...s.teamCells.map((cell, idx) => {
            if (!cell) return <span className="muted">—</span>;
            const projectId = studentMatrix!.projects[idx]!.id;
            return (
              <Link
                key={`${s.userId}-${projectId}-${cell.teamId}`}
                href={`/staff/projects/${projectId}/teams/${cell.teamId}`}
                className="ui-link staff-module-students-matrix__team-link"
              >
                {cell.teamName}
              </Link>
            );
          }),
        ];
        return cells;
      })
    : [];

  return (
    <div className="stack module-workspace-students">
      <h2 className="overview-title">Student members</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Enrolled students, team placement per project, and where to manage enrollment.
      </p>

      <ModuleJoinCodeBanner moduleCode={moduleJoinCode} />

      <Card title="Enrollment">
        {manageStudentAccessHref ? (
          <p style={{ marginBottom: 12 }}>
            <Link href={manageStudentAccessHref} className="btn btn--primary">
              Manage access manually
            </Link>
          </p>
        ) : null}

        {access.enterpriseModuleEditor ? (
          <p className="muted">
            Manage student enrollment in the{" "}
            <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
              enterprise module editor
            </Link>
            .
          </p>
        ) : null}

        {access.staffModuleSetup ? (
          <p className="muted" style={{ marginTop: access.enterpriseModuleEditor ? 12 : manageStudentAccessHref ? 12 : 0 }}>
            Update module text and expectations from{" "}
            <Link href={`/staff/modules/${enc}/manage`} className="ui-link">
              Manage module
            </Link>
            .
          </p>
        ) : null}

        {!access.staffModuleSetup && !access.enterpriseModuleEditor ? (
          <p className="muted">Only module leads and administrators can change student enrollment.</p>
        ) : null}
      </Card>

      <h3 className="overview-title" style={{ marginTop: 28, fontSize: "1.15rem" }}>
        Students &amp; project teams
      </h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        Each column is a project in this module. Cells show the team that student is on, with a link to that
        team&apos;s staff page.
      </p>

      {studentMatrixDenied ? (
        <Card title="Student enrollment">
          <p className="muted">You don&apos;t have permission to view student enrollment for this module.</p>
        </Card>
      ) : studentMatrixFailed ? (
        <Card title="Students &amp; teams">
          <p className="muted">Could not load student and team data. Please try again later.</p>
        </Card>
      ) : studentMatrix && studentMatrix.projects.length === 0 ? (
        <Card title="Students &amp; teams">
          <p className="muted">This module has no projects yet.</p>
        </Card>
      ) : studentMatrix && studentMatrix.students.length === 0 ? (
        <Card title="Students &amp; teams">
          <p className="muted">No students are enrolled in this module yet.</p>
          {access.staffModuleSetup || access.enterpriseModuleEditor ? (
            <p className="muted" style={{ marginTop: 8 }}>
              {access.staffModuleSetup ? (
                <>
                  Enroll students from{" "}
                  <Link href={`/staff/modules/${enc}/manage`} className="ui-link">
                    Manage module
                  </Link>
                  {access.enterpriseModuleEditor ? (
                    <>
                      {" "}
                      or the{" "}
                      <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                        enterprise module editor
                      </Link>
                    </>
                  ) : null}
                  .
                </>
              ) : (
                <>
                  Enroll students in the{" "}
                  <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                    enterprise module editor
                  </Link>
                  .
                </>
              )}
            </p>
          ) : null}
        </Card>
      ) : studentMatrix ? (
        <Card title="Enrolled students by project">
          <div style={{ overflowX: "auto", marginTop: 4 }}>
            <Table headers={matrixHeaders} rows={matrixRows} columnTemplate={matrixColumnTemplate} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
