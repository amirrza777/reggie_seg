import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect(getDefaultSpaceOverviewPath(user));
}
