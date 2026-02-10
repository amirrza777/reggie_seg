import { getProject, getProjectDeadline } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { formatDateTime } from "@/shared/lib/dateFormatter";


type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  
  
  const project = await getProject(projectId);
  const deadline = await getProjectDeadline(4, Number(projectId));
  
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <div style={{ padding: "20px" }}>
        <h1>{project?.name || "Project"}</h1>
        <p style={{ color: "#666", marginTop: "8px" }}>
          Project ID: {projectId}
          <br />
          Project deadline: {formatDateTime(deadline.taskDueDate)}
          <br />
          Assessment opening: {formatDateTime(deadline.assessmentOpenDate)}
          <br />
          Assessment deadline: {formatDateTime(deadline.assessmentDueDate)}
          <br />
          Feedback opening: {formatDateTime(deadline.feedbackOpenDate)}
          <br />
          Feedback deadline: {formatDateTime(deadline.feedbackDueDate)}
        </p>
      </div>
    </div>
  );
}
