import Link from "next/link";
import { redirect } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import { getModuleStudentProjectMatrix } from "@/features/modules/api/client";
import { ModuleJoinCodeBanner } from "@/features/modules/components/ModuleJoinCodeBanner";
import { StaffModuleStudentProjectMatrix } from "@/features/modules/components/StaffModuleStudentProjectMatrix";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ApiError } from "@/shared/api/errors";
import { Card } from "@/shared/ui/Card";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function StaffModuleStudentsPage({ params }: PageProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) redirect("/staff/modules");

  const enc = encodeURIComponent(moduleId);
  const access = resolveStaffModuleWorkspaceAccess(ctx);

  const manageStudentAccessHref = !access.canEdit
    ? null
    : access.staffModuleSetup
      ? `/staff/modules/${enc}/students/access`
      : `/enterprise/modules/${enc}/edit#module-student-access`;

  let joinCodeFromApi: string | null = null;
  try {
    const joinRes = await getEnterpriseModuleJoinCode(ctx.parsedModuleId);
    joinCodeFromApi = joinRes.joinCode;
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 403 || e.status === 404))) {
      throw e;
    }
  }

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

  return (
    <div className="stack module-dashboard">
      <header className="module-workspace__section-header">
        <h2 className="overview-title">Student members</h2>
        <p className="muted">
          Enrolled students can be added to projects and participate in teams. Students can self-enrol via join code, or you can manage access manually.
        </p>
      </header>

      <div className="staff-module-students__enrollment-grid">
        <Card title="Joining code" className="module-workspace__card">
          {access.isArchived ? (
            <p className="muted">Self-enrollment is disabled while this module is archived.</p>
          ) : joinCodeFromApi ? (
            <p className="muted">
              Students can self-enroll using the join code via{" "}
              <Link href="/dashboard" className="ui-link ">
                <strong>join a module</strong>
              </Link>{" "}
              on their dashboard.
            </p>
          ) : (
            <p className="muted">
              The <strong>join code</strong> could not be loaded here. Open the{" "}
              {access.enterpriseModuleEditor ? (
                <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                  enterprise module editor
                </Link>
              ) : manageStudentAccessHref ? (
                <Link href={manageStudentAccessHref} className="ui-link">
                  access settings
                </Link>
              ) : (
                "module settings"
              )}{" "}
              to copy the join code if you have access.
            </p>
          )}
          {!access.isArchived && joinCodeFromApi ? <ModuleJoinCodeBanner joinCode={joinCodeFromApi} /> : null}
        </Card>

        <Card title="Manage access" className="module-workspace__card">
          {!access.canEdit ? (
            access.isArchived ? (
              <p className="muted">Manual enrollment changes are not available while this module is archived.</p>
            ) : (
              <p className="muted">Only module leads and administrators can change student enrollment.</p>
            )
          ) : (
            <>
              <p className="muted">Add or remove students manually.</p>
              {manageStudentAccessHref ? (
                <div>
                  <Link href={manageStudentAccessHref} className="btn btn--primary">
                    Manage access manually
                  </Link>
                </div>
              ) : null}

              {access.enterpriseModuleEditor ? (
                <p className="muted">
                  Full enrollment controls are in the{" "}
                  <Link href={`/enterprise/modules/${enc}/edit`} className="ui-link">
                    enterprise module editor
                  </Link>
                  .
                </p>
              ) : null}
            </>
          )}
        </Card>
      </div>

      {studentMatrixDenied ? (
        <Card title="Students & project teams" className="module-workspace__card">
          <p className="muted">You don&apos;t have permission to view student enrollment for this module.</p>
        </Card>
      ) : studentMatrixFailed ? (
        <Card title="Students & project teams" className="module-workspace__card">
          <p className="muted">Could not load student and team data. Please try again later.</p>
        </Card>
      ) : studentMatrix && studentMatrix.projects.length === 0 ? (
        <Card title="Students & project teams" className="module-workspace__card">
          <p className="muted">This module has no projects yet.</p>
        </Card>
      ) : studentMatrix && studentMatrix.students.length === 0 ? (
        <Card title="Students & project teams" className="module-workspace__card">
          <p className="muted">No students are enrolled in this module yet.</p>
          {access.canEdit ? (
            <p className="muted">
              {access.staffModuleSetup ? (
                <>
                  Enroll students from{" "}
                  <Link href={`/staff/modules/${enc}/manage`} className="ui-link">
                    Module settings
                  </Link>
                  {access.enterpriseModuleEditor ? (
                    <>
                      {" "}or the{" "}
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
        <Card title="Enrolled students by project" className="module-workspace__card">
          <p className="muted">Each column is a project in this module. Cells link to that team&apos;s page.</p>
          <StaffModuleStudentProjectMatrix
            moduleRouteParam={moduleId}
            projects={studentMatrix.projects}
            students={studentMatrix.students}
          />
        </Card>
      ) : null}
    </div>
  );
}
