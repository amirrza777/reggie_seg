"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyCustomAllocation,
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  previewCustomAllocation,
  type CustomAllocationCoverage,
  type CustomAllocationCriteriaStrategy,
  type CustomAllocationNonRespondentStrategy,
  type CustomAllocationPreview,
  type CustomAllocationQuestionnaireListing,
} from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";
import "@/features/staff/projects/styles/staff-projects.css";

type CriteriaStrategy = CustomAllocationCriteriaStrategy;
type NonRespondentStrategy = CustomAllocationNonRespondentStrategy;

type CriteriaConfig = {
  strategy: CriteriaStrategy;
  weight: number;
};

type CustomAllocationCriteriaInput = {
  questionId: number;
  strategy: CriteriaStrategy;
  weight: number;
};

type CustomisedPreviewInputSnapshot = {
  questionnaireTemplateId: number;
  teamCount: number;
  nonRespondentStrategy: NonRespondentStrategy;
  criteria: CustomAllocationCriteriaInput[];
};

type StaffCustomisedAllocationPanelProps = {
  projectId: number;
  initialTeamCount: number;
};

type CustomAllocationQuestionnaire = CustomAllocationQuestionnaireListing["questionnaires"][number];
type CustomAllocationQuestion = CustomAllocationQuestionnaire["eligibleQuestions"][number];

const SUPPORTED_CRITERIA_TYPES = new Set(["multiple-choice", "rating", "slider"]);
const WEIGHT_OPTIONS = [1, 2, 3, 4, 5] as const;

function isSupportedCriteriaQuestion(question: CustomAllocationQuestion) {
  return SUPPORTED_CRITERIA_TYPES.has(question.type);
}

function sortByTemplateName(templates: CustomAllocationQuestionnaire[]) {
  return [...templates].sort((left, right) => left.templateName.localeCompare(right.templateName));
}

function countEligibleQuestions(template: CustomAllocationQuestionnaire) {
  return template.eligibleQuestions.filter(isSupportedCriteriaQuestion).length;
}

function toFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

function getQualityLabel(score: number): "Good" | "Fair" | "Poor" {
  if (score >= 0.75) {
    return "Good";
  }
  if (score >= 0.5) {
    return "Fair";
  }
  return "Poor";
}

function toPreviewInputKey(input: CustomisedPreviewInputSnapshot) {
  return JSON.stringify({
    questionnaireTemplateId: input.questionnaireTemplateId,
    teamCount: input.teamCount,
    nonRespondentStrategy: input.nonRespondentStrategy,
    criteria: input.criteria.map((criterion) => ({
      questionId: criterion.questionId,
      strategy: criterion.strategy,
      weight: criterion.weight,
    })),
  });
}

function formatTeamCriterionSummary(
  criterion: CustomAllocationPreview["teamCriteriaSummary"][number]["criteria"][number],
) {
  if (criterion.summary.kind === "none") {
    return `No responses (${criterion.responseCount})`;
  }

  if (criterion.summary.kind === "numeric") {
    return `avg ${criterion.summary.average} (min ${criterion.summary.min}, max ${criterion.summary.max})`;
  }

  return criterion.summary.categories.map((category) => `${category.value}: ${category.count}`).join(", ");
}

export function StaffCustomisedAllocationPanel({
  projectId,
  initialTeamCount,
}: StaffCustomisedAllocationPanelProps) {
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<CustomAllocationQuestionnaire[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [questionnaireSearch, setQuestionnaireSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [coverage, setCoverage] = useState<CustomAllocationCoverage | null>(null);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(false);
  const [coverageError, setCoverageError] = useState("");
  const [nonRespondentStrategy, setNonRespondentStrategy] =
    useState<NonRespondentStrategy>("distribute_randomly");
  const [criteriaConfigByQuestionId, setCriteriaConfigByQuestionId] = useState<
    Record<number, CriteriaConfig>
  >({});
  const [teamCountInput, setTeamCountInput] = useState(String(Math.max(1, initialTeamCount || 2)));
  const [preview, setPreview] = useState<CustomAllocationPreview | null>(null);
  const [previewInputKey, setPreviewInputKey] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [renamingTeams, setRenamingTeams] = useState<Record<number, boolean>>({});
  const [confirmApply, setConfirmApply] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isApplyPending, startApplyTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    setIsLoadingQuestionnaires(true);
    setLoadError("");

    getCustomAllocationQuestionnaires(projectId)
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setQuestionnaires(sortByTemplateName(result.questionnaires));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Failed to load questionnaires.");
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setIsLoadingQuestionnaires(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const eligibleQuestionnaires = useMemo(
    () => questionnaires.filter((template) => countEligibleQuestions(template) > 0),
    [questionnaires],
  );

  const selectedQuestionnaire = useMemo(() => {
    const parsedTemplateId = Number(selectedTemplateId);
    if (!Number.isInteger(parsedTemplateId)) {
      return null;
    }
    return eligibleQuestionnaires.find((template) => template.id === parsedTemplateId) ?? null;
  }, [eligibleQuestionnaires, selectedTemplateId]);

  const visibleQuestionnaires = useMemo(() => {
    const normalizedQuery = questionnaireSearch.trim().toLowerCase();
    const filteredTemplates =
      normalizedQuery.length === 0
        ? eligibleQuestionnaires
        : eligibleQuestionnaires.filter((template) =>
            template.templateName.toLowerCase().includes(normalizedQuery),
          );

    if (!selectedQuestionnaire) {
      return filteredTemplates;
    }

    if (filteredTemplates.some((template) => template.id === selectedQuestionnaire.id)) {
      return filteredTemplates;
    }

    return [selectedQuestionnaire, ...filteredTemplates];
  }, [eligibleQuestionnaires, questionnaireSearch, selectedQuestionnaire]);

  const criteriaQuestions = useMemo(() => {
    if (!selectedQuestionnaire) {
      return [];
    }
    return selectedQuestionnaire.eligibleQuestions.filter(isSupportedCriteriaQuestion);
  }, [selectedQuestionnaire]);

  const questionLabelById = useMemo(
    () => new Map(criteriaQuestions.map((question) => [question.id, question.label] as const)),
    [criteriaQuestions],
  );

  useEffect(() => {
    let isMounted = true;

    if (!selectedQuestionnaire) {
      setCoverage(null);
      setCoverageError("");
      setIsLoadingCoverage(false);
      return;
    }

    setCoverage(null);
    setCoverageError("");
    setIsLoadingCoverage(true);
    getCustomAllocationCoverage(projectId, selectedQuestionnaire.id)
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setCoverage(result);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setCoverageError(error instanceof Error ? error.message : "Failed to load response coverage.");
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }
        setIsLoadingCoverage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, selectedQuestionnaire]);

  useEffect(() => {
    if (!selectedQuestionnaire) {
      setCriteriaConfigByQuestionId({});
      return;
    }

    setCriteriaConfigByQuestionId((current) => {
      const next: Record<number, CriteriaConfig> = {};
      for (const question of criteriaQuestions) {
        next[question.id] = current[question.id] ?? { strategy: "diversify", weight: 1 };
      }
      return next;
    });
  }, [criteriaQuestions, selectedQuestionnaire]);

  const criteriaPayload = useMemo(
    () =>
      criteriaQuestions.map((question) => {
        const current = criteriaConfigByQuestionId[question.id] ?? { strategy: "diversify", weight: 1 };
        return {
          questionId: question.id,
          strategy: current.strategy,
          weight: current.weight,
        };
      }),
    [criteriaConfigByQuestionId, criteriaQuestions],
  );

  const activeCriteriaCount = useMemo(
    () => criteriaPayload.filter((criterion) => criterion.strategy !== "ignore").length,
    [criteriaPayload],
  );

  const isTeamCountValid = Number.isInteger(Number(teamCountInput)) && Number(teamCountInput) > 0;
  const canPreparePreview = Boolean(selectedQuestionnaire) && isTeamCountValid;
  const hasLowCoverage =
    coverage !== null &&
    coverage.totalAvailableStudents > 0 &&
    coverage.responseRate < coverage.responseThreshold;

  function getInputValidationError() {
    if (!selectedQuestionnaire) {
      return "Select a questionnaire first.";
    }

    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
      return "Team count must be a positive integer.";
    }

    return null;
  }

  function getCurrentPreviewInputSnapshot(): CustomisedPreviewInputSnapshot | null {
    if (!selectedQuestionnaire) {
      return null;
    }

    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
      return null;
    }

    return {
      questionnaireTemplateId: selectedQuestionnaire.id,
      teamCount: parsedTeamCount,
      nonRespondentStrategy,
      criteria: criteriaPayload,
    };
  }

  function isCurrentInputMatchingPreview() {
    if (!preview || !previewInputKey) {
      return false;
    }
    const currentSnapshot = getCurrentPreviewInputSnapshot();
    if (!currentSnapshot) {
      return false;
    }
    return toPreviewInputKey(currentSnapshot) === previewInputKey;
  }

  const isPreviewCurrent = isCurrentInputMatchingPreview();

  function toDefaultTeamNameMap(nextPreview: CustomAllocationPreview) {
    return nextPreview.previewTeams.reduce<Record<number, string>>((names, team) => {
      names[team.index] = team.suggestedName;
      return names;
    }, {});
  }

  function getTeamName(index: number, fallbackName: string) {
    return teamNames[index] ?? fallbackName;
  }

  function getTeamNameValidationError() {
    if (!preview) {
      return "Generate a preview before confirming.";
    }

    const normalizedNames = preview.previewTeams.map((team) =>
      getTeamName(team.index, team.suggestedName).trim(),
    );
    if (normalizedNames.some((name) => name.length === 0)) {
      return "Team names cannot be empty.";
    }

    const uniqueNames = new Set(normalizedNames.map((name) => name.toLowerCase()));
    if (uniqueNames.size !== normalizedNames.length) {
      return "Team names must be unique.";
    }

    return null;
  }

  function getTeamNamesForApply() {
    if (!preview) {
      return [];
    }
    return preview.previewTeams.map((team) => getTeamName(team.index, team.suggestedName).trim());
  }

  function updateStrategy(questionId: number, strategy: CriteriaStrategy) {
    setCriteriaConfigByQuestionId((current) => ({
      ...current,
      [questionId]: {
        strategy,
        weight: current[questionId]?.weight ?? 1,
      },
    }));
    setSuccessMessage("");
  }

  function updateWeight(questionId: number, weight: number) {
    setCriteriaConfigByQuestionId((current) => ({
      ...current,
      [questionId]: {
        strategy: current[questionId]?.strategy ?? "diversify",
        weight,
      },
    }));
    setSuccessMessage("");
  }

  function toggleConfirmAllocation() {
    if (confirmApply) {
      setConfirmApply(false);
      return;
    }

    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    setErrorMessage("");
    setConfirmApply(true);
  }

  function runPreview() {
    const inputError = getInputValidationError();
    if (inputError) {
      setErrorMessage(inputError);
      return;
    }

    const payload = getCurrentPreviewInputSnapshot();
    if (!payload) {
      setErrorMessage("Invalid input values.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    startPreviewTransition(async () => {
      try {
        const result = await previewCustomAllocation(projectId, payload);
        setPreview(result);
        setPreviewInputKey(toPreviewInputKey(payload));
        setTeamNames(toDefaultTeamNameMap(result));
        setRenamingTeams({});
        setConfirmApply(false);
      } catch (error) {
        setPreview(null);
        setPreviewInputKey(null);
        setTeamNames({});
        setRenamingTeams({});
        setConfirmApply(false);
        setErrorMessage(error instanceof Error ? error.message : "Failed to preview customised allocation.");
      }
    });
  }

  function runApplyAllocation() {
    if (!preview) {
      setErrorMessage("Generate a preview before applying.");
      return;
    }

    if (!isPreviewCurrent) {
      setErrorMessage("Preview is out of date. Generate a fresh preview before applying.");
      return;
    }

    if (!confirmApply) {
      setErrorMessage("Please confirm that this allocation should proceed.");
      return;
    }

    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    const teamNamesForApply = getTeamNamesForApply();
    setErrorMessage("");
    setSuccessMessage("");
    startApplyTransition(async () => {
      try {
        const result = await applyCustomAllocation(projectId, {
          previewId: preview.previewId,
          teamNames: teamNamesForApply,
        });
        setSuccessMessage(
          `Saved customised allocation as draft across ${result.appliedTeams.length} team${result.appliedTeams.length === 1 ? "" : "s"}.`,
        );
        setConfirmApply(false);
        setPreview(null);
        setPreviewInputKey(null);
        setTeamNames({});
        setRenamingTeams({});
        emitStaffAllocationDraftsRefresh();
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to apply customised allocation.";
        if (message.includes("Preview no longer exists") || message.includes("no longer vacant")) {
          setConfirmApply(false);
          setPreview(null);
          setPreviewInputKey(null);
          setTeamNames({});
          setRenamingTeams({});
        }
        setErrorMessage(message);
      }
    });
  }

  return (
    <section
      className="staff-projects__custom-panel"
      aria-label={`Customised allocation panel for project ${projectId}`}
    >
      <div className="staff-projects__custom-step">
        <h4 className="staff-projects__custom-step-title">Step 1: Questionnaire</h4>
        <p className="staff-projects__custom-step-sub">
          Choose a questionnaire that has at least one multiple-choice, rating, or slider question.
        </p>
        <div className="staff-projects__custom-questionnaire-controls">
          <label className="staff-projects__allocation-field">
            Search questionnaires
            <input
              className="staff-projects__custom-search-input"
              type="search"
              value={questionnaireSearch}
              onChange={(event) => setQuestionnaireSearch(event.target.value)}
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
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
                setSuccessMessage("");
              }}
              disabled={isLoadingQuestionnaires || eligibleQuestionnaires.length === 0 || isApplyPending}
              aria-label="Select questionnaire"
            >
              <option value="">Select questionnaire</option>
              {visibleQuestionnaires.map((template) => {
                const eligibleCount = countEligibleQuestions(template);
                return (
                  <option key={template.id} value={template.id}>
                    {template.templateName} ({eligibleCount} criteria)
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        {isLoadingQuestionnaires ? (
          <p className="staff-projects__allocation-note">Loading questionnaires...</p>
        ) : null}
        {loadError ? <p className="staff-projects__allocation-error">{loadError}</p> : null}
        {!isLoadingQuestionnaires && !loadError && eligibleQuestionnaires.length === 0 ? (
          <p className="staff-projects__allocation-warning">
            No eligible questionnaire found yet. Create or copy one with non-text questions first.
          </p>
        ) : null}
        {!isLoadingQuestionnaires &&
        !loadError &&
        eligibleQuestionnaires.length > 0 &&
        visibleQuestionnaires.length === 0 ? (
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
        {hasLowCoverage ? (
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
              onChange={() => {
                setNonRespondentStrategy("distribute_randomly");
                setSuccessMessage("");
              }}
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
              onChange={() => {
                setNonRespondentStrategy("exclude");
                setSuccessMessage("");
              }}
              disabled={confirmApply || isPreviewPending || isApplyPending}
            />
            <span className="staff-projects__custom-radio-option-label">Exclude from allocation</span>
          </label>
        </div>
      </div>

      <div className="staff-projects__custom-step">
        <h4 className="staff-projects__custom-step-title">Step 2: Criteria Configuration</h4>
        <p className="staff-projects__custom-step-sub">
          Diversify spreads responses across teams, Group clusters similar responses, Ignore skips
          the question.
        </p>
        {criteriaQuestions.length === 0 ? (
          <p className="staff-projects__allocation-note">Select a questionnaire to configure criteria.</p>
        ) : (
          <div className="staff-projects__custom-criteria-list">
            {criteriaQuestions.map((question) => {
              const config = criteriaConfigByQuestionId[question.id] ?? {
                strategy: "diversify",
                weight: 1,
              };
              const isIgnored = config.strategy === "ignore";

              return (
                <article
                  key={question.id}
                  className={`staff-projects__custom-criteria-row${
                    isIgnored ? " staff-projects__custom-criteria-row--ignored" : ""
                  }`}
                >
                  <div className="staff-projects__custom-criteria-main">
                    <p className="staff-projects__custom-criteria-label">{question.label}</p>
                    <span className="staff-projects__badge">{question.type}</span>
                  </div>
                  <div className="staff-projects__custom-criteria-controls">
                    <label className="staff-projects__allocation-field">
                      Strategy
                      <select
                        className="staff-projects__custom-select"
                        value={config.strategy}
                        onChange={(event) =>
                          updateStrategy(question.id, event.target.value as CriteriaStrategy)
                        }
                        aria-label={`Strategy for ${question.label}`}
                        disabled={confirmApply || isPreviewPending || isApplyPending}
                      >
                        <option value="diversify">Diversify</option>
                        <option value="group">Group</option>
                        <option value="ignore">Ignore</option>
                      </select>
                    </label>
                    <label className="staff-projects__allocation-field">
                      Weight
                      <select
                        className="staff-projects__custom-select"
                        value={String(config.weight)}
                        onChange={(event) => updateWeight(question.id, Number(event.target.value))}
                        disabled={isIgnored || confirmApply || isPreviewPending || isApplyPending}
                        aria-label={`Weight for ${question.label}`}
                      >
                        {WEIGHT_OPTIONS.map((weight) => (
                          <option key={weight} value={weight}>
                            {weight}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="staff-projects__custom-step">
        <h4 className="staff-projects__custom-step-title">Step 3: Generate Preview</h4>
        <div className="staff-projects__allocation-form">
          <label className="staff-projects__allocation-field">
            Team count
            <input
              type="number"
              min={1}
              step={1}
              value={teamCountInput}
              onChange={(event) => {
                setTeamCountInput(event.target.value);
                setSuccessMessage("");
              }}
              aria-label="Customised team count"
              disabled={confirmApply || isPreviewPending || isApplyPending}
            />
          </label>
        </div>
        <div className="staff-projects__allocation-actions">
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            onClick={runPreview}
            disabled={
              !canPreparePreview || isLoadingCoverage || confirmApply || isPreviewPending || isApplyPending
            }
            aria-disabled={!canPreparePreview}
          >
            {isPreviewPending ? "Generating preview..." : "Preview customised teams"}
          </button>
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            onClick={runApplyAllocation}
            disabled={!isPreviewCurrent || !confirmApply || isPreviewPending || isApplyPending}
          >
            {isApplyPending ? "Saving draft..." : "Save draft allocation"}
          </button>
        </div>
        {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}
        {successMessage ? <p className="staff-projects__allocation-success">{successMessage}</p> : null}
        {preview && !isPreviewCurrent ? (
          <p className="staff-projects__allocation-warning">
            Inputs changed since last preview. Generate a new preview before applying.
          </p>
        ) : null}

        {preview ? (
          <div className="staff-projects__allocation-results">
            <div className="staff-projects__allocation-confirm">
              <button
                type="button"
                className={`staff-projects__allocation-confirm-btn${
                  confirmApply ? " staff-projects__allocation-confirm-btn--active" : ""
                }`}
                onClick={toggleConfirmAllocation}
                aria-pressed={confirmApply}
                disabled={!isPreviewCurrent || isPreviewPending || isApplyPending}
              >
                {confirmApply ? "Confirmed (click to unlock)" : "Confirm allocation"}
              </button>
              <p className="staff-projects__allocation-confirm-text">
                This saves the exact generated preview as draft teams (including any non-respondent placement strategy).
                {confirmApply ? " Team names and inputs are locked until you unlock confirmation." : ""}
              </p>
            </div>

            <div className="staff-projects__meta">
              <span className="staff-projects__badge">
                {preview.respondentCount} respondent{preview.respondentCount === 1 ? "" : "s"}
              </span>
              <span className="staff-projects__badge">
                {preview.nonRespondentCount} non-respondent{preview.nonRespondentCount === 1 ? "" : "s"}
              </span>
              <span className="staff-projects__badge">{preview.teamCount} planned teams</span>
              <span className="staff-projects__badge">
                Quality: {getQualityLabel(preview.overallScore)} ({Math.round(preview.overallScore * 100)}%)
              </span>
            </div>

            {preview.criteriaSummary.length > 0 ? (
              <div className="staff-projects__custom-summary-list">
                {preview.criteriaSummary.map((criterion) => (
                  <div key={criterion.questionId} className="staff-projects__custom-summary-item">
                    <span className="staff-projects__custom-summary-label">
                      {questionLabelById.get(criterion.questionId) ?? `Question ${criterion.questionId}`}
                    </span>
                    <span className="staff-projects__custom-summary-value">
                      {criterion.strategy} • weight {criterion.weight} •{" "}
                      {Math.round(criterion.satisfactionScore * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <section className="staff-projects__team-list" aria-label="Customised team preview list">
              {preview.previewTeams.map((team, index) => {
                const teamName = getTeamName(team.index, team.suggestedName);
                const isRenaming = renamingTeams[team.index] === true;
                const teamNumber = index + 1;
                const teamCriteriaSummary =
                  (preview.teamCriteriaSummary ?? []).find((item) => item.teamIndex === team.index)
                    ?.criteria ?? [];

                return (
                  <article key={team.index} className="staff-projects__team-card">
                    <div className="staff-projects__team-top">
                      <div className="staff-projects__allocation-team-head">
                        {isRenaming ? (
                          <input
                            type="text"
                            className="staff-projects__allocation-team-name-input"
                            value={teamName}
                            onChange={(event) => {
                              setTeamNames((currentNames) => ({
                                ...currentNames,
                                [team.index]: event.target.value,
                              }));
                              setErrorMessage("");
                              setSuccessMessage("");
                            }}
                            aria-label={`Custom team ${teamNumber} name`}
                            disabled={confirmApply || isPreviewPending || isApplyPending}
                          />
                        ) : (
                          <h3 className="staff-projects__team-title">{teamName}</h3>
                        )}
                        <button
                          type="button"
                          className="staff-projects__allocation-rename-btn"
                          onClick={() => {
                            if (isRenaming) {
                              setTeamNames((currentNames) => ({
                                ...currentNames,
                                [team.index]: (currentNames[team.index] ?? team.suggestedName).trim(),
                              }));
                            }
                            setRenamingTeams((currentTeams) => ({
                              ...currentTeams,
                              [team.index]: !isRenaming,
                            }));
                          }}
                          disabled={confirmApply || !isPreviewCurrent || isPreviewPending || isApplyPending}
                        >
                          {isRenaming ? "Save" : "Rename"}
                        </button>
                      </div>
                      <span className="staff-projects__badge">
                        {team.members.length} member{team.members.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="staff-projects__allocation-members">
                      {team.members.map((member) => (
                        <li key={member.id} className="staff-projects__custom-member-row">
                          <span>{toFullName(member)}</span>
                          {member.responseStatus === "NO_RESPONSE" ? (
                            <span className="staff-projects__custom-response-badge">
                              No questionnaire response
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {teamCriteriaSummary.length > 0 ? (
                      <div className="staff-projects__custom-team-breakdown">
                        <p className="staff-projects__custom-team-breakdown-title">Criteria breakdown</p>
                        <ul className="staff-projects__custom-team-breakdown-list">
                          {teamCriteriaSummary.map((criterion) => (
                            <li
                              key={`${team.index}-${criterion.questionId}`}
                              className="staff-projects__custom-team-breakdown-item"
                            >
                              <span className="staff-projects__custom-team-breakdown-label">
                                {questionLabelById.get(criterion.questionId) ??
                                  `Question ${criterion.questionId}`}
                              </span>
                              <span className="staff-projects__custom-team-breakdown-value">
                                {criterion.strategy} • {criterion.weight}w •{" "}
                                {formatTeamCriterionSummary(criterion)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}