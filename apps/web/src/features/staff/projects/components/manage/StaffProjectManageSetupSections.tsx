"use client";

import Link from "next/link";
import type { ProjectWarningsConfig, StaffProjectManageSummary } from "@/features/projects/types";
import { Card } from "@/shared/ui/Card";
import { StaffProjectManageSetupProvider } from "./StaffProjectManageSetupContext";
import { StaffProjectManageArchiveOrDeleteSection } from "./sections/StaffProjectManageArchiveOrDeleteSection";
import { StaffProjectManageFeatureFlagsSection } from "./sections/StaffProjectManageFeatureFlagsSection";
import { StaffProjectManageForumSection } from "./sections/StaffProjectManageForumSection";
import { StaffProjectManageInfoBoardSection } from "./sections/StaffProjectManageInfoBoardSection";
import { StaffProjectManagePeerTemplateSection } from "./sections/StaffProjectManagePeerTemplateSection";
import { StaffProjectManageProjectAccessSection } from "./sections/StaffProjectManageProjectAccessSection";
import { StaffProjectManageProjectDeadlinesSection } from "./sections/StaffProjectManageProjectDeadlinesSection";
import { StaffProjectManageProjectNameSection } from "./sections/StaffProjectManageProjectNameSection";
import { StaffProjectManageWarningsSection } from "./sections/StaffProjectManageWarningsSection";

const MANAGE_PROJECT_DESCRIPTION_EDITABLE =
  "Update project details, student information board, deadlines, staff and student access, peer assessment questionnaire, forum privacy, student tabs, and automatic warning configuration from the staff workspace.";

const MANAGE_PROJECT_DESCRIPTION_READ_ONLY =
  "Settings are read-only while this project is archived. You can unarchive it, or its module, to restore editing.";

const MANAGE_PROJECT_DESCRIPTION_READ_ONLY_NON_LEAD =
  "You can review project settings here. Only module leads and administrators can make changes.";

export type StaffProjectManageSetupSectionsProps = {
  projectId: number;
  initial: StaffProjectManageSummary;
  warningsOk: boolean;
  warningsConfig: ProjectWarningsConfig | null;
  overviewHref: string;
  discussionHref: string;
  warningsTabHref: string;
};

export function StaffProjectManageSetupSections({
  projectId,
  initial,
  warningsOk,
  warningsConfig,
  overviewHref,
  discussionHref,
  warningsTabHref,
}: StaffProjectManageSetupSectionsProps) {
  const projectSettingsReadOnly =
    Boolean(initial.archivedAt) || Boolean(initial.moduleArchivedAt) || initial.canMutateProjectSettings === false;

  const readOnlyDescription = (() => {
    if (Boolean(initial.archivedAt) || Boolean(initial.moduleArchivedAt)) {
      return MANAGE_PROJECT_DESCRIPTION_READ_ONLY;
    }
    if (initial.canMutateProjectSettings === false) {
      return MANAGE_PROJECT_DESCRIPTION_READ_ONLY_NON_LEAD;
    }
    return MANAGE_PROJECT_DESCRIPTION_READ_ONLY;
  })();

  return (
    <div className="ui-page enterprise-module-create-page enterprise-module-create-page--embedded">
      <header className="ui-page__header">
        <div className="ui-toolbar ui-toolbar--between enterprise-module-create-page__header-toolbar">
          <h1 className="overview-title ui-page__title">Manage project</h1>
          <Link href={overviewHref} className="btn btn--ghost enterprise-module-create-page__header-back">
            Back to project
          </Link>
        </div>
        {projectSettingsReadOnly ? (
          <p className="ui-note ui-note--muted" role="status">
            {readOnlyDescription}
          </p>
        ) : (
          <p className="ui-page__description">{MANAGE_PROJECT_DESCRIPTION_EDITABLE}</p>
        )}
      </header>

      <Card title=" " className="enterprise-module-create__card">
        <div className="stack">
          <StaffProjectManageSetupProvider projectId={projectId} initial={initial}>
            <StaffProjectManageProjectNameSection />
            <StaffProjectManageInfoBoardSection />
            <StaffProjectManageProjectDeadlinesSection />
            <StaffProjectManageProjectAccessSection />
            <StaffProjectManagePeerTemplateSection />
            <StaffProjectManageForumSection discussionHref={discussionHref} />
            <StaffProjectManageFeatureFlagsSection />
            <StaffProjectManageWarningsSection
              warningsOk={warningsOk}
              warningsConfig={warningsConfig}
              warningsTabHref={warningsTabHref}
            />
            <StaffProjectManageArchiveOrDeleteSection />
          </StaffProjectManageSetupProvider>
        </div>
      </Card>
    </div>
  );
}
