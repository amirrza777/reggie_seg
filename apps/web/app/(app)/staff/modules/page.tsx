import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { StaffModulesPageClient } from "@/features/modules/components/StaffModulesPageClient";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffModulesPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let modules: Module[] = [];
  let errorMessage: string | null = null;

  try {
    modules = await listModules(user.id, { scope: "staff" });
  } catch {
    errorMessage = "Could not load your modules right now. Please try again.";
  }

  const subtitle = errorMessage
    ? "Could not load your modules right now."
    : modules.length > 0
      ? "Open a module to review teams/projects, or use Manage module for module-level setup."
      : "You have no modules assigned.";

  return <StaffModulesPageClient modules={modules} subtitle={subtitle} errorMessage={errorMessage} />;
}
