/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCustomisedAllocation } from "./useCustomisedAllocation";
import { StaffCustomisedAllocationPanelStep1 } from "./StaffCustomisedAllocationPanel.step1";
import { StaffCustomisedAllocationPanelStep2 } from "./StaffCustomisedAllocationPanel.step2";
import { StaffCustomisedAllocationPanelStep3 } from "./StaffCustomisedAllocationPanel.step3";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffCustomisedAllocationPanelProps = {
  projectId: number;
  initialTeamCount: number;
};

export function StaffCustomisedAllocationPanel({
  projectId,
  initialTeamCount,
}: StaffCustomisedAllocationPanelProps) {
  const {
    isLoadingQuestionnaires, loadError, questionnaireSearch, setQuestionnaireSearch,
    selectedTemplateId, onSelectTemplate,
    coverage, isLoadingCoverage, coverageError,
    nonRespondentStrategy, onNonRespondentStrategyChange,
    criteriaConfigByQuestionId,
    teamCountInput, onTeamCountInputChange,
    minTeamSizeInput, onMinTeamSizeInputChange,
    maxTeamSizeInput, onMaxTeamSizeInputChange,
    preview, teamNames, renamingTeams, confirmApply,
    errorMessage, successMessage, isPreviewPending, isApplyPending,
    eligibleQuestionnaires, selectedQuestionnaire, visibleQuestionnaires, criteriaQuestions, questionLabelById,
    activeCriteriaCount, canPreparePreview, hasLowCoverage, isPreviewCurrent, unassignedStudents,
    getTeamName, updateStrategy, updateWeight, toggleConfirmAllocation,
    runPreview, runApplyAllocation, onTeamNameChange, onToggleTeamRename,
  } = useCustomisedAllocation({ projectId, initialTeamCount });

  return (
    <section
      className="staff-projects__custom-panel"
      aria-label={`Customised allocation panel for project ${projectId}`}
    >
      <StaffCustomisedAllocationPanelStep1
        isLoadingQuestionnaires={isLoadingQuestionnaires}
        loadError={loadError}
        eligibleQuestionnaires={eligibleQuestionnaires}
        visibleQuestionnaires={visibleQuestionnaires}
        questionnaireSearch={questionnaireSearch}
        onQuestionnaireSearchChange={setQuestionnaireSearch}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={onSelectTemplate}
        selectedQuestionnaire={selectedQuestionnaire}
        activeCriteriaCount={activeCriteriaCount}
        coverage={coverage}
        isLoadingCoverage={isLoadingCoverage}
        coverageError={coverageError}
        hasLowCoverage={hasLowCoverage}
        nonRespondentStrategy={nonRespondentStrategy}
        onNonRespondentStrategyChange={onNonRespondentStrategyChange}
        confirmApply={confirmApply}
        isPreviewPending={isPreviewPending}
        isApplyPending={isApplyPending}
      />
      <StaffCustomisedAllocationPanelStep2
        criteriaQuestions={criteriaQuestions}
        criteriaConfigByQuestionId={criteriaConfigByQuestionId}
        updateStrategy={updateStrategy}
        updateWeight={updateWeight}
        confirmApply={confirmApply}
        isPreviewPending={isPreviewPending}
        isApplyPending={isApplyPending}
      />
      <StaffCustomisedAllocationPanelStep3
        teamCountInput={teamCountInput}
        onTeamCountInputChange={onTeamCountInputChange}
        minTeamSizeInput={minTeamSizeInput}
        onMinTeamSizeInputChange={onMinTeamSizeInputChange}
        maxTeamSizeInput={maxTeamSizeInput}
        onMaxTeamSizeInputChange={onMaxTeamSizeInputChange}
        canPreparePreview={canPreparePreview}
        isLoadingCoverage={isLoadingCoverage}
        runPreview={runPreview}
        runApplyAllocation={runApplyAllocation}
        isPreviewCurrent={isPreviewCurrent}
        confirmApply={confirmApply}
        isPreviewPending={isPreviewPending}
        isApplyPending={isApplyPending}
        errorMessage={errorMessage}
        successMessage={successMessage}
        preview={preview}
        unassignedStudents={unassignedStudents}
        teamNames={teamNames}
        renamingTeams={renamingTeams}
        questionLabelById={questionLabelById}
        getTeamName={getTeamName}
        toggleConfirmAllocation={toggleConfirmAllocation}
        onTeamNameChange={onTeamNameChange}
        onToggleTeamRename={onToggleTeamRename}
      />
    </section>
  );
}