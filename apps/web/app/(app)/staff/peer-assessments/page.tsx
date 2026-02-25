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
  let staffId: number | null = null;
  let modules;
  let errorMessage: string | null = null;

  try {
    staffId = await getStaffIdFromSession();
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

  return (
    <div className="stack">
      <Placeholder
        title="All modules' peer assessments"
        path="/staff/peer-assessments"
        description="Progress overview of peer assessments."
      />
      <ProgressCardGrid
        items={modules}
        getHref={(item) => `/staff/peer-assessments/module/${item.id ?? ""}`}
      />
    </div>
  );
}
