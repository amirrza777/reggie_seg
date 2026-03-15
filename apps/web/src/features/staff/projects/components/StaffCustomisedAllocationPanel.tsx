"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMyQuestionnaires,
  getPublicQuestionnairesFromOthers,
} from "@/features/questionnaires/api/client";
import type { Question, Questionnaire } from "@/features/questionnaires/types";
import "@/features/staff/projects/styles/staff-projects.css";

type CriteriaStrategy = "diversify" | "group" | "ignore";
type NonRespondentStrategy = "distribute_randomly" | "exclude";

type CriteriaConfig = {
  strategy: CriteriaStrategy;
  weight: number;
};

type StaffCustomisedAllocationPanelProps = {
  projectId: number;
  initialTeamCount: number;
};

const SUPPORTED_CRITERIA_TYPES = new Set(["multiple-choice", "rating", "slider"]);
const WEIGHT_OPTIONS = [1, 2, 3, 4, 5] as const;

function isSupportedCriteriaQuestion(question: Question) {
  return SUPPORTED_CRITERIA_TYPES.has(question.type);
}

function sortByTemplateName(templates: Questionnaire[]) {
  return [...templates].sort((left, right) => left.templateName.localeCompare(right.templateName));
}

function countEligibleQuestions(template: Questionnaire) {
  return template.questions.filter(isSupportedCriteriaQuestion).length;
}

export function StaffCustomisedAllocationPanel({
  projectId,
  initialTeamCount,
}: StaffCustomisedAllocationPanelProps) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
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

    Promise.all([getMyQuestionnaires(), getPublicQuestionnairesFromOthers()])
      .then(([myTemplates, publicTemplates]) => {
        if (!isMounted) {
          return;
        }

        const byId = new Map<number, Questionnaire>();
        for (const template of [...myTemplates, ...publicTemplates]) {
          byId.set(template.id, template);
        }
        setQuestionnaires(sortByTemplateName(Array.from(byId.values())));
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
  }, []);

  const eligibleQuestionnaires = useMemo(
    () => questionnaires.filter((template) => countEligibleQuestions(template) > 0),
    [questionnaires],
  );

  const selectedQuestionnaire = useMemo(() => {
    const parsedTemplateId = Number(selectedTemplateId);
    if (!Number.isInteger(parsedTemplateId)) {
      return null;
    }

    return (
      eligibleQuestionnaires.find((template) => template.id === parsedTemplateId) ?? null
    );
  }, [eligibleQuestionnaires, selectedTemplateId]);

  const criteriaQuestions = useMemo(() => {
    if (!selectedQuestionnaire) {
      return [];
    }
    return selectedQuestionnaire.questions.filter(isSupportedCriteriaQuestion);
  }, [selectedQuestionnaire]);

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
              {selectedQuestionnaire.questions.length} total question
              {selectedQuestionnaire.questions.length === 1 ? "" : "s"}
            </span>
            <span className="staff-projects__badge">
              {criteriaQuestions.length} eligible criteria
            </span>
            <span className="staff-projects__badge">
              {activeCriteriaCount} active criteria
            </span>
          </div>
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