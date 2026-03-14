import { MeetingDetailContent } from "@/features/meetings/components/MeetingDetailContent";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";

type MeetingPageProps = {
  params: Promise<{ projectId: string; meetingId: string }>;
};

export default async function MeetingPage({ params }: MeetingPageProps) {
  const { projectId, meetingId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, numericProjectId);

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      <MeetingDetailContent meetingId={Number(meetingId)} />
    </div>
  );
}
