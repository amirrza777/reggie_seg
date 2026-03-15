import Link from "next/link";
import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { ModuleList } from "@/features/modules/components/ModuleList";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffModulesPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let modules: Module[] = [];
  let errorMessage: string | null = null;

  try {
    modules = await listModules(user.id, { scope: "staff" });
  } catch {
    errorMessage = "Could not load your modules right now. Please try again.";
  }

  const subtitle = errorMessage
    ? "Could not load your modules right now."
    : modules.length > 0
      ? "Open a module to review teams/projects, or use Manage module for module-level setup."
      : "You have no modules assigned.";

  return (
    <div className="stack ui-page projects-panel">
      <header className="projects-panel__header">
        <h1 className="projects-panel__title">My Modules</h1>
        <p className="projects-panel__subtitle">{subtitle}</p>
        <div className="staff-projects__meta">
          <Link href="/staff/projects" className="staff-projects__badge">
            Open staff projects
          </Link>
        </div>
      </header>
      {errorMessage ? (
        <p className="muted">{errorMessage}</p>
      ) : (
        <ModuleList
          modules={modules}
          emptyMessage="No modules are currently assigned to your account."
        />
      )}
    </div>
  );
}
