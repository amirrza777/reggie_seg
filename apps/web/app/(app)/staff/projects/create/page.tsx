import Link from "next/link";
import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { StaffProjectCreatePanel } from "@/features/staff/projects/components/StaffProjectCreatePanel";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

export default async function StaffCreateProjectPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let modules: Awaited<ReturnType<typeof listModules>> = [];
  let modulesError: string | null = null;
  try {
    modules = await listModules(user.id, { scope: "staff" });
  } catch (error) {
    modulesError = error instanceof Error ? error.message : "Failed to load staff modules.";
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Workspace</p>
        <h1 className="staff-projects__title">Create Project</h1>
        <p className="staff-projects__desc">
          Create a project under a module you lead and attach the questionnaire template students will complete.
        </p>
        <div className="staff-projects__meta">
          <Link href="/staff/projects" className="staff-projects__badge">
            Back to projects
          </Link>
        </div>
      </section>

      <StaffProjectCreatePanel modules={modules} modulesError={modulesError} />
    </div>
  );
}
