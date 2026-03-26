import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { ModuleDashboardPageView } from "@/features/modules/components/ModuleDashboard";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getCurrentUser } from "@/shared/auth/session";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function ModulePage({ params }: ModulePageProps) {
  const { moduleId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let modules: Module[] = [];
  try {
    modules = await listModules(user.id);
  } catch {
    modules = [];
  }

  const module = modules.find((item) => String(item.id) === moduleId);
  if (!module) notFound();

  const dashboard = buildModuleDashboardData(module);

  return <ModuleDashboardPageView dashboard={dashboard} />;
}
