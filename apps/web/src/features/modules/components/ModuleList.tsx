import Link from "next/link";
import type { Module } from "../types";
import "@/features/modules/styles/module-list.css";

type ModuleListProps = {
  modules?: Module[];
  emptyMessage?: string;
};

function getRolePresentation(role?: Module["accountRole"]) {
  if (role === "OWNER") return { label: "Owner", tone: "owner" };
  if (role === "TEACHING_ASSISTANT") return { label: "Teaching assistant", tone: "assistant" };
  if (role === "ADMIN_ACCESS") return { label: "Admin access", tone: "admin" };
  return { label: "Enrolled", tone: "enrolled" };
}

export function ModuleList({
  modules = [],
  emptyMessage = "No modules assigned yet.",
}: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="module-list-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="module-list">
      <div className="module-list__grid">
        {modules.map((module) => {
          const numericId = Number(module.id);
          const moduleCode = Number.isFinite(numericId) ? `MOD-${numericId}` : module.id;
          const teams = module.teamCount ?? 0;
          const projects = module.projectCount ?? 0;
          const role = getRolePresentation(module.accountRole);
          const canManageModule = module.accountRole === "OWNER" || module.accountRole === "ADMIN_ACCESS";

          return (
            <article key={module.id} className="module-card card">
              <div className="module-card__header">
                <div className="module-card__header-top">
                  <h2 className="module-card__title">{module.title}</h2>
                  <span className={`module-card__role module-card__role--${role.tone}`}>
                    {role.label}
                  </span>
                </div>
                <p className="module-card__meta">Code: {moduleCode}</p>
              </div>
              {module.description ? (
                <p className="module-card__summary">{module.description}</p>
              ) : null}
              <div className="module-card__footer">
                <span className="module-card__counts">
                  {teams} team{teams === 1 ? "" : "s"} · {projects} project{projects === 1 ? "" : "s"}
                </span>
                <div className="module-card__actions">
                  {canManageModule ? (
                    <>
                      <Link href={`/staff/modules/${encodeURIComponent(module.id)}/manage`} className="module-card__manage">
                        Manage module
                      </Link>
                      <Link href={`/staff/projects/create?moduleId=${encodeURIComponent(module.id)}`} className="module-card__manage">
                        Create project
                      </Link>
                    </>
                  ) : null}
                  <Link href={`/modules/${encodeURIComponent(module.id)}`} className="module-card__cta">
                    View Module
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
