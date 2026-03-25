import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string; path?: string[] }>;
};

export default async function StaffModuleScopedProjectRedirectPage({ params }: PageProps) {
  const { projectId, path } = await params;
  const suffix = Array.isArray(path) && path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : "";
  redirect(`/staff/projects/${encodeURIComponent(projectId)}${suffix}`);
}
