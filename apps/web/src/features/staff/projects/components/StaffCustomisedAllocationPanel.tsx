"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  type CustomAllocationCoverage,
  type CustomAllocationCriteriaStrategy,
  type CustomAllocationNonRespondentStrategy,
  type CustomAllocationQuestionnaireListing,
} from "@/features/projects/api/teamAllocation";
import "@/features/staff/projects/styles/staff-projects.css";

type CriteriaStrategy = CustomAllocationCriteriaStrategy;
type NonRespondentStrategy = CustomAllocationNonRespondentStrategy;

type CriteriaConfig = {
  strategy: CriteriaStrategy;
  weight: number;
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

export function StaffCustomisedAllocationPanel({
  projectId,
  initialTeamCount,
}: StaffCustomisedAllocationPanelProps) {
  const [questionnaires, setQuestionnaires] = useState<CustomAllocationQuestionnaire[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(true);
  const [loadError, setLoadError] = useState("");
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
  const [seedInput, setSeedInput] = useState("");

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

  const criteriaQuestions = useMemo(() => {
    if (!selectedQuestionnaire) {
      return [];
    }
    return selectedQuestionnaire.eligibleQuestions.filter(isSupportedCriteriaQuestion);
  }, [selectedQuestionnaire]);

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

  const activeCriteriaCount = useMemo(
    () =>
      criteriaQuestions.filter((question) => {
        const current = criteriaConfigByQuestionId[question.id];
        return (current?.strategy ?? "diversify") !== "ignore";
      }).length,
    [criteriaConfigByQuestionId, criteriaQuestions],
  );

  const isTeamCountValid = Number.isInteger(Number(teamCountInput)) && Number(teamCountInput) > 0;
  const canPreparePreview = Boolean(selectedQuestionnaire) && isTeamCountValid;
  const hasLowCoverage =
    coverage !== null &&
    coverage.totalAvailableStudents > 0 &&
    coverage.responseRate < coverage.responseThreshold;

  function updateStrategy(questionId: number, strategy: CriteriaStrategy) {
    setCriteriaConfigByQuestionId((current) => ({
      ...current,
      [questionId]: {
        strategy,
        weight: current[questionId]?.weight ?? 1,
      },
    }));
  }

  function updateWeight(questionId: number, weight: number) {
    setCriteriaConfigByQuestionId((current) => ({
      ...current,
      [questionId]: {
        strategy: current[questionId]?.strategy ?? "diversify",
        weight,
      },
    }));
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
        <label className="staff-projects__allocation-field">
          Select questionnaire
          <select
            className="staff-projects__custom-select"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            disabled={isLoadingQuestionnaires || eligibleQuestionnaires.length === 0}
            aria-label="Select questionnaire"
          >
            <option value="">Select questionnaire</option>
            {eligibleQuestionnaires.map((template) => {
              const eligibleCount = countEligibleQuestions(template);
              return (
                <option key={template.id} value={template.id}>
                  {template.templateName} ({eligibleCount} criteria)
                </option>
              );
            })}
          </select>
        </label>
        {isLoadingQuestionnaires ? (
          <p className="staff-projects__allocation-note">Loading questionnaires...</p>
        ) : null}
        {loadError ? <p className="staff-projects__allocation-error">{loadError}</p> : null}
        {!isLoadingQuestionnaires && !loadError && eligibleQuestionnaires.length === 0 ? (
          <p className="staff-projects__allocation-warning">
            No eligible questionnaire found yet. Create or copy one with non-text questions first.
          </p>
        ) : null}
        {selectedQuestionnaire ? (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">
              {selectedQuestionnaire.eligibleQuestionCount} eligible criteria
            </span>
            <span className="staff-projects__badge">
              {activeCriteriaCount} active criteria
            </span>
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
        <fieldset className="staff-projects__custom-radio-group">
          <legend className="staff-projects__custom-radio-title">Non-respondent strategy</legend>
          <label className="staff-projects__custom-radio-option">
            <input
              type="radio"
              name="nonRespondentStrategy"
              value="distribute_randomly"
              checked={nonRespondentStrategy === "distribute_randomly"}
              onChange={() => setNonRespondentStrategy("distribute_randomly")}
            />
            Distribute randomly
          </label>
          <label className="staff-projects__custom-radio-option">
            <input
              type="radio"
              name="nonRespondentStrategy"
              value="exclude"
              checked={nonRespondentStrategy === "exclude"}
              onChange={() => setNonRespondentStrategy("exclude")}
            />
            Exclude from allocation
          </label>
        </fieldset>
      </div>

      <div className="staff-projects__custom-step">
        <h4 className="staff-projects__custom-step-title">Step 2: Criteria Configuration</h4>
        <p className="staff-projects__custom-step-sub">
          Diversify spreads responses across teams, Group clusters similar responses, Ignore skips
          the question.
        </p>
        {criteriaQuestions.length === 0 ? (
          <p className="staff-projects__allocation-note">
            Select a questionnaire to configure criteria.
          </p>
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
                        disabled={isIgnored}
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
              onChange={(event) => setTeamCountInput(event.target.value)}
              aria-label="Customised team count"
            />
          </label>
          <label className="staff-projects__allocation-field">
            Seed (optional)
            <input
              type="number"
              step={1}
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              aria-label="Customised seed"
            />
          </label>
        </div>
        <div className="staff-projects__allocation-actions">
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            disabled
            aria-disabled={!canPreparePreview}
          >
            Preview customised teams
          </button>
          <button
            type="button"
            className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
            disabled
          >
            Apply allocation
          </button>
        </div>
      </div>
    </section>
  );
}