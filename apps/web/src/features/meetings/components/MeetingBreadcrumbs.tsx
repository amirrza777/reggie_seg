import { Breadcrumbs, type BreadcrumbItem } from "@/shared/layout/Breadcrumbs";

type MeetingBreadcrumbsProps = {
  projectId: number;
  meetingId?: number;
  currentLabel: string;
  meetingsHref?: string;
};

export function MeetingBreadcrumbs({ projectId, meetingId, currentLabel, meetingsHref }: MeetingBreadcrumbsProps) {
  const projectHref = `/projects/${projectId}`;
  const resolvedMeetingsHref = meetingsHref ?? `${projectHref}/meetings`;
  const items: BreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    { label: `Project ${projectId}`, href: projectHref },
    { label: "Meetings", href: resolvedMeetingsHref },
  ];

  if (meetingId != null) {
    items.push({ label: "Meeting", href: `${projectHref}/meetings/${meetingId}` });
  }
  items.push({ label: currentLabel });

  return <Breadcrumbs items={items} />;
}
