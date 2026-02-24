import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

// Redirect staff root to the overview dashboard
export default async function StaffIndexPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  redirect("/staff/dashboard");
}
