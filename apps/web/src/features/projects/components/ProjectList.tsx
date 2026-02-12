import Link from "next/link";
import type { Project } from "../types";
import "@/features/projects/styles/project-list.css";

type ProjectListProps = {
  projects: Project[];
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="project-list-empty">
        <p>No projects found. You haven't been assigned to any projects yet.</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      <div className="project-list__grid">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="project-card card"
          >
            <div className="project-card__header">
              <h2 className="project-card__title">{project.name}</h2>
            </div>
            {project.summary && (
              <p className="project-card__summary">{project.summary}</p>
            )}
            <div className="project-card__footer">
              <span className="project-card__cta">View Project →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
