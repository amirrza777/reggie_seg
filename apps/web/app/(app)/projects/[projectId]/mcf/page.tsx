import Link from "next/link";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { Card } from "@/shared/ui/Card";

type ProjectMcfPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectMcfPage({ params }: ProjectMcfPageProps) {
  const { projectId } = await params;

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId} />
      <div style={{ padding: 20 }}>
        <Card title="MCF">
          <p className="muted">MCF page placeholder. Content will be added here.</p>
          <Link href={`/projects/${projectId}`}>Back to project overview</Link>
        </Card>
      </div>
    </div>
  );
}
