import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getModuleDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getStaffIdFromSession() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !user.isAdmin)) {
    throw new ApiError("You don’t have permission to view staff peer assessments.", { status: 403 });
  }
  return user.id;
}

export default async function ModulePage({ params }: PageProps) {
  const { id } = await params;
  const moduleId = Number.parseInt(id, 10);
  if (Number.isNaN(moduleId)) {
    return (
      <div className="stack">
        <p className="muted">Invalid module route. Please open the module from the staff list.</p>
      </div>
    );
  }
  let staffId: number | null = null;

  let moduleInfo: Awaited<ReturnType<typeof getModuleDetails>>["module"] | null = null;
  let teams: Awaited<ReturnType<typeof getModuleDetails>>["teams"] = [];
  let errorMessage: string | null = null;

  try {
    staffId = await getStaffIdFromSession();
    const data = await getModuleDetails(staffId, moduleId);
    moduleInfo = data.module;
    teams = data.teams;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage = "You don’t have permission to view staff peer assessments.";
    } else if (error instanceof ApiError && error.status === 404) {
      errorMessage = "This module was not found.";
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
        description="Progress overview of this module's peer assessments."
      />
      {teams.length === 0 ? (
        <p className="muted">
          No teams are currently available in this module.
        </p>
      ) : (
        <ProgressCardGrid
          items={teams}
          getHref={(item) =>
            item.id == null ? undefined : `/staff/peer-assessments/module/${id}/team/${item.id}`
          }
        />
      )}
    </div>
  );
}