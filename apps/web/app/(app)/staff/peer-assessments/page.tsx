/* Staff members can view the progress of peer assessments for each of the modules they manage */

import { Placeholder } from "@/shared/ui/Placeholder";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { getModulesSummary } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";

async function getStaffIdFromSession() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !user.isAdmin)) {
    throw new ApiError("You don’t have permission to view staff peer assessments.", { status: 403 });
  }
  return user.id;
}

export default async function StaffPeerAssessmentsPage() {
  let modules: Awaited<ReturnType<typeof getModulesSummary>> | null = null;
  let errorMessage: string | null = null;

  try {
    const staffId = await getStaffIdFromSession();
    modules = await getModulesSummary(staffId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage = "You don’t have permission to view staff peer assessments.";
    } else {
      errorMessage = "Something went wrong loading staff peer assessments. Please try again.";
    }
  }

  if (errorMessage || !modules) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="stack">
        <Placeholder
          title="All modules' peer assessments"
          description="No modules are currently available for your enterprise."
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <Placeholder
        title="All modules' peer assessments"
        description="Progress overview of peer assessments."
      />
      <ProgressCardGrid
        items={modules}
        getHref={(item) =>
          item.id == null ? undefined : `/staff/peer-assessments/module/${item.id}`
        }
      />
    </div>
  );
}