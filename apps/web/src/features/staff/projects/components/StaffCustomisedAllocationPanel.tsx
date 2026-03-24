"use client";

import { StaffCustomisedAllocationCriteriaStep } from "./StaffCustomisedAllocationCriteriaStep";
import { StaffCustomisedAllocationControls } from "./StaffCustomisedAllocationControls";
import { StaffCustomisedAllocationQuestionnaireStep } from "./StaffCustomisedAllocationQuestionnaireStep";
import { StaffCustomisedAllocationResults } from "./StaffCustomisedAllocationResults";
import { useCustomisedAllocation } from "./useCustomisedAllocation";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffCustomisedAllocationPanelProps = {
  projectId: number;
  initialTeamCount: number;
};

export function StaffCustomisedAllocationPanel({
  projectId,
  initialTeamCount,
}: StaffCustomisedAllocationPanelProps) {
  const allocation = useCustomisedAllocation({ projectId, initialTeamCount });

  return (
    <section
      className="staff-projects__custom-panel"
      aria-label={`Customised allocation panel for project ${projectId}`}
    >
      <StaffCustomisedAllocationQuestionnaireStep
        questionnaireSearch={allocation.questionnaireSearch}
        onQuestionnaireSearchChange={allocation.setQuestionnaireSearch}
        selectedTemplateId={allocation.selectedTemplateId}
        onSelectTemplate={allocation.onSelectTemplate}
        isLoadingQuestionnaires={allocation.isLoadingQuestionnaires}
        eligibleQuestionnaires={allocation.eligibleQuestionnaires}
        visibleQuestionnaires={allocation.visibleQuestionnaires}
        selectedQuestionnaire={allocation.selectedQuestionnaire}
        activeCriteriaCount={allocation.activeCriteriaCount}
        isLoadingCoverage={allocation.isLoadingCoverage}
        coverageError={allocation.coverageError}
        loadError={allocation.loadError}
        coverage={allocation.coverage}
        hasLowCoverage={allocation.hasLowCoverage}
        nonRespondentStrategy={allocation.nonRespondentStrategy}
        onNonRespondentStrategyChange={allocation.onNonRespondentStrategyChange}
        confirmApply={allocation.confirmApply}
        isPreviewPending={allocation.isPreviewPending}
        isApplyPending={allocation.isApplyPending}
      />

      <StaffCustomisedAllocationCriteriaStep
        criteriaQuestions={allocation.criteriaQuestions}
        criteriaConfigByQuestionId={allocation.criteriaConfigByQuestionId}
        updateStrategy={allocation.updateStrategy}
        updateWeight={allocation.updateWeight}
        confirmApply={allocation.confirmApply}
        isPreviewPending={allocation.isPreviewPending}
        isApplyPending={allocation.isApplyPending}
      />

      <div className="staff-projects__custom-step">
        <h4 className="staff-projects__custom-step-title">Step 3: Generate Preview</h4>
        <StaffCustomisedAllocationControls
          teamCountInput={allocation.teamCountInput}
          onTeamCountInputChange={allocation.onTeamCountInputChange}
          minTeamSizeInput={allocation.minTeamSizeInput}
          onMinTeamSizeInputChange={allocation.onMinTeamSizeInputChange}
          maxTeamSizeInput={allocation.maxTeamSizeInput}
          onMaxTeamSizeInputChange={allocation.onMaxTeamSizeInputChange}
          runPreview={allocation.runPreview}
          runApplyAllocation={allocation.runApplyAllocation}
          canPreparePreview={allocation.canPreparePreview}
          isLoadingCoverage={allocation.isLoadingCoverage}
          confirmApply={allocation.confirmApply}
          isPreviewPending={allocation.isPreviewPending}
          isApplyPending={allocation.isApplyPending}
          isPreviewCurrent={allocation.isPreviewCurrent}
          hasPreview={allocation.preview !== null}
          errorMessage={allocation.errorMessage}
          successMessage={allocation.successMessage}
        />

        {allocation.preview ? (
          <StaffCustomisedAllocationResults
            preview={allocation.preview}
            confirmApply={allocation.confirmApply}
            toggleConfirmAllocation={allocation.toggleConfirmAllocation}
            isPreviewCurrent={allocation.isPreviewCurrent}
            isPreviewPending={allocation.isPreviewPending}
            isApplyPending={allocation.isApplyPending}
            unassignedStudents={allocation.unassignedStudents}
            questionLabelById={allocation.questionLabelById}
            getTeamName={allocation.getTeamName}
            renamingTeams={allocation.renamingTeams}
            onTeamNameChange={allocation.onTeamNameChange}
            onToggleTeamRename={allocation.onToggleTeamRename}
          />
        ) : null}
      </div>
    </section>
  );
}

export default StaffCustomisedAllocationPanel;
