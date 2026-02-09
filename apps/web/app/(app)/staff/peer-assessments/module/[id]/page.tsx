import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getModuleDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

// TODO: get staffId from authentication
async function getStaffId(): Promise<number> {
  return 1;
}

export default async function ModulePage({ params }: PageProps) {
  const { id } = await params;
  const moduleId = parseInt(id);
  const staffId = await getStaffId();

  try {
    const { module: moduleInfo, teams } = await getModuleDetails(staffId, moduleId);

    return (
      <div className="stack">
        <Placeholder
          title={moduleInfo.title}
          path={`/staff/peer-assessments/module/${id}`}
          description="Progress overview of this module's peer assessments."
        />
        <ProgressCardGrid
          items={teams}
          getHref={(item) =>
            `/staff/peer-assessments/module/${id}/team/${item.id ?? ""}`
          }
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <div className="stack">
          <p className="muted">
            You are not a module lead for this module. You don&apos;t have
            permission to view this page.
          </p>
        </div>
      );
    }
    return (
      <div className="stack">
        <p className="muted">
          Something went wrong loading this module. Please try again.
        </p>
      </div>
    );
  }
}
