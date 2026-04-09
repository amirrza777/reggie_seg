import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { StaffModulesPageClient } from "@/features/modules/components/StaffModulesPageClient";
import { partitionStaffModulesByArchive } from "@/features/modules/lib/staffModuleListFilters";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffModulesPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let modules: Module[] = [];
  let errorMessage: string | null = null;

  try {
    const loaded = await listModules(user.id, { scope: "staff" });
    modules = partitionStaffModulesByArchive(loaded).unarchived;
  } catch {
    errorMessage = "Could not load your modules right now. Please try again.";
  }

  const subtitle = errorMessage
    ? "Could not load your modules right now."
    : modules.length > 0
      ? "Open a module to review progress, and manage projects and teams."
      : "You have no modules assigned.";

  return <StaffModulesPageClient modules={modules} subtitle={subtitle} errorMessage={errorMessage} />;
}
