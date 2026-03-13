import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getFeatureFlagMap } from "@/shared/featureFlags";

export const metadata = { title: "Discussion Forum" };

type ProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDiscussionPage({ params }: ProjectDiscussionPageProps) {
  const { projectId } = await params;
  const flagMap = await getFeatureFlagMap();

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
      <section className="stack" style={{ padding: 24 }}>
        <h1>Discussion Forum</h1>
        <p className="muted">
          This space is reserved for the project discussion forum. Content coming soon.
        </p>
      </section>
    </div>
  );
}
