import Link from "next/link";
import { sortProjectsByTaskOpenDate } from "../lib/sortProjectsByTaskOpenDate";
import { formatDate } from "@/shared/lib/formatDate";
import { ArrowRightIcon } from "@/shared/ui/ArrowRightIcon";
import type { Project } from "../types";
import "@/features/projects/styles/project-list.css";

const PROJECT_LIST_DATE_LOCALE = "en-GB";

function taskOpenDateLabel(project: Project): string | null {
  const raw = project.taskOpenDate;
  if (raw == null || raw === "") return null;
  const label = formatDate(raw, PROJECT_LIST_DATE_LOCALE);
  return label ? `Starts ${label}` : null;
}

type ProjectListProps = {
  projects: Project[];
  projectMetaById?: Record<string, { completed: boolean; finishedUnmarked: boolean; mark: number | null }>;
  hideModuleLine?: boolean;
};

function formatMark(mark: number): string {
  const rounded = Number.isInteger(mark) ? String(mark) : mark.toFixed(1);
  return `${rounded}%`;
}

export function ProjectList({ projects, projectMetaById = {}, hideModuleLine = false }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="project-list-empty">
        <p>No projects found. You haven't been assigned to any projects yet.</p>
      </div>
    );
  }

  const sortedProjects = sortProjectsByTaskOpenDate(projects);

  return (
    <div className="project-list">
      <div className="project-list__grid">
        {sortedProjects.map((project) => {
          const startLabel = taskOpenDateLabel(project);
          const meta = projectMetaById[String(project.id)];
          const isCompleted = meta?.completed === true;
          const isFinishedUnmarked = meta?.finishedUnmarked === true;
          const isArchived = Boolean(project.archivedAt);
          const mark = typeof meta?.mark === "number" && Number.isFinite(meta.mark) ? meta.mark : null;
          const summary = (project as Project & { summary?: string | null }).summary;
          const markClass = `project-card__mark${isFinishedUnmarked ? " project-card__mark--awaiting" : ""}`;
          const cardClass = [
            "project-card card",
            isCompleted ? "project-card--completed" : "",
            isFinishedUnmarked ? "project-card--awaiting-mark" : "",
            isArchived ? "project-card--archived" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cardClass}
            >
              <div className="project-card__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 className="project-card__title">{project.name}</h2>
                  {isFinishedUnmarked ? (
                    <span className="project-card__status-badge project-card__status-badge--awaiting">
                      Awaiting mark
                    </span>
                  ) : null}
                  {project.archivedAt && (
                    <span style={{
                      fontSize: "var(--fs-fixed-0-7rem)",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--border)",
                      color: "var(--muted)",
                      letterSpacing: "0.03em",
                      whiteSpace: "nowrap",
                    }}>
                      Archived
                    </span>
                  )}
                </div>
                {startLabel ? <p className="project-card__dates">{startLabel}</p> : null}
                {!hideModuleLine ? (
                  <p className="project-card__module">
                    Module: {project.moduleName || "Module not assigned"}
                  </p>
                ) : null}
                {isCompleted || isFinishedUnmarked ? (
                  <p className={markClass}>
                    {isFinishedUnmarked
                      ? ""
                      : mark == null
                        ? "Final mark pending"
                        : `Final mark: ${formatMark(mark)}`}
                  </p>
                ) : null}
              </div>
              {summary ? (
                <p className="project-card__summary">{summary}</p>
              ) : null}
              <div className="project-card__footer">
                <span className="project-card__cta">
                  View Project <ArrowRightIcon />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
