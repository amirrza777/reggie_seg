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

  let moduleInfo: Awaited<ReturnType<typeof getModuleDetails>>["module"] | null = null;
  let teams: Awaited<ReturnType<typeof getModuleDetails>>["teams"] = [];
  let errorMessage: string | null = null;

  try {
    const data = await getModuleDetails(staffId, moduleId);
    moduleInfo = data.module;
    teams = data.teams;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage =
        "You are not a module lead for this module. You don’t have permission to view this page.";
    } else {
      errorMessage = "Something went wrong loading this module. Please try again.";
    }
  }

  if (errorMessage || !moduleInfo) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

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
}
