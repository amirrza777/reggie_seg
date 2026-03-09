import { StaffProjectNav } from "@/features/staff/trello/StaffProjectNav";

type LayoutProps = {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
};

export default async function StaffProjectLayout({ params, children }: LayoutProps) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <StaffProjectNav projectId={projectId} />
      {children}
    </div>
  );
}
