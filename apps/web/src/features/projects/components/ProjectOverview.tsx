import { Card } from "@/shared/ui/Card";
import type { Project } from "../types";

type ProjectOverviewProps = {
  project?: Project;
};

const fallbackProject: Project = {
  id: "project-123",
  name: "Capstone Project",
};

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const data = project ?? fallbackProject;
  return (
    <Card title={data.name}>
      <p className="lede">Project overview.</p>
      <dl>
        <dt>ID</dt>
        <dd>{data.id}</dd>
      </dl>
    </Card>
  );
}
