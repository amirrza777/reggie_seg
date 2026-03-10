import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";

export default async function StaffQuestionnairesLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!isElevatedStaff(user)) {
    redirect("/dashboard");
  }

  return children;
}
