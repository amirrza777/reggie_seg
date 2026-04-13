"use client";

import { SearchField } from "@/shared/ui/SearchField";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import type { CustomAllocationCoverage } from "@/features/projects/api/teamAllocation";
import { countEligibleQuestions } from "./customisedAllocation.utils";
import type {
  CustomAllocationQuestionnaire,
  NonRespondentStrategy,
} from "./customisedAllocation.utils";

type Props = {
  isLoadingQuestionnaires: boolean;
  loadError: string;
  eligibleQuestionnaires: CustomAllocationQuestionnaire[];
  visibleQuestionnaires: CustomAllocationQuestionnaire[];
  questionnaireSearch: string;
  onQuestionnaireSearchChange: (value: string) => void;
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  selectedQuestionnaire: CustomAllocationQuestionnaire | null;
  activeCriteriaCount: number;
  coverage: CustomAllocationCoverage | null;
  isLoadingCoverage: boolean;
  coverageError: string;
  hasLowCoverage: boolean;
  nonRespondentStrategy: NonRespondentStrategy;
  onNonRespondentStrategyChange: (strategy: NonRespondentStrategy) => void;
  confirmApply: boolean;
  isPreviewPending: boolean;
  isApplyPending: boolean;
};

export function StaffCustomisedAllocationPanelStep1({
  isLoadingQuestionnaires,
  loadError,
  eligibleQuestionnaires,
  visibleQuestionnaires,
  questionnaireSearch,
  onQuestionnaireSearchChange,
  selectedTemplateId,
  onSelectTemplate,
  selectedQuestionnaire,
  activeCriteriaCount,
  coverage,
  isLoadingCoverage,
  coverageError,
  hasLowCoverage,
  nonRespondentStrategy,
  onNonRespondentStrategyChange,
  confirmApply,
  isPreviewPending,
  isApplyPending,
}: Props) {
  return (
    <div className="staff-projects__custom-step">
      <h4 className="staff-projects__custom-step-title">Step 1: Questionnaire</h4>
      <p className="staff-projects__custom-step-sub">
        Choose a questionnaire that has at least one multiple-choice, rating, or slider question.
      </p>
      <p className="staff-projects__custom-step-sub">
        Select a public questionnaire so all staff members can access it.
      </p>
      <div className="staff-projects__custom-questionnaire-controls">
        <label className="staff-projects__allocation-field">
          Search questionnaires
          <SearchField
            className="staff-projects__custom-search-input"
            value={questionnaireSearch}
            onChange={(event) => onQuestionnaireSearchChange(event.target.value)}
            placeholder="Filter by template name"
            aria-label="Search questionnaires"
            disabled={isLoadingQuestionnaires || eligibleQuestionnaires.length === 0 || isApplyPending}
          />
        </label>
        <label className="staff-projects__allocation-field">
          Select questionnaire
          <select
            className="staff-projects__custom-select"
            value={selectedTemplateId}
            onChange={(event) => onSelectTemplate(event.target.value)}
            aria-label="Select questionnaire"
            disabled={isLoadingQuestionnaires || eligibleQuestionnaires.length === 0 || isApplyPending}
          >
            <option value="">Select questionnaire</option>
            {visibleQuestionnaires.map((template) => (
              <option key={template.id} value={template.id}>
                {template.templateName} ({countEligibleQuestions(template)} criteria)
              </option>
            ))}
          </select>
        </label>
      </div>
      {isLoadingQuestionnaires ? (
        <div role="status" aria-live="polite">
          <SkeletonText lines={1} widths={["38%"]} />
          <span className="ui-visually-hidden">Loading questionnaires...</span>
        </div>
      ) : null}
      {loadError ? <p className="staff-projects__allocation-error">{loadError}</p> : null}
      {!isLoadingQuestionnaires && !loadError && eligibleQuestionnaires.length === 0 ? (
        <p className="staff-projects__allocation-warning">
          No eligible questionnaire found yet. Create or copy one with non-text questions first.
        </p>
      ) : null}
      {!isLoadingQuestionnaires && !loadError && eligibleQuestionnaires.length > 0 && visibleQuestionnaires.length === 0 ? (
        <p className="staff-projects__allocation-note">
          No questionnaire matches your search. Try a different keyword.
        </p>
      ) : null}
      {selectedQuestionnaire ? (
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">
            {selectedQuestionnaire.eligibleQuestionCount} eligible criteria
          </span>
          <span className="staff-projects__badge">{activeCriteriaCount} active criteria</span>
          <span className="staff-projects__badge">
            {selectedQuestionnaire.isPublic ? "Public template" : "Owned template"}
          </span>
        </div>
      ) : null}
      {isLoadingCoverage ? (
        <p className="staff-projects__allocation-note">Loading response coverage...</p>
      ) : null}
      {coverageError ? <p className="staff-projects__allocation-error">{coverageError}</p> : null}
      {coverage ? (
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">
            {coverage.totalAvailableStudents} available student
            {coverage.totalAvailableStudents === 1 ? "" : "s"}
          </span>
          <span className="staff-projects__badge">{coverage.respondingStudents} responded</span>
          <span className="staff-projects__badge">{coverage.nonRespondingStudents} no response</span>
          <span className="staff-projects__badge">{coverage.responseRate}% coverage</span>
        </div>
      ) : null}
      {hasLowCoverage && coverage ? (
        <p className="staff-projects__allocation-warning">
          Coverage is below {coverage.responseThreshold}% ({coverage.responseRate}%). You can still proceed.
        </p>
      ) : null}
      {coverage && coverage.totalAvailableStudents === 0 ? (
        <p className="staff-projects__allocation-warning">
          No vacant students are currently available in this project for customised allocation.
        </p>
      ) : null}
      {coverage && coverage.totalAvailableStudents > 0 && coverage.respondingStudents === 0 ? (
        <p className="staff-projects__allocation-warning">
          No available students have completed this questionnaire yet. Share it first, then retry.
        </p>
      ) : null}
      <div
        className="staff-projects__custom-radio-group"
        role="radiogroup"
        aria-label="Non-respondent strategy"
      >
        <p className="staff-projects__custom-radio-title">Non-respondent strategy</p>
        <label className="staff-projects__custom-radio-option">
          <input
            type="radio"
            name="nonRespondentStrategy"
            value="distribute_randomly"
            checked={nonRespondentStrategy === "distribute_randomly"}
            onChange={() => onNonRespondentStrategyChange("distribute_randomly")}
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
          <span className="staff-projects__custom-radio-option-label">Distribute randomly</span>
        </label>
        <label className="staff-projects__custom-radio-option">
          <input
            type="radio"
            name="nonRespondentStrategy"
            value="exclude"
            checked={nonRespondentStrategy === "exclude"}
            onChange={() => onNonRespondentStrategyChange("exclude")}
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
          <span className="staff-projects__custom-radio-option-label">Exclude from allocation</span>
        </label>
      </div>
    </div>
  );
}