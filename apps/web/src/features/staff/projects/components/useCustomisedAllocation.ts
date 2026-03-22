import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyCustomAllocation,
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  previewCustomAllocation,
  type CustomAllocationCoverage,
  type CustomAllocationPreview,
} from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";
import {
  countEligibleQuestions,
  getCurrentPreviewInputSnapshot,
  getInputValidationError,
  getTeamName,
  getTeamNameValidationError,
  getTeamNamesForApply,
  isSupportedCriteriaQuestion,
  isCurrentInputMatchingPreview,
  sortByTemplateName,
  toDefaultTeamNameMap,
  toPreviewInputKey,
  type CriteriaConfig,
  type CriteriaStrategy,
  type CustomAllocationQuestionnaire,
  type NonRespondentStrategy,
} from "./customisedAllocation.utils";

type UseCustomisedAllocationArgs = {
  projectId: number;
  initialTeamCount: number;
};

export function useCustomisedAllocation({
  projectId,
  initialTeamCount,
}: UseCustomisedAllocationArgs) {
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
  const [minTeamSizeInput, setMinTeamSizeInput] = useState("");
  const [maxTeamSizeInput, setMaxTeamSizeInput] = useState("");
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

  const currentPreviewInputSnapshot = getCurrentPreviewInputSnapshot({
    selectedQuestionnaire,
    teamCountInput,
    minTeamSizeInput,
    maxTeamSizeInput,
    nonRespondentStrategy,
    criteriaPayload,
  });

  const canPreparePreview =
    getInputValidationError({
      selectedQuestionnaire,
      teamCountInput,
      minTeamSizeInput,
      maxTeamSizeInput,
    }) === null;
  const hasLowCoverage =
    coverage !== null &&
    coverage.totalAvailableStudents > 0 &&
    coverage.responseRate < coverage.responseThreshold;

  const isPreviewCurrent = isCurrentInputMatchingPreview({
    preview,
    previewInputKey,
    currentSnapshot: currentPreviewInputSnapshot,
  });
  const unassignedStudents = preview?.unassignedStudents ?? [];

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

    const teamNameValidationError = getTeamNameValidationError(preview, teamNames);
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    setErrorMessage("");
    setConfirmApply(true);
  }

  function runPreview() {
    const inputError = getInputValidationError({
      selectedQuestionnaire,
      teamCountInput,
      minTeamSizeInput,
      maxTeamSizeInput,
    });
    if (inputError) {
      setErrorMessage(inputError);
      return;
    }

    const payload = getCurrentPreviewInputSnapshot({
      selectedQuestionnaire,
      teamCountInput,
      minTeamSizeInput,
      maxTeamSizeInput,
      nonRespondentStrategy,
      criteriaPayload,
    });
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

    const teamNameValidationError = getTeamNameValidationError(preview, teamNames);
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    const teamNamesForApply = getTeamNamesForApply(preview, teamNames);
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

  function onSelectTemplate(templateId: string) { setSelectedTemplateId(templateId); setSuccessMessage(""); }
  function onNonRespondentStrategyChange(strategy: NonRespondentStrategy) { setNonRespondentStrategy(strategy); setSuccessMessage(""); }
  function onTeamCountInputChange(value: string) { setTeamCountInput(value); setSuccessMessage(""); }
  function onMinTeamSizeInputChange(value: string) { setMinTeamSizeInput(value); setSuccessMessage(""); }
  function onMaxTeamSizeInputChange(value: string) { setMaxTeamSizeInput(value); setSuccessMessage(""); }

  function onTeamNameChange(teamIndex: number, value: string) {
    setTeamNames((currentNames) => ({
      ...currentNames,
      [teamIndex]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function onToggleTeamRename(teamIndex: number, suggestedName: string, isRenaming: boolean) {
    if (isRenaming) {
      setTeamNames((currentNames) => ({
        ...currentNames,
        [teamIndex]: (currentNames[teamIndex] ?? suggestedName).trim(),
      }));
    }
    setRenamingTeams((currentTeams) => ({
      ...currentTeams,
      [teamIndex]: !isRenaming,
    }));
  }

  return {
    isLoadingQuestionnaires, loadError, questionnaireSearch, setQuestionnaireSearch,
    selectedTemplateId, onSelectTemplate, coverage, isLoadingCoverage, coverageError,
    nonRespondentStrategy, onNonRespondentStrategyChange, criteriaConfigByQuestionId,
    teamCountInput, onTeamCountInputChange, minTeamSizeInput, onMinTeamSizeInputChange,
    maxTeamSizeInput, onMaxTeamSizeInputChange, preview, teamNames, renamingTeams, confirmApply,
    errorMessage, successMessage, isPreviewPending, isApplyPending, eligibleQuestionnaires,
    selectedQuestionnaire, visibleQuestionnaires, criteriaQuestions, questionLabelById,
    activeCriteriaCount, canPreparePreview, hasLowCoverage, isPreviewCurrent, unassignedStudents,
    getTeamName: (index: number, fallbackName: string) => getTeamName(teamNames, index, fallbackName),
    updateStrategy, updateWeight, toggleConfirmAllocation, runPreview, runApplyAllocation,
    onTeamNameChange, onToggleTeamRename,
  };
}