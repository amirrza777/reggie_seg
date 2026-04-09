"use client";

import Link from "next/link";
import { ForumSettingsCard } from "@/features/forum/components/ForumSettingsCard";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

type StaffProjectManageForumSectionProps = {
  discussionHref: string;
};

export function StaffProjectManageForumSection({ discussionHref }: StaffProjectManageForumSectionProps) {
  const { projectId, detailsDisabled } = useStaffProjectManageSetup();

  return (
    <StaffProjectManageFormCollapsible title="Forum privacy" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        <Link href={discussionHref} className="ui-link">
         Open discussion forum →
        </Link>
      </p>
      <ForumSettingsCard projectId={projectId} readOnly={detailsDisabled} />
    </StaffProjectManageFormCollapsible>
  );
}
