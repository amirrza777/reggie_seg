import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { StaffProjectCreatePanel } from "@/features/staff/projects/components/StaffProjectCreatePanel";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import Link from "next/link";

type StaffCreateProjectPageProps = {
  searchParams?: Promise<{ moduleId?: string }>;
};

function toStaffModuleLoadError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default async function StaffCreateProjectPage({ searchParams }: StaffCreateProjectPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialModuleId = typeof resolvedSearchParams?.moduleId === "string" ? resolvedSearchParams.moduleId : null;

  let modules: Awaited<ReturnType<typeof listModules>> = [];
  let modulesError: string | null = null;
  try {
    modules = await listModules(user.id, { scope: "staff", compact: true });
  } catch (error) {
    modulesError = toStaffModuleLoadError(error, "Failed to load staff modules.");
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Workspace</p>
        <h1 className="staff-projects__title">Create Project</h1>
        <p className="staff-projects__desc">
          Create a project under a module you lead, assign the peer-assessment template, and publish the full deadline timeline.
        </p>
        <div className="staff-projects__meta">
          <Link
            href={
              initialModuleId
                ? `/staff/modules/${encodeURIComponent(initialModuleId)}`
                : "/staff/modules"
            }
            className="staff-projects__badge"
          >
            {initialModuleId ? "Back to module" : "Back to my modules"}
          </Link>
        </div>
      </section>

      <section className="staff-projects__create-layout">
        <StaffProjectCreatePanel
          currentUserId={user.id}
          modules={modules}
          modulesError={modulesError}
          initialModuleId={initialModuleId}
        />
        <aside className="staff-projects__create-guide" aria-label="Project creation guidance">
          <h2 className="staff-projects__create-title">Before you publish</h2>
          <ol className="staff-projects__guide-list">
            <li>Use a template that already matches the rubric for this module.</li>
            <li>Check deadline sequencing and timezone assumptions with co-leads.</li>
            <li>Create the project first, then review teams and overrides if needed.</li>
          </ol>
          <p className="staff-projects__hint">
            Module leads create projects by default. Enterprise admins can override when needed.
            Students and teaching assistants can still view project timelines once published.
          </p>
        </aside>
      </section>
    </div>
  );
}
