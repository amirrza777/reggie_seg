import { redirect } from "next/navigation";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";

export default async function TeamHealthPage() {
  const user = await getCurrentUser();
  if (!isElevatedStaff(user)) {
    redirect("/dashboard");
  }
  redirect("/staff/modules");
}
